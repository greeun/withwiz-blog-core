/**
 * 댓글 유효성 검사 스키마 (Zod)
 *
 * createCommentSchemas(config?) 팩토리로 i18n을 주입할 수 있다.
 * 정적 스키마는 한국어 기본 메시지를 유지한다 (하위 호환).
 */
import { z } from 'zod';
import type { BlogI18nStrings } from '../i18n/types';
import { resolveI18n } from '../i18n';

// ── 스키마 팩토리 ──

/** 댓글 스키마 팩토리 설정 */
export interface CommentSchemaConfig {
  /** i18n 오버라이드 (선택) */
  i18n?: Partial<BlogI18nStrings>;
  /** 댓글 본문 최대 길이 (default: 2000) */
  maxContentLength?: number;
  /** 게스트 이름 최대 길이 (default: 50) */
  maxGuestNameLength?: number;
}

/** 댓글 스키마 팩토리 반환 타입 */
export interface CommentSchemas {
  CreateCommentSchema: z.ZodObject<z.ZodRawShape>;
  UpdateCommentStatusSchema: z.ZodObject<z.ZodRawShape>;
}

/** i18n / 길이 제한을 적용한 댓글 스키마 세트를 생성한다. */
export function createCommentSchemas(config?: CommentSchemaConfig): CommentSchemas {
  const t = resolveI18n(config?.i18n);
  const maxContent = config?.maxContentLength ?? 2000;
  const maxGuestName = config?.maxGuestNameLength ?? 50;

  const Create = z.object({
    postId: z.string().min(1, t.validationPostIdRequired),
    parentId: z.string().optional(),
    content: z
      .string()
      .min(1, t.validationCommentContentRequired)
      .max(maxContent, t.validationCommentContentMaxLength),
    guestName: z
      .string()
      .min(1, t.validationCommentNameRequired)
      .max(maxGuestName, t.validationCommentNameMaxLength)
      .optional(),
    guestEmail: z.string().email(t.validationCommentEmailInvalid).optional(),
    honeypot: z.string().optional(),
  });

  const UpdateStatus = z.object({
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SPAM']),
  });

  return {
    CreateCommentSchema: Create as unknown as z.ZodObject<z.ZodRawShape>,
    UpdateCommentStatusSchema: UpdateStatus as unknown as z.ZodObject<z.ZodRawShape>,
  };
}

// ── 정적 기본 스키마 (한국어 기본값) ──

/** 댓글 생성 스키마 */
export const CreateCommentSchema = z.object({
  postId: z.string().min(1, '포스트 ID가 필요합니다'),
  parentId: z.string().optional(),
  content: z
    .string()
    .min(1, '댓글 내용을 입력해주세요')
    .max(2000, '댓글은 2000자 이내로 입력해주세요'),
  guestName: z
    .string()
    .min(1, '이름을 입력해주세요')
    .max(50, '이름은 50자 이내로 입력해주세요')
    .optional(),
  guestEmail: z.string().email('유효한 이메일을 입력해주세요').optional(),
  /** 허니팟 -- 봇이 채우면 SPAM으로 분류한다 */
  honeypot: z.string().optional(),
});

/** 댓글 상태 변경 스키마 */
export const UpdateCommentStatusSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SPAM']),
});

// ── 추론 타입 ──

export type CreateCommentData = z.infer<typeof CreateCommentSchema>;
export type UpdateCommentStatusData = z.infer<typeof UpdateCommentStatusSchema>;
