/**
 * 블로그 유효성 검사 스키마 (Zod)
 *
 * category는 z.string() 사용 (하드코딩된 enum 없음, 호스트에서 설정 가능)
 *
 * createBlogSchemas(config?) 팩토리로 maxAttachments, i18n 에러 메시지 등을 주입 가능
 * 정적 스키마(CreateBlogPostSchema 등)는 한국어 기본값(max 5)으로 제공
 */
import { z } from 'zod';
import type { BlogI18nStrings } from '../i18n/types';
import { resolveI18n } from '../i18n';
import { SLUG_PATTERN } from '../utils/slug';

// ── 자체 정의 스키마 ──

/**
 * URL-safe slug 스키마 (소문자 영숫자 + 하이픈)
 *
 * 정규식은 utils/slug.ts의 SLUG_PATTERN을 재사용한다(단일 진실 공급원).
 */
export const slugSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(SLUG_PATTERN, 'Slug must be URL-safe (lowercase, hyphens only)');

/** 위험한 프로토콜(file://, javascript: 등)을 차단하는 안전한 URL 스키마 */
const safeUrl = z.string().url().refine(
  (url) => {
    const lower = url.toLowerCase().replace(/[\t\n\r]/g, '');
    return !lower.startsWith('file:') && !lower.startsWith('javascript:') && !lower.startsWith('data:');
  },
  { message: 'Unsafe URL protocol (file:, javascript:, data: not allowed)' },
);

/** Optional URL 스키마 (빈 문자열 허용) */
export const optionalUrlSchema = safeUrl.optional().or(z.literal(''));

// ── 첨부파일 스키마 ──

/** 첨부파일 스키마 */
export const attachmentSchema = z.object({
  /** 원본 파일명 */
  name: z.string(),
  /** 공개 URL */
  url: z.string().url(),
  /** 스토리지 키 */
  key: z.string(),
  /** 파일 크기 (바이트) */
  size: z.number(),
  /** MIME 타입 */
  type: z.string(),
});

// ── 스키마 팩토리 ──

/** 스키마 팩토리 설정 */
export interface BlogSchemaConfig {
  /** 최대 첨부파일 수 (default: 5) */
  maxAttachments?: number;
  /** i18n 오버라이드 (선택) -- 검증 메시지에 적용 */
  i18n?: Partial<BlogI18nStrings>;
}

/** 스키마 팩토리 반환 타입 */
export interface BlogSchemas {
  CreateBlogPostSchema: z.ZodObject<z.ZodRawShape>;
  UpdateBlogPostSchema: z.ZodObject<z.ZodRawShape>;
  BulkUpdateSchema: z.ZodObject<z.ZodRawShape>;
}

/**
 * i18n 에러 메시지가 주입된 slug 스키마를 생성한다.
 */
function createSlugSchema(t: Required<BlogI18nStrings>) {
  return z
    .string()
    .min(1, t.validationSlugRequired)
    .max(200, t.validationSlugMaxLength)
    .regex(SLUG_PATTERN, t.validationSlugFormat);
}

/**
 * i18n 에러 메시지가 주입된 안전 URL 스키마를 생성한다.
 */
function createSafeUrlSchema(t: Required<BlogI18nStrings>) {
  return z.string().url(t.validationUrlInvalid).refine(
    (url) => {
      const lower = url.toLowerCase().replace(/[\t\n\r]/g, '');
      return !lower.startsWith('file:') && !lower.startsWith('javascript:') && !lower.startsWith('data:');
    },
    { message: t.validationUrlUnsafe },
  );
}

/**
 * 설정에 따라 블로그 유효성 검사 스키마를 생성한다.
 * maxAttachments를 BlogConfig에서 주입하여 검증과 설정을 일관되게 유지한다.
 *
 * @param config - 스키마 설정 (미제공 시 기본값 사용)
 * @returns 생성된 Zod 스키마 세트
 */
