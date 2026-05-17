'use client';
import type { LinkProps } from '../../types/ui-components';

/**
 * 기본 링크 구현: 평문 <a>.
 *
 * 클라이언트 사이드 네비게이션(prefetch 등)이 필요하면 호스트가
 * BlogThemeProvider로 next/link 등의 어댑터를 주입한다.
 */
export function DefaultLink({ href, children, ...rest }: LinkProps) {
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}
