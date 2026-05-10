/**
 * 태그 배지 컴포넌트
 *
 * 블로그 상세/목록 페이지에서 태그 하나를 표시할 때 사용한다.
 * href 또는 basePath가 주어지면 Next.js Link로 감싼다.
 * onClick이 주어지면 버튼으로 동작한다.
 */

import Link from "next/link";
import type { TagBadgeProps } from "./types";
import { ps } from "./styles";

export default function TagBadge({
  tag,
  basePath,
  href,
  onClick,
  className,
}: TagBadgeProps) {
  const content = <>#{tag.name}</>;
  const resolvedHref = href || (basePath ? `${basePath}?tag=${tag.slug}` : undefined);

  const style = ps.tagBadge;

  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        style={{ ...style, border: "none" }}
        onClick={() => onClick(tag)}
        data-tag-slug={tag.slug}
      >
        {content}
      </button>
    );
  }

  if (resolvedHref) {
    return (
      <Link
        href={resolvedHref}
        className={className}
        style={style}
        data-tag-slug={tag.slug}
      >
        {content}
      </Link>
    );
  }

  return (
    <span
      className={className}
      style={style}
      data-tag-slug={tag.slug}
    >
      {content}
    </span>
  );
}

export { TagBadge };
