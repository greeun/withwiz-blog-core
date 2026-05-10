'use client';

/**
 * 블로그 목록 미리보기 컴포넌트
 *
 * 공개된 글들을 목록 페이지 형태로 미리보기한다.
 * 공개 UI 컴포넌트(Sprint 6)에 의존하지 않고 자체 렌더링한다.
 */

import { useMemo, useState, type CSSProperties } from 'react';
import type { BlogListItem } from '../../types/blog';
import type { BlogListPreviewProps } from './types';
import { resolveI18n } from '../../i18n';
import { s } from './styles';

// ── 스타일 ──

const ls = {
  container: {
    backgroundColor: 'var(--blog-bg)',
    padding: 16,
  } as CSSProperties,

  tabs: {
    display: 'flex',
    gap: 4,
    marginBottom: 16,
    flexWrap: 'wrap' as const,
  } as CSSProperties,

  tab: (active: boolean): CSSProperties => ({
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    border: `1px solid ${active ? 'var(--blog-accent)' : 'var(--blog-border)'}`,
    borderRadius: 'var(--blog-radius-sm)',
    backgroundColor: active ? 'rgba(212,175,55,0.1)' : 'transparent',
    color: active ? 'var(--blog-accent)' : 'var(--blog-text-muted)',
    cursor: 'pointer',
    fontFamily: 'var(--blog-font)',
  }),

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16,
  } as CSSProperties,

  card: {
    backgroundColor: 'var(--blog-bg-card)',
    border: '1px solid var(--blog-border)',
    borderRadius: 'var(--blog-radius)',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'border-color 0.15s',
  } as CSSProperties,

  cardImage: {
    width: '100%',
    height: 160,
    objectFit: 'cover' as const,
    display: 'block',
    borderBottom: '1px solid var(--blog-border)',
  } as CSSProperties,

  cardNoImage: {
    width: '100%',
    height: 80,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--blog-bg-input)',
    color: 'var(--blog-text-dim)',
    fontSize: 24,
    borderBottom: '1px solid var(--blog-border)',
  } as CSSProperties,

  cardBody: {
    padding: 14,
  } as CSSProperties,

  cardCategory: {
    ...s.badge,
    backgroundColor: 'rgba(212,175,55,0.15)',
    color: 'var(--blog-accent)',
    marginBottom: 8,
    display: 'inline-block',
  } as CSSProperties,

  cardTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--blog-text)',
    marginBottom: 6,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    whiteSpace: 'nowrap' as const,
  } as CSSProperties,

  cardExcerpt: {
    fontSize: 12,
    color: 'var(--blog-text-muted)',
    lineHeight: 1.4,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden' as const,
  } as CSSProperties,

  cardMeta: {
    fontSize: 11,
    color: 'var(--blog-text-dim)',
    marginTop: 8,
  } as CSSProperties,

  empty: {
    padding: 40,
    textAlign: 'center' as const,
    color: 'var(--blog-text-dim)',
    fontSize: 13,
  } as CSSProperties,
};

/** fetch 래퍼 */
function apiFetch(
  url: string,
  authHeaders?: Record<string, string>,
): Promise<Response> {
  return fetch(url, { credentials: 'same-origin', headers: { ...authHeaders } });
}

/** 날짜 포맷 */
function fmtDate(v: string | Date | null): string {
  if (!v) return '';
  const d = new Date(v as string);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function BlogListPreview({
  apiBasePath,
  adminApiBasePath,
  authHeaders,
  categories,
  basePath,
  pageSize = 12,
  i18n,
  onSelectItem,
}: BlogListPreviewProps) {
  const t = resolveI18n(i18n);
  const [items, setItems] = useState<BlogListItem[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // 공개 API에서 글 목록을 로드
  useState(() => {
    const params = new URLSearchParams({ page: '1', limit: String(pageSize * 3) });
    apiFetch(`${apiBasePath}/posts?${params}`, authHeaders)
      .then((r) => r.json())
      .then((json) => {
        const data = (json as Record<string, unknown>)?.data ?? json;
        const result = data as { items?: BlogListItem[] };
        setItems(result?.items ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  });

  // 필터 + 페이지네이션
  const filtered = useMemo(() => {
    let list = items;
    if (activeCategory !== 'all') {
      list = list.filter((it) => it.category === activeCategory);
    }
    return list;
  }, [items, activeCategory]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  const catKeys = Object.keys(categories);

  return (
    <div style={ls.container}>
      {/* 카테고리 탭 */}
      <div style={ls.tabs}>
        <button
          type="button"
          style={ls.tab(activeCategory === 'all')}
          onClick={() => { setActiveCategory('all'); setPage(1); }}
        >
          {t.publicAllCategory}
        </button>
        {catKeys.map((key) => (
          <button
            key={key}
            type="button"
            style={ls.tab(activeCategory === key)}
            onClick={() => { setActiveCategory(key); setPage(1); }}
          >
            {categories[key].label}
          </button>
        ))}
      </div>

      {/* 카드 그리드 */}
      {loading ? (
        <div style={ls.empty}>{t.adminLoading}</div>
      ) : pageItems.length === 0 ? (
        <div style={ls.empty}>{t.publicNoPost}</div>
      ) : (
        <div style={ls.grid}>
          {pageItems.map((item) => (
            <div
              key={item.id}
              style={ls.card}
              onClick={() => onSelectItem?.(item.id)}
              role="button"
              tabIndex={0}
            >
              {item.coverImageUrl ? (
                <img src={item.coverImageUrl} alt={item.title} style={ls.cardImage} />
              ) : (
                <div style={ls.cardNoImage}>--</div>
              )}
              <div style={ls.cardBody}>
                <span style={ls.cardCategory}>
                  {categories[item.category]?.label || item.category}
                </span>
                <div style={ls.cardTitle}>{item.title}</div>
                {item.excerpt && <div style={ls.cardExcerpt}>{item.excerpt}</div>}
                <div style={ls.cardMeta}>
                  {fmtDate(item.publishedAt as string | null)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div style={s.pagination}>
          <button
            type="button"
            style={s.pageBtn(false)}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            {t.publicPrevPage}
          </button>
          <span style={{ fontSize: 13, color: 'var(--blog-text-muted)', margin: '0 8px' }}>
            {page} / {totalPages}
          </span>
          <button
            type="button"
            style={s.pageBtn(false)}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            {t.publicNextPage}
          </button>
        </div>
      )}
    </div>
  );
}
