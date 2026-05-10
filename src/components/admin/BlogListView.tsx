'use client';

/**
 * 관리자 글 목록 뷰
 *
 * 검색, 카테고리 필터, 정렬, 페이지네이션, 체크박스 선택, 일괄 작업 기능.
 *
 * API 계약:
 *   GET    {adminApiBasePath}/posts?page=N&limit=N&category=x&search=x&sortBy=x
 *   PATCH  {adminApiBasePath}/posts/bulk   body: { ids, published?, featured? }
 *   DELETE {adminApiBasePath}/posts        body: { ids }
 */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { BlogListItem } from '../../types/blog';
import type { PaginatedResult } from '../../types/common';
import type { BlogListViewProps, SortField } from './types';
import { resolveI18n } from '../../i18n';
import { s, rootVars } from './styles';

/** fetch 래퍼 */
function apiFetch(
  url: string,
  authHeaders?: Record<string, string>,
  options: RequestInit = {},
): Promise<Response> {
  return fetch(url, {
    ...options,
    credentials: 'same-origin',
    headers: { ...options.headers, ...authHeaders },
  });
}

// ── 스타일 ──

const lv = {
  toolbar: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap' as const,
  } as CSSProperties,

  searchInput: {
    ...s.input,
    maxWidth: 250,
    flex: '1 1 200px',
  } as CSSProperties,

  statusBadge: (published: boolean): CSSProperties => ({
    ...s.badge,
    ...(published ? s.badgePublished : s.badgeDraft),
  }),

  featuredBadge: {
    ...s.badge,
    ...s.badgeFeatured,
  } as CSSProperties,

  row: (isSelected: boolean): CSSProperties => ({
    cursor: 'pointer',
    backgroundColor: isSelected ? 'var(--blog-bg-selected)' : 'transparent',
    transition: 'background-color 0.1s',
  }),

  titleCell: {
    fontWeight: 500,
    color: 'var(--blog-text)',
    maxWidth: 300,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    whiteSpace: 'nowrap' as const,
  } as CSSProperties,

  bulkBar: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
    padding: '8px 12px',
    marginBottom: 12,
    backgroundColor: 'var(--blog-bg-card)',
    border: '1px solid var(--blog-border)',
    borderRadius: 'var(--blog-radius-sm)',
    flexWrap: 'wrap' as const,
  } as CSSProperties,

  empty: {
    padding: 40,
    textAlign: 'center' as const,
    color: 'var(--blog-text-dim)',
    fontSize: 13,
  } as CSSProperties,
};