export function createBlogSchemas(config?: BlogSchemaConfig): BlogSchemas {
  const maxAttachments = config?.maxAttachments ?? 5;
  const t = resolveI18n(config?.i18n);
  const localSlugSchema = createSlugSchema(t);
  const localSafeUrl = createSafeUrlSchema(t);
  const localOptionalUrl = localSafeUrl.optional().or(z.literal(''));

  const CreateSchema = z.object({
    title: z.string().min(1, t.validationTitleRequired).max(200, t.validationTitleMaxLength),
    content: z.string().min(1, t.validationContentRequired),
    editorType: z.enum(['textarea', 'rich', 'block']).optional().default('rich'),
    excerpt: z.string().max(500, t.validationExcerptMaxLength).optional(),
    category: z.string().min(1, t.validationCategoryRequired),
    coverImageUrl: localOptionalUrl,
    coverImageKey: z.string().optional(),
    attachments: z.array(attachmentSchema).max(maxAttachments, t.adminAttachmentMaxExceeded).optional().default([]),
    featured: z.boolean().optional().default(false),
    published: z.boolean().optional().default(false),
    publishedAt: z.coerce.date().nullable().optional(),
    slug: localSlugSchema,
    tagIds: z.array(z.string()).optional(),
    tagSlugs: z.array(z.string()).optional(),
  });

  const UpdateSchema = z.object({
    title: z.string().min(1, t.validationTitleRequired).max(200, t.validationTitleMaxLength),
    content: z.string().min(1, t.validationContentRequired),
    editorType: z.enum(['textarea', 'rich', 'block']),
    excerpt: z.string().max(500, t.validationExcerptMaxLength),
    category: z.string().min(1, t.validationCategoryRequired),
    coverImageUrl: localOptionalUrl,
    coverImageKey: z.string(),
    attachments: z.array(attachmentSchema).max(maxAttachments, t.adminAttachmentMaxExceeded),
    featured: z.boolean(),
    published: z.boolean(),
    publishedAt: z.coerce.date().nullable(),
    slug: localSlugSchema,
    tagIds: z.array(z.string()),
    tagSlugs: z.array(z.string()),
  }).partial();

  const BulkSchema = z.object({
    ids: z.array(z.string()).min(1, t.validationIdsRequired),
    published: z.boolean().optional(),
    featured: z.boolean().optional(),
  });

  return {
    CreateBlogPostSchema: CreateSchema as unknown as z.ZodObject<z.ZodRawShape>,
    UpdateBlogPostSchema: UpdateSchema as unknown as z.ZodObject<z.ZodRawShape>,
    BulkUpdateSchema: BulkSchema as unknown as z.ZodObject<z.ZodRawShape>,
  };
}

// ── 정적 기본 스키마 (한국어 기본값, maxAttachments=5) ──

/** 블로그 글 생성 스키마 */
export const CreateBlogPostSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(200, '제목은 200자 이내로 입력해주세요'),
  content: z.string().min(1, '본문을 입력해주세요'),
  editorType: z.enum(['textarea', 'rich', 'block']).optional().default('rich'),
  excerpt: z.string().max(500, '요약은 500자 이내로 입력해주세요').optional(),
  /** 카테고리 -- 문자열 기반 (호스트 프로젝트에서 설정) */
  category: z.string().min(1, '카테고리를 선택해주세요'),
  coverImageUrl: optionalUrlSchema,
  coverImageKey: z.string().optional(),
  attachments: z.array(attachmentSchema).max(5).optional().default([]),
  featured: z.boolean().optional().default(false),
  published: z.boolean().optional().default(false),
  publishedAt: z.coerce.date().nullable().optional(),
  slug: slugSchema,
  tagIds: z.array(z.string()).optional(),
  tagSlugs: z.array(z.string()).optional(),
});

/** 블로그 글 수정 스키마 (모든 필드 partial) */
export const UpdateBlogPostSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(200, '제목은 200자 이내로 입력해주세요'),
  content: z.string().min(1, '본문을 입력해주세요'),
  editorType: z.enum(['textarea', 'rich', 'block']),
  excerpt: z.string().max(500, '요약은 500자 이내로 입력해주세요'),
  category: z.string().min(1, '카테고리를 선택해주세요'),
  coverImageUrl: optionalUrlSchema,
  coverImageKey: z.string(),
  attachments: z.array(attachmentSchema).max(5),
  featured: z.boolean(),
  published: z.boolean(),
  publishedAt: z.coerce.date().nullable(),
  slug: slugSchema,
  tagIds: z.array(z.string()),
  tagSlugs: z.array(z.string()),
}).partial();

/** 일괄 작업 스키마 */
export const BulkUpdateSchema = z.object({
  /** 대상 ID 배열 */
  ids: z.array(z.string()).min(1, '대상을 선택해주세요'),
  /** 일괄 공개 상태 변경 */
  published: z.boolean().optional(),
  /** 일괄 추천 상태 변경 */
  featured: z.boolean().optional(),
});

// ── 추론 타입 ──

export type CreateBlogPostData = z.infer<typeof CreateBlogPostSchema>;
export type UpdateBlogPostData = z.infer<typeof UpdateBlogPostSchema>;
export type BulkUpdateData = z.infer<typeof BulkUpdateSchema>;
