/**
 * 카테고리 테마 CSS 변수 유틸리티
 *
 * CategoryTheme 객체를 CSS 커스텀 프로퍼티 객체로 변환한다.
 * 컴포넌트의 style prop에 전개하면 해당 영역에 카테고리 색상이 적용된다.
 *
 * @example
 * ```tsx
 * import { createCategoryThemeVars } from 'blog-core-v2/utils';
 *
 * const theme = categories[post.category];
 * <div style={createCategoryThemeVars(theme)}>
 *   {/* 내부에서 var(--blog-cat-main) 등 사용 가능 *\/}
 * </div>
 * ```
 */
import type { CSSProperties } from 'react';
import type { CategoryTheme } from '../types/blog';

/**
 * CategoryTheme를 CSS 커스텀 프로퍼티 객체로 변환한다.
 *
 * 생성되는 CSS 변수:
 * - `--blog-cat-main`      : 주요 색상
 * - `--blog-cat-hero-color` : 히어로 영역 색상
 * - `--blog-cat-bg-tint`   : 배경 틴트
 * - `--blog-cat-bg-quote`  : 인용 배경
 * - `--blog-cat-border`    : 테두리 색상
 * - `--blog-cat-divider`   : 구분선 색상
 *
 * @param theme - 카테고리 테마 객체 (null/undefined 안전)
 * @returns CSSProperties로 사용할 수 있는 CSS 변수 객체
 */
export function createCategoryThemeVars(
  theme: CategoryTheme | null | undefined,
): CSSProperties {
  if (!theme) return {} as CSSProperties;

  return {
    '--blog-cat-main': theme.main,
    '--blog-cat-hero-color': theme.heroColor,
    '--blog-cat-bg-tint': theme.bgTint,
    '--blog-cat-bg-quote': theme.bgQuote,
    '--blog-cat-border': theme.border,
    '--blog-cat-divider': theme.divider,
  } as unknown as CSSProperties;
}
