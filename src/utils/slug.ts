/**
 * Slug 생성 및 검증 유틸리티
 */
import slugify from 'slugify';

/**
 * 유효한 slug 패턴: 소문자 영숫자 + 하이픈
 *
 * 단일 진실 공급원(single source of truth). 다른 모듈은 반드시 이 상수를 import하여 사용한다.
 */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * 문자열에서 URL-safe slug를 생성한다.
 *
 * @param text - slug로 변환할 원본 문자열
 * @returns URL-safe 소문자 slug
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
 * 소문자 영숫자와 하이픈만 허용 (^[a-z0-9]+(?:-[a-z0-9]+)*$)
 *
 * @param slug - 검증할 slug 문자열
 * @returns 유효 여부
 */
export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}
