"use client";

/**
 * 블로그 공개 목록 페이지 컴포넌트
 *
 * 카테고리 탭, 태그 필터, 페이지네이션을 지원한다.
 * onCategoryChange/onPageChange 콜백이 제공되면 버튼으로, 아니면 Link로 동작한다.
 */

import { useEffect } from "react";
import type { BlogListPageProps } from "./types";
import { resolveI18n } from "../../i18n";
import { ps, publicRootVars } from "./styles";
import { useBlogUI } from "../../context/BlogUIContext";

function formatDate(date: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function BlogListPage({
  result,
  categories,
  basePath,
  initialCategory = "all",
  currentPage = 1,
  onCategoryChange,
  onPageChange,
  imageUrlTransformer,
  heroTitle = "Blog",
  tags,
  activeTag,
  i18n: i18nOverride,
  className,
  sessionStorageKey,
}: BlogListPageProps) {
  const t = resolveI18n(i18nOverride);
  const { Badge, Link } = useBlogUI();

  // URL 복원을 위한 세션 저장
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const key = sessionStorageKey || "blogListUrl";
      sessionStorage.setItem(key, window.location.pathname + window.location.search);
    } catch {
      // sessionStorage 비활성 — 무시
    }
  }, [sessionStorageKey]);

  const rootClass = className ? `blog-public-list ${className}` : "blog-public-list";

  return (
    <div className={rootClass} style={{ ...publicRootVars(), ...ps.container }}>
      {/* 카테고리 탭 */}
      <div style={ps.categoryTabs}>
        {onCategoryChange ? (
          <button
            type="button"
            style={ps.categoryTab(initialCategory === "all")}
            onClick={() => onCategoryChange("all")}
          >
            {t.publicAllCategory}
          </button>
        ) : (
          <Link href={basePath} style={ps.categoryTab(initialCategory === "all")}>
            {t.publicAllCategory}
          </Link>
        )}
        {Object.entries(categories).map(([key, theme]) => {
          const isActive = initialCategory === key;
          return onCategoryChange ? (
            <button
              key={key}
              type="button"
              style={ps.categoryTab(isActive)}
              onClick={() => onCategoryChange(key)}
            >
              {theme.label}
            </button>
          ) : (
            <Link
              key={key}
              href={`${basePath}?category=${key.toLowerCase()}`}
              style={ps.categoryTab(isActive)}
            >
              {theme.label}
            </Link>
          );
        })}
      </div>

      {/* 태그 클라우드 (카테고리 아래) */}
      {tags && tags.length > 0 && (
        <div style={ps.tagRow}>
          {activeTag && (
            <Link href={basePath} style={ps.tagChip(false)}>
              {t.publicAllCategory}
            </Link>
          )}
          {tags.map((tag) => (
            <Link
              key={tag.slug}
              href={`${basePath}?tag=${tag.slug}`}
              style={ps.tagChip(activeTag === tag.slug)}
            >
              # {tag.name}
              <span style={ps.tagChipCount}>{tag.postCount}</span>
            </Link>
          ))}
        </div>
      )}

      {/* 글 목록 그리드 */}
      {result.items.length === 0 ? (
        <div style={ps.emptyState}>{t.publicNoPost}</div>
      ) : (
        <div style={ps.grid}>
          {result.items.map((post) => {
            const theme = categories[post.category];
            const imgUrl = post.coverImageUrl
              ? (imageUrlTransformer ? imageUrlTransformer(post.coverImageUrl, "md") : post.coverImageUrl)
              : null;
            return (
              <Link
                key={post.id}
                href={`${basePath}/${post.slug}`}
                style={ps.card}
              >
                <div style={ps.cardImageWrap}>
                  {imgUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imgUrl} alt={post.title} loading="lazy" style={ps.cardImage} />
                  ) : (
                    <div style={ps.cardPlaceholder} />
                  )}
                  {theme && (
                    <span style={ps.cardBadge(theme.main)}>
                      {theme.label}
                    </span>
                  )}
                </div>
                <div style={ps.cardBody}>
                  <div style={ps.cardMeta}>{formatDate(post.publishedAt)}</div>
                  <h3 style={ps.cardTitle}>{post.title}</h3>
                  {post.excerpt && <p style={ps.cardExcerpt}>{post.excerpt}</p>}
                  {post.tags && post.tags.length > 0 && (
                    <div style={ps.cardTags}>
                      {post.tags.map((tag) => (
                        <Badge key={tag.id} style={ps.tagBadge}>#{tag.name}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* 페이지네이션 */}
      {result.totalPages > 1 && (() => {
        const buildHref = (pg: number) => {
          const p = new URLSearchParams();
          p.set("page", String(pg));
          if (initialCategory !== "all") p.set("category", initialCategory);
          if (activeTag) p.set("tag", activeTag);
          return `${basePath}?${p.toString()}`;
        };

        return (
          <div style={ps.pagination}>
            {currentPage > 1 && (
              onPageChange
                ? <button type="button" onClick={() => onPageChange(currentPage - 1)} style={ps.pageBtn(false)}>&laquo; {t.publicPrevPage}</button>
                : <Link href={buildHref(currentPage - 1)} style={ps.pageBtn(false)}>&laquo; {t.publicPrevPage}</Link>
            )}
            <span style={ps.pageText}>
              {currentPage} / {result.totalPages}
            </span>
            {currentPage < result.totalPages && (
              onPageChange
                ? <button type="button" onClick={() => onPageChange(currentPage + 1)} style={ps.pageBtn(false)}>{t.publicNextPage} &raquo;</button>
                : <Link href={buildHref(currentPage + 1)} style={ps.pageBtn(false)}>{t.publicNextPage} &raquo;</Link>
            )}
          </div>
        );
      })()}
    </div>
  );
}

export { BlogListPage };
