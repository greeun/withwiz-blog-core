/**
 * 태그 클라우드 컴포넌트
 *
 * 여러 태그를 포스트 수에 비례한 폰트 크기로 표시한다.
 * postCount가 클수록 더 큰 폰트로 렌더링된다.
 */
import Link from "next/link";
import type { TagWithCount } from "../../types";

interface TagCloudProps {
  /** 표시할 태그 목록 (postCount 포함) */
  tags: TagWithCount[];
  /** 태그 링크 기본 경로 (예: "/blog/tag") — 최종 URL: `${basePath}/${tag.slug}` */
  basePath: string;
  /** 최소 폰트 크기(em) — default: 0.8 */
  minSize?: number;
  /** 최대 폰트 크기(em) — default: 1.8 */
  maxSize?: number;
  /** 추가 CSS 클래스 */
  className?: string;
}

/** postCount를 min~max 폰트 크기로 선형 변환 */
function scaleFontSize(
  count: number,
  minCount: number,
  maxCount: number,
  minSize: number,
  maxSize: number,
): number {
  if (maxCount === minCount) return (minSize + maxSize) / 2;
  const ratio = (count - minCount) / (maxCount - minCount);
  return minSize + ratio * (maxSize - minSize);
}

/** 태그 클라우드 — 사용 빈도에 비례한 폰트 크기 */
export default function TagCloud({
  tags,
  basePath,
  minSize = 0.8,
  maxSize = 1.8,
  className,
}: TagCloudProps) {
  if (!tags || tags.length === 0) {
    return null;
  }

  const counts = tags.map((t) => t.postCount);
  const minCount = Math.min(...counts);
  const maxCount = Math.max(...counts);

  const base = "blog-tag-cloud";
  const classes = className ? `${base} ${className}` : base;

  // basePath 끝 슬래시 정규화
  const trimmedBase = basePath.replace(/\/+$/, "");

  return (
    <div className={classes}>
      {tags.map((tag) => {
        const size = scaleFontSize(tag.postCount, minCount, maxCount, minSize, maxSize);
        const href = `${trimmedBase}/${tag.slug}`;
        return (
          <Link
            key={tag.id}
            href={href}
            className="blog-tag-cloud__item"
            data-tag-slug={tag.slug}
            data-post-count={tag.postCount}
            style={{ fontSize: `${size.toFixed(2)}em` }}
            title={`${tag.name} (${tag.postCount})`}
          >
            #{tag.name}
          </Link>
        );
      })}
    </div>
  );
}

export { TagCloud };
