/**
 * 태그 배지 컴포넌트
 *
 * 블로그 상세/목록 페이지에서 태그 하나를 표시할 때 사용한다.
 * href가 주어지면 Next.js Link로 감싸고, 없으면 span으로 표시한다.
 */
import Link from "next/link";
import type { Tag } from "../../types";

interface TagBadgeProps {
  /** 표시할 태그 */
  tag: Tag;
  /** 클릭 시 이동할 URL (없으면 링크 비활성) */
  href?: string;
  /** 추가 CSS 클래스 */
  className?: string;
}

/** 태그 배지 — 클릭 가능한 pill 스타일의 태그 표시 */
export default function TagBadge({ tag, href, className }: TagBadgeProps) {
  const base = "blog-tag-badge";
  const classes = className ? `${base} ${className}` : base;

  const content = <>#{tag.name}</>;

  if (href) {
    return (
      <Link href={href} className={classes} data-tag-slug={tag.slug}>
        {content}
      </Link>
    );
  }

  return (
    <span className={classes} data-tag-slug={tag.slug}>
      {content}
    </span>
  );
}

export { TagBadge };