/** 날짜 포맷 */
function fmtDate(v: string | Date | null | undefined): string {
  if (!v) return '-';
  const d = new Date(v as string);
  if (isNaN(d.getTime())) return '-';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function BlogListView({
  adminApiBasePath,
  apiBasePath,
  authHeaders,
  categories,
  pageSize = 12,
  i18n,
  onSelect,
  onCreate,
  onDashboard,
  onComments,
}: BlogListViewProps) {
  const t = resolveI18n(i18n);

  const [items, setItems] = useState<BlogListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const totalPages = Math.ceil(total / pageSize);
  const catKeys = Object.keys(categories);
  const hasViewCount = items.some((item) => item.viewCount !== undefined);

  // 검색 디바운스
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearchQuery(search);
      setPage(1);
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search]);

  // 데이터 로드
  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(pageSize));
      if (category) params.set('category', category);
      if (searchQuery) params.set('search', searchQuery);
      params.set('sortBy', sortBy);

      const res = await apiFetch(`${adminApiBasePath}/posts?${params}`, authHeaders);
      if (!res.ok) throw new Error(t.adminUnknownError);
      const json = await res.json();
      const data = (json as Record<string, unknown>)?.data ?? json;
      const result = data as PaginatedResult<BlogListItem>;
      setItems(result.items ?? []);
      setTotal(result.total ?? 0);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : t.adminUnknownError);
    } finally {
      setLoading(false);
    }
  }, [adminApiBasePath, authHeaders, page, pageSize, category, searchQuery, sortBy, t.adminUnknownError]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  // 선택 관련
  const allIds = useMemo(() => items.map((it) => it.id), [items]);

  const toggleAll = useCallback((checked: boolean) => {
    setSelected(checked ? new Set(allIds) : new Set());
  }, [allIds]);

  const toggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // 일괄 작업
  const bulkAction = useCallback(async (
    action: 'publish' | 'unpublish' | 'feature' | 'unfeature' | 'delete',
  ) => {
    if (selected.size === 0) return;
    const ids = [...selected];

    if (action === 'delete') {
      if (!confirm(t.adminBulkDeleteConfirm)) return;
      try {
        const res = await apiFetch(`${adminApiBasePath}/posts`, authHeaders, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        });
        if (!res.ok) throw new Error(t.adminUnknownError);
        await fetchList();
      } catch (err) {
        setError(err instanceof Error ? err.message : t.adminUnknownError);
      }
      return;
    }

    const body: Record<string, unknown> = { ids };
    if (action === 'publish') body.published = true;
    if (action === 'unpublish') body.published = false;
    if (action === 'feature') body.featured = true;
    if (action === 'unfeature') body.featured = false;

    try {
      const res = await apiFetch(`${adminApiBasePath}/posts/bulk`, authHeaders, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(t.adminUnknownError);
      await fetchList();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.adminUnknownError);
    }
  }, [selected, adminApiBasePath, authHeaders, fetchList, t]);

  // 정렬 라벨
  const sortLabels: Record<SortField, string> = {
    createdAt: t.adminSortCreatedAt,
    publishedAt: t.adminSortPublishedAt,
    updatedAt: t.adminSortUpdatedAt,
  };

  return (
    <div>
      {/* 헤더 */}
      <div style={{ ...s.flexBetween, marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--blog-text)' }}>
          {t.adminListTitle}
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {onDashboard && (
            <button type="button" style={s.btn} onClick={onDashboard}>
              {t.adminTabDashboard}
            </button>
          )}
          {onComments && (
            <button type="button" style={s.btn} onClick={onComments}>
              {t.moderationTitle}
            </button>
          )}
          <button type="button" style={s.btnPrimary} onClick={onCreate}>
            {t.adminCreateButton}
          </button>
        </div>
      </div>

      {/* 필터 toolbar */}
      <div style={lv.toolbar}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.adminSearchPlaceholder}
          style={lv.searchInput}
        />
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          style={s.select}
        >
          <option value="">{t.adminCategoryAll}</option>
          {catKeys.map((key) => (
            <option key={key} value={key}>{categories[key].label}</option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value as SortField); setPage(1); }}
          style={s.select}
        >
          {(Object.keys(sortLabels) as SortField[]).map((key) => (
            <option key={key} value={key}>{sortLabels[key]}</option>
          ))}
        </select>
      </div>

      {/* 일괄 작업 toolbar */}
      {selected.size > 0 && (
        <div style={lv.bulkBar}>
          <span style={{ fontSize: 12, color: 'var(--blog-text-muted)' }}>
            {selected.size}{t.adminBulkSelectedSuffix}
          </span>
          <button type="button" style={{ ...s.btn, ...s.btnSmall }} onClick={() => bulkAction('publish')}>
            {t.adminBulkPublish}
          </button>
          <button type="button" style={{ ...s.btn, ...s.btnSmall }} onClick={() => bulkAction('unpublish')}>
            {t.adminBulkUnpublish}
          </button>
          <button type="button" style={{ ...s.btn, ...s.btnSmall }} onClick={() => bulkAction('feature')}>
            {t.adminBulkFeature}
          </button>
          <button type="button" style={{ ...s.btn, ...s.btnSmall }} onClick={() => bulkAction('unfeature')}>
            {t.adminBulkUnfeature}
          </button>
          <button type="button" style={{ ...s.btnDanger, ...s.btnSmall }} onClick={() => bulkAction('delete')}>
            {t.adminBulkDelete}
          </button>
          <button type="button" style={{ ...s.btn, ...s.btnSmall }} onClick={() => setSelected(new Set())}>
            {t.adminBulkClear}
          </button>
        </div>
      )}

      {/* 에러 */}
      {error && <p style={s.errorText} role="alert">{error}</p>}

      {/* 테이블 */}
      <div style={{ overflowX: 'auto' }}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={{ ...s.th, width: 36 }}>
                <input
                  type="checkbox"
                  aria-label={t.adminSelectAll}
                  checked={selected.size > 0 && selected.size === allIds.length}
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </th>
              <th style={s.th}>{t.adminTitleLabel}</th>
              <th style={{ ...s.th, width: 100 }}>{t.adminCategoryLabel}</th>
              <th style={{ ...s.th, width: 80 }}>{t.adminPublishedLabel}</th>
              <th style={{ ...s.th, width: 60 }}>{t.adminFeaturedShort}</th>
              {hasViewCount && (
                <th style={{ ...s.th, width: 70, textAlign: 'right' }}>{t.adminViewCountLabel}</th>
              )}
              <th style={{ ...s.th, width: 100 }}>{t.adminMetaCreatedAt}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={hasViewCount ? 7 : 6} style={{ ...s.td, textAlign: 'center', color: 'var(--blog-text-muted)' }}>
                  {t.adminLoading}
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={hasViewCount ? 7 : 6} style={{ ...s.td, textAlign: 'center', color: 'var(--blog-text-dim)' }}>
                  {t.adminListEmpty}
                </td>
              </tr>
            )}
            {!loading && items.map((item) => (
              <tr
                key={item.id}
                style={lv.row(selected.has(item.id))}
                onClick={() => onSelect(item.id)}
              >
                <td style={s.td} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.has(item.id)}
                    onChange={() => toggleOne(item.id)}
                    aria-label={item.title}
                  />
                </td>
                <td style={{ ...s.td, ...lv.titleCell }}>
                  {item.title || t.adminItemNoTitle}
                  {item.hasAttachments && (
                    <span style={{ marginLeft: 6, fontSize: 12 }} title={t.adminAttachmentsLabel}>
                      {'\u{1F4CE}'}
                    </span>
                  )}
                </td>
                <td style={s.td}>
                  <span style={{ ...s.badge, backgroundColor: 'rgba(212,175,55,0.1)', color: 'var(--blog-accent)', fontSize: 11 }}>
                    {categories[item.category]?.label || item.category}
                  </span>
                </td>
                <td style={s.td}>
                  <span style={lv.statusBadge(item.published)}>
                    {item.published ? t.adminPublishedSuffix : t.adminDraftSuffix}
                  </span>
                </td>
                <td style={{ ...s.td, textAlign: 'center' }}>
                  {item.featured && (
                    <span style={lv.featuredBadge}>{t.adminFeaturedShort}</span>
                  )}
                </td>
                {hasViewCount && (
                  <td style={{ ...s.td, textAlign: 'right', fontSize: 12, color: 'var(--blog-text-dim)' }}>
                    {item.viewCount !== undefined ? item.viewCount.toLocaleString() : '-'}
                  </td>
                )}
                <td style={{ ...s.td, fontSize: 12, color: 'var(--blog-text-dim)' }}>
                  {fmtDate(item.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div style={s.pagination}>
          <button
            type="button"
            style={s.pageBtn(false)}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
          >
            {t.publicPrevPage}
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => Math.abs(p - page) <= 2 || p === 1 || p === totalPages)
            .map((p, idx, arr) => {
              // 생략 표시
              if (idx > 0 && p - arr[idx - 1] > 1) {
                return (
                  <span key={`gap-${p}`} style={{ color: 'var(--blog-text-dim)', padding: '0 4px' }}>...</span>
                );
              }
              return (
                <button
                  key={p}
                  type="button"
                  style={s.pageBtn(p === page)}
                  onClick={() => setPage(p)}
                  disabled={loading}
                >
                  {p}
                </button>
              );
            })}
          <button
            type="button"
            style={s.pageBtn(false)}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
          >
            {t.publicNextPage}
          </button>
        </div>
      )}

      {/* 건수 */}
      {!loading && (
        <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: 'var(--blog-text-dim)' }}>
          {total}{t.adminCountSuffix}
        </div>
      )}
    </div>
  );
}
