"use client";

/**
 * 블로그 공개 목록 페이지 컴포넌트
 */

import { useEffect } from "react";
import Link from "next/link";
import type { BlogConfig, BlogListItem, PaginatedResult } from "../../types";
import { resolveI18n } from "../../i18n";

interface TagCloudItem {
  name: string;
  slug: string;
  postCount: number;
}

interface Props {
  result: PaginatedResult<BlogListItem>;
  config: BlogConfig;
  initialCategory?: string;
  currentPage?: number;
  /** 카테고리 변경 콜백 (미리보기 모드용) */
  onCategoryChange?: (cat: string) => void;
  /** 페이지 변경 콜백 (미리보기 모드용) */
  onPageChange?: (page: number) => void;
  /** 이미지 URL 변환기 */
  imageUrlTransformer?: (url: string, size: string) => string;
  /** 히어로 영역 영문 타이틀 (default: "News") */
  heroTitle?: string;
  /** 태그 클라우드 데이터 */
  tags?: TagCloudItem[];
  /** 현재 선택된 태그 slug */
  activeTag?: string;
}

export default function BlogListPage({
  result,
  config,
  initialCategory = "all",
  currentPage = 1,
  onCategoryChange,
  onPageChange,
  imageUrlTransformer,
  heroTitle = "News",
  tags,
  activeTag,
}: Props) {
  const i18n = resolveI18n(config.i18n);
  const categories = config.categories;
  const basePath = config.basePath;

  // URL 복원을 위한 세션 저장 (SSR-safe: useEffect 내부에서만 window 접근)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const key = config.sessionStorageKey || "blogListUrl";
      sessionStorage.setItem(key, window.location.pathname + window.location.search);
    } catch {
      // sessionStorage 비활성/할당 초과 등 — 무시
    }
  }, [config.sessionStorageKey]);

  const formatDate = (date: Date | string | null) => {
    if (!date) return "";
    const d = new Date(date);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  };

  // 현재 카테고리 테마
  const activeCatTheme = initialCategory !== "all" ? categories[initialCategory] : null;
  const heroStyle = activeCatTheme
    ? { "--hero-color": activeCatTheme.heroColor } as React.CSSProperties
    : undefined;

  return (
    <main className="blog-page page-with-header">
      {/* 히어로 섹션 */}
      <section className="blog-hero blog-hero--list" style={heroStyle}>
        <div className="blog-hero-content">
          <h1 className="blog-hero-title-en">{heroTitle}</h1>
          <div className="blog-hero-line" />
          <p className="blog-hero-title-ko">
            {activeCatTheme ? activeCatTheme.label : i18n.publicAllCategory}
          </p>
        </div>
      </section>

      <div className="blog-container">
        {/* 카테고리 탭 — onCategoryChange 제공 시 버튼, 아니면 Link로 폴백 */}
        <div className="blog-header-toolbar">
          <div className="blog-category-tabs">
            {onCategoryChange ? (
              <button
                className={`blog-category-tab${initialCategory === "all" ? " active" : ""}`}
                onClick={() => onCategoryChange("all")}
              >
                {i18n.publicAllCategory}
              </button>
            ) : (
              <Link
                href={basePath}
                className={`blog-category-tab${initialCategory === "all" ? " active" : ""}`}
              >
                {i18n.publicAllCategory}
              </Link>
            )}
            {Object.entries(categories).map(([key, theme]) => {
              const isActive = initialCategory === key;
              const tabClass = `blog-category-tab${isActive ? " active" : ""}`;
              const tabStyle = { "--tab-cat-main": theme.main } as React.CSSProperties;
              return onCategoryChange ? (
                <button
                  key={key}
                  className={tabClass}
                  style={tabStyle}
                  onClick={() => onCategoryChange(key)}
                >
                  {theme.label}
                </button>
              ) : (
                <Link
                  key={key}
                  href={`${basePath}?category=${key.toLowerCase()}`}
                  className={tabClass}
                  style={tabStyle}
                >
                  {theme.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* 태그 클라우드 — 카테고리 아래 별도 줄 */}
        {tags && tags.length > 0 && (
          <div className="blog-tag-cloud-row">
            {activeTag && (
              <Link
                href={basePath}
                className="blog-tag-chip blog-tag-chip--clear"
              >
                전체
              </Link>
            )}
            {tags.map((tag) => (
              <Link
                key={tag.slug}
                href={`${basePath}?tag=${tag.slug}`}
                className={`blog-tag-chip${activeTag === tag.slug ? " active" : ""}`}
              >
                # {tag.name}
                <span className="blog-tag-count">{tag.postCount}</span>
              </Link>
            ))}
          </div>
        )}

        {/* 그리드 */}
        <div className="blog-grid">
          {result.items.map((post) => {
            const theme = categories[post.category];
            const imgUrl = post.coverImageUrl
              ? (imageUrlTransformer ? imageUrlTransformer(post.coverImageUrl, "md") : post.coverImageUrl)
              : null;
            return (
              <Link
                key={post.id}
                href={`${basePath}/${post.slug}`}
                className="blog-card"
                style={{ "--card-cat-main": theme?.main || "#8a8070" } as React.CSSProperties}
              >
                <div className="blog-card-image-wrap">
                  {imgUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imgUrl} alt={post.title} loading="lazy" />
                  ) : (
                    <div className="blog-card-placeholder" />
                  )}
                  {theme && (
                    <span className="blog-card-badge" style={{ backgroundColor: theme.main }}>
                      {theme.label}
                    </span>
                  )}
                </div>
                <div className="blog-card-text">
                  <span className="blog-card-meta">{formatDate(post.publishedAt)}</span>
                  <h3 className="blog-card-title">{post.title}</h3>
                </div>
              </Link>
            );
          })}
        </div>

        {/* 페이지네이션 */}
        {result.pagination.totalPages > 1 && (() => {
          const qs = (pg: number) => {
            const p = new URLSearchParams();
            p.set("page", String(pg));
            if (initialCategory !== "all") p.set("category", initialCategory);
            if (activeTag) p.set("tag", activeTag);
            return `${basePath}?${p.toString()}`;
          };
          return (
            <div className="blog-pagination">
              {currentPage > 1 && (
                onPageChange
                  ? <button onClick={() => onPageChange(currentPage - 1)} className="blog-pagination-btn">&lt; {i18n.publicPrevPage}</button>
                  : <Link href={qs(currentPage - 1)} className="blog-pagination-btn">&lt; {i18n.publicPrevPage}</Link>
              )}
              <span className="blog-pagination-text">
                {currentPage} / {result.pagination.totalPages}
              </span>
              {result.pagination.hasMore && (
                onPageChange
                  ? <button onClick={() => onPageChange(currentPage + 1)} className="blog-pagination-btn">{i18n.publicNextPage} &gt;</button>
                  : <Link href={qs(currentPage + 1)} className="blog-pagination-btn">{i18n.publicNextPage} &gt;</Link>
              )}
            </div>
          );
        })()}
      </div>
    </main>
  );
}

export { BlogListPage };
