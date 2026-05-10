/**
 * Slug 생성 및 검증 유틸리티
 */
import slugify from 'slugify';

/** 유효한 slug 패턴: 소문자 영숫자 + 하이픈 */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * 문자열에서 URL-safe slug를 생성한다.
 */
export function generateSlug(text: string): string {
  return slugify(text, {
    lower: true,
    strict: true,
    trim: true,
  });
}

/**
 * slug가 유효한 형식인지 검증한다.
 */
export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}
