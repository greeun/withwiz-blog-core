"use client";

/**
 * 블로그 목록 미리보기 컴포넌트
 */

import { useState, useMemo, Suspense } from "react";
import { buildPaginatedResult } from "../../utils/pagination";
import type { BlogConfig, BlogListItem } from "../../types";
import type { BlogItem } from "./constants";
import BlogListPage from "../public/BlogListPage";

interface Props {
  publishedItems: BlogItem[];
  onSelectItem: (id: string) => void;
  config: BlogConfig;
}

export default function BlogListPreview({ publishedItems, onSelectItem, config }: Props) {
  const [pvCategory, setPvCategory] = useState("all");
  const [pvPage, setPvPage] = useState(1);
  const pageSize = config.pageSize ?? 12;

  // BlogItem → BlogListItem 변환
  const pvItems = useMemo((): BlogListItem[] =>
    publishedItems.map((n) => ({
      id: n.id,
      slug: n.slug,
      category: n.category,
      title: n.title,
      excerpt: n.excerpt,
      coverImageUrl: n.coverImageUrl,
      hasAttachments: n.hasAttachments,
      featured: n.featured,
      published: n.published,
      publishedAt: n.publishedAt,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    })),
  [publishedItems]);

  // 필터링 + 정렬 + 페이지네이션
  const pvResult = useMemo(() => {
    let filtered = pvItems.filter(
      (n) => pvCategory === "all" || n.category === pvCategory
    );
    filtered = [...filtered].sort((a, b) => {
      const ta = a.publishedAt ? new Date(a.publishedAt as string).getTime() : 0;
      const tb = b.publishedAt ? new Date(b.publishedAt as string).getTime() : 0;
      return tb - ta;
    });
    const total = filtered.length;
    return buildPaginatedResult(
      filtered.slice((pvPage - 1) * pageSize, pvPage * pageSize),
      total,
      pvPage,
      pageSize,
    );
  }, [pvItems, pvCategory, pvPage, pageSize]);

  return (
    <div
      onClick={(e) => {
        const link = (e.target as HTMLElement).closest(`a[href^="${config.basePath}/"]`);
        if (link) {
          e.preventDefault();
          const slug = link.getAttribute("href")?.replace(`${config.basePath}/`, "");
          const item = publishedItems.find((n) => n.slug === slug);
          if (item) onSelectItem(item.id);
        }
      }}
    >
      <Suspense fallback={null}>
        <BlogListPage
          result={pvResult}
          config={config}
          initialCategory={pvCategory}
          currentPage={pvPage}
          onCategoryChange={(cat) => { setPvCategory(cat); setPvPage(1); }}
          onPageChange={setPvPage}
        />
      </Suspense>
    </div>
  );
}

export { BlogListPreview };
