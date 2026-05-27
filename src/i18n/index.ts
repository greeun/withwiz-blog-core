/**
 * @withwiz/blog-core i18n 유틸리티 진입점
 *
 * resolveI18n()으로 호스트의 Partial 오버라이드를 한국어 기본값과 병합한다.
 */
export type { BlogI18nStrings } from './types';
export { DEFAULT_I18N_KO } from './defaults';

import type { BlogI18nStrings } from './types';
import { DEFAULT_I18N_KO } from './defaults';

/**
 * BlogI18nStrings 오버라이드를 받아 모든 키가 채워진 완전한 객체를 반환한다.
 * 누락된 키는 한국어 기본값으로 채워진다.
 *
 * @param overrides - 호스트가 제공하는 부분 오버라이드 (미제공 시 기본값 전체 반환)
 * @returns 모든 키가 채워진 완전한 i18n 객체
 *
 * @example
 * ```typescript
 * // 영어만 오버라이드
 * const t = resolveI18n({
 *   adminListTitle: 'Blog Manager',
 *   adminCreateButton: '+ New Post',
 * });
 * // 나머지 키는 한국어 기본값
 * ```
 */
export function resolveI18n(
  overrides?: Partial<BlogI18nStrings>,
): Required<BlogI18nStrings> {
  if (!overrides) return DEFAULT_I18N_KO;
  return { ...DEFAULT_I18N_KO, ...overrides };
}
