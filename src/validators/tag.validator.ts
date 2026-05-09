/**
 * 태그 유효성 검사 스키마 (Zod)
 *
 * slugSchema는 blog.validator에서 자체 정의된 것을 재사용한다.
 *
 * createTagSchemas(config?) 팩토리로 i18n을 주입할 수 있다.
 * 기존 정적 스키마(CreateTagSchema/UpdateTagSchema)는 한국어 기본값을 유지한다.
 */
import { z } from 'zod';
import { slugSchema } from './blog.validator';
import type { BlogI18nStrings } from '../types/blog';
import { resolveI18n } from '../i18n';

// ── 스키마 팩토리 ──

/** 태그 스키마 팩토리 설정 */
export interface TagSchemaConfig {
  /** i18n 오버라이드 (선택) */
  i18n?: BlogI18nStrings;
  /** 태그 이름 최대 길이 (default: 50) */
  maxNameLength?: number;
  /** 태그 설명 최대 길이 (default: 500) */
  maxDescriptionLength?: number;
}

/** 태그 스키마 팩토리 반환 타입 */
export interface TagSchemas {
  CreateTagSchema: z.ZodObject<z.ZodRawShape>;
  UpdateTagSchema: z.ZodObject<z.ZodRawShape>;
}

/** i18n / 길이 제한을 적용한 태그 스키마 세트를 생성한다. */
export function createTagSchemas(config?: TagSchemaConfig): TagSchemas {
  const t = resolveI18n(config?.i18n);
  const maxName = config?.maxNameLength ?? 50;
  const maxDesc = config?.maxDescriptionLength ?? 500;
  const Create = z.object({
    slug: slugSchema,
    name: z.string().min(1, t.tagPickerInvalidName).max(maxName, t.errorValidation),
    description: z.string().max(maxDesc, t.errorValidation).optional(),
  });
  return {
    CreateTagSchema: Create as unknown as z.ZodObject<z.ZodRawShape>,
    UpdateTagSchema: Create.partial() as unknown as z.ZodObject<z.ZodRawShape>,
  };
}

// ── 정적 기본 스키마 (한국어 기본값) ──

/** 태그 생성 스키마 */
export const CreateTagSchema = z.object({
  slug: slugSchema,
  name: z.string().min(1, '태그 이름을 입력해주세요').max(50, '태그 이름은 50자 이내로 입력해주세요'),
  description: z.string().max(500, '설명은 500자 이내로 입력해주세요').optional(),
});

/** 태그 수정 스키마 (모든 필드 partial) */
export const UpdateTagSchema = CreateTagSchema.partial();

// ── 추론 타입 ──

export type CreateTagData = z.infer<typeof CreateTagSchema>;
export type UpdateTagData = z.infer<typeof UpdateTagSchema>;
