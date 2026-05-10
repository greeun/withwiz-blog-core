/**
 * 태그 클라우드 컴포넌트
 *
 * 여러 태그를 포스트 수에 비례한 폰트 크기로 표시한다.
 */

import Link from "next/link";
import type { TagCloudProps } from "./types";
import { resolveI18n } from "../../i18n";
import { ps, publicRootVars } from "./styles";

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

export default function TagCloud({
  tags,
  basePath,
  minSize = 0.8,
  maxSize = 1.8,
  onTagClick,
  i18n: i18nOverride,
  className,
}: TagCloudProps) {
  const t = resolveI18n(i18nOverride);

  if (!tags || tags.length === 0) {
    return (
      <div className={className} style={{ ...publicRootVars() }}>
        <p style={ps.tagCloudEmpty}>{t.tagCloudEmpty}</p>
      </div>
    );
  }

  const counts = tags.map((tag) => tag.postCount);
  const minCount = Math.min(...counts);
  const maxCount = Math.max(...counts);

  const trimmedBase = basePath.replace(/\/+$/, "");

  return (
    <div className={className} style={{ ...publicRootVars(), ...ps.tagCloud }}>
      {tags.map((tag) => {
        const size = scaleFontSize(tag.postCount, minCount, maxCount, minSize, maxSize);
        const href = `${trimmedBase}?tag=${tag.slug}`;

        if (onTagClick) {
          return (
            <button
              key={tag.id}
              type="button"
              style={{
                ...ps.tagCloudItem,
                fontSize: `${size.toFixed(2)}em`,
                border: "none",
                backgroundColor: "transparent",
                cursor: "pointer",
                fontFamily: "var(--blog-public-font)",
              }}
              onClick={() => onTagClick(tag)}
              title={`${tag.name} (${tag.postCount})`}
              data-tag-slug={tag.slug}
              data-post-count={tag.postCount}
            >
              #{tag.name}
            </button>
          );
        }

        return (
          <Link
            key={tag.id}
            href={href}
            style={{ ...ps.tagCloudItem, fontSize: `${size.toFixed(2)}em` }}
            title={`${tag.name} (${tag.postCount})`}
            data-tag-slug={tag.slug}
            data-post-count={tag.postCount}
          >
            #{tag.name}
          </Link>
        );
      })}
    </div>
  );
}

export { TagCloud };
