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
import type { BlogListViewProps, SortField, SortDir } from './types';
import { resolveI18n } from '../../i18n';
import { s, rootVars } from './styles';
import { useBlogUI } from '../../context/BlogUIContext';

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

  row: (isSelected: boolean): CSSProperties => ({
    cursor: 'pointer',
    backgroundColor: isSelected ? 'var(--blog-admin-bg-selected)' : 'transparent',
    transition: 'background-color 0.1s',
  }),

  titleCell: {
    fontWeight: 500,
    color: 'var(--blog-admin-text)',
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
    backgroundColor: 'var(--blog-admin-bg-card)',
    border: '1px solid var(--blog-admin-border)',
    borderRadius: 'var(--blog-admin-radius-sm)',
    flexWrap: 'wrap' as const,
  } as CSSProperties,

  empty: {
    padding: 40,
    textAlign: 'center' as const,
    color: 'var(--blog-admin-text-dim)',
    fontSize: 13,
  } as CSSProperties,
};

/** 날짜 포맷 (`2026. 03. 21. 09:01:18`) */
function fmtDate(v: string | Date | null | undefined): string {
  if (!v) return '-';
  const d = new Date(v as string);
  if (isNaN(d.getTime())) return '-';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}. ${pad(d.getMonth() + 1)}. ${pad(d.getDate())}. ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** 인라인 토글 스위치 (목록 셀용 — 텍스트 없음, 줄바꿈 없음) */
function ToggleSwitch({
  on,
  onToggle,
  title,
}: {
  on: boolean;
  onToggle: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        background: 'none',
        padding: 0,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        lineHeight: 0,
      }}
    >
      <span
        style={{
          position: 'relative',
          display: 'inline-block',
          width: 34,
          height: 18,
          borderRadius: 999,
          background: on ? '#10b981' : '#d1d5db',
          transition: 'background 0.15s',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: on ? 18 : 2,
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
            transition: 'left 0.15s',
          }}
        />
      </span>
    </button>
  );
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export default function BlogListView({
  adminApiBasePath,
  apiBasePath,
  authHeaders,
  categories,
  pageSize: initialPageSize = 20,
  i18n,
  onSelect,
  onCreate,
  onDashboard,
  onComments,
}: BlogListViewProps) {
  const t = resolveI18n(i18n);
  const { Button, Input, Select, Badge } = useBlogUI();

  const [items, setItems] = useState<BlogListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const totalPages = Math.ceil(total / pageSize);
  const catKeys = Object.keys(categories);
  const hasViewCount = items.some((item) => item.viewCount !== undefined);
  const colCount = hasViewCount ? 9 : 8;

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
      params.set('sortDir', sortDir);

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
  }, [adminApiBasePath, authHeaders, page, pageSize, category, searchQuery, sortBy, sortDir, t.adminUnknownError]);

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

  // 행 단위 토글 (발행/추천) — bulk API 재사용, 화면 즉시 반영
  const patchField = useCallback(async (
    id: string,
    field: 'published' | 'featured',
    next: boolean,
  ) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: next } : it)));
    try {
      const res = await apiFetch(`${adminApiBasePath}/posts/bulk`, authHeaders, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id], [field]: next }),
      });
      if (!res.ok) throw new Error(t.adminUnknownError);
    } catch (err) {
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: !next } : it)));
      setError(err instanceof Error ? err.message : t.adminUnknownError);
    }
  }, [adminApiBasePath, authHeaders, t]);

  // toolbar Select 용 정렬 라벨 (기존 호환)
  const sortLabels: Record<'createdAt' | 'publishedAt' | 'updatedAt', string> = {
    createdAt: t.adminSortCreatedAt,
    publishedAt: t.adminSortPublishedAt,
    updatedAt: t.adminSortUpdatedAt,
  };

  const handleSort = useCallback((field: SortField) => {
    if (field === sortBy) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
    setPage(1);
  }, [sortBy]);

  const sortIndicator = (field: SortField): string =>
    sortBy === field ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  const sortableHeaderStyle: CSSProperties = { cursor: 'pointer', userSelect: 'none' };

  return (
    <div>
      {/* 헤더 */}
      <div style={{ ...s.flexBetween, marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--blog-admin-text)' }}>
          {t.adminListTitle}
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {onDashboard && (
            <Button onClick={onDashboard}>
              {t.adminTabDashboard}
            </Button>
          )}
          {onComments && (
            <Button onClick={onComments}>
              {t.moderationTitle}
            </Button>
          )}
          <Button variant="primary" onClick={onCreate}>
            {t.adminCreateButton}
          </Button>
        </div>
      </div>

      {/* 필터 toolbar */}
      <div style={lv.toolbar}>
        <Input
          style={{ maxWidth: 250, flex: '1 1 200px' }}
          placeholder={t.adminSearchPlaceholder}
          value={search}
          onChange={setSearch}
        />
        <Select
          value={category}
          onChange={(v) => { setCategory(v); setPage(1); }}
          options={[
            { value: '', label: t.adminCategoryAll },
            ...catKeys.map((k) => ({ value: k, label: categories[k].label })),
          ]}
        />
        <Select
          value={(['createdAt', 'publishedAt', 'updatedAt'] as const).includes(sortBy as never) ? sortBy : 'updatedAt'}
          onChange={(v) => { setSortBy(v as SortField); setSortDir('desc'); setPage(1); }}
          options={(Object.keys(sortLabels) as Array<keyof typeof sortLabels>).map((key) => ({ value: key, label: sortLabels[key] }))}
        />
        <Select
          value={String(pageSize)}
          onChange={(v) => { setPageSize(Number(v)); setPage(1); }}
          options={PAGE_SIZE_OPTIONS.map((n) => ({ value: String(n), label: `${n}${t.adminPerPageSuffix}` }))}
        />
      </div>

      {/* 일괄 작업 toolbar */}
      {selected.size > 0 && (
        <div style={lv.bulkBar}>
          <span style={{ fontSize: 12, color: 'var(--blog-admin-text-muted)' }}>
            {selected.size}{t.adminBulkSelectedSuffix}
          </span>
          <Button size="small" onClick={() => bulkAction('publish')}>
            {t.adminBulkPublish}
          </Button>
          <Button size="small" onClick={() => bulkAction('unpublish')}>
            {t.adminBulkUnpublish}
          </Button>
          <Button size="small" onClick={() => bulkAction('feature')}>
            {t.adminBulkFeature}
          </Button>
          <Button size="small" onClick={() => bulkAction('unfeature')}>
            {t.adminBulkUnfeature}
          </Button>
          <Button variant="danger" size="small" onClick={() => bulkAction('delete')}>
            {t.adminBulkDelete}
          </Button>
          <Button size="small" onClick={() => setSelected(new Set())}>
            {t.adminBulkClear}
          </Button>
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
              <th
                style={{ ...s.th, ...sortableHeaderStyle }}
                onClick={() => handleSort('title')}
                aria-sort={sortBy === 'title' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                {t.adminTitleLabel}{sortIndicator('title')}
              </th>
              <th
                style={{ ...s.th, width: 100, ...sortableHeaderStyle }}
                onClick={() => handleSort('category')}
                aria-sort={sortBy === 'category' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                {t.adminCategoryLabel}{sortIndicator('category')}
              </th>
              <th
                style={{ ...s.th, width: 80, ...sortableHeaderStyle }}
                onClick={() => handleSort('published')}
                aria-sort={sortBy === 'published' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                {t.adminPublishedLabel}{sortIndicator('published')}
              </th>
              <th
                style={{ ...s.th, width: 60, ...sortableHeaderStyle }}
                onClick={() => handleSort('featured')}
                aria-sort={sortBy === 'featured' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                {t.adminFeaturedShort}{sortIndicator('featured')}
              </th>
              {hasViewCount && (
                <th style={{ ...s.th, width: 70 }}>{t.adminViewCountLabel}</th>
              )}
              <th
                style={{ ...s.th, width: 110, ...sortableHeaderStyle }}
                onClick={() => handleSort('author')}
                aria-sort={sortBy === 'author' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                {t.adminAuthorLabel}{sortIndicator('author')}
              </th>
              <th
                style={{ ...s.th, width: 160, whiteSpace: 'nowrap', ...sortableHeaderStyle }}
                onClick={() => handleSort('createdAt')}
                aria-sort={sortBy === 'createdAt' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                {t.adminMetaCreatedAt}{sortIndicator('createdAt')}
              </th>
              <th
                style={{ ...s.th, width: 160, whiteSpace: 'nowrap', ...sortableHeaderStyle }}
                onClick={() => handleSort('updatedAt')}
                aria-sort={sortBy === 'updatedAt' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                {t.adminMetaUpdatedAt}{sortIndicator('updatedAt')}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={colCount} style={{ ...s.td, textAlign: 'center', color: 'var(--blog-admin-text-muted)' }}>
                  {t.adminLoading}
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={colCount} style={{ ...s.td, textAlign: 'center', color: 'var(--blog-admin-text-dim)' }}>
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
                <td style={{ ...s.td, textAlign: 'center' }}>
                  <Badge style={{ backgroundColor: 'rgba(74,144,217,0.1)', color: 'var(--blog-admin-accent)', fontSize: 11 }}>
                    {categories[item.category]?.label || item.category}
                  </Badge>
                </td>
                <td
                  style={{ ...s.td, textAlign: 'center', whiteSpace: 'nowrap' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <ToggleSwitch
                    on={item.published}
                    onToggle={() => patchField(item.id, 'published', !item.published)}
                    title={item.published ? t.adminPublishedLabel : t.adminUnpublishedLabel}
                  />
                </td>
                <td
                  style={{ ...s.td, textAlign: 'center', whiteSpace: 'nowrap' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <ToggleSwitch
                    on={item.featured}
                    onToggle={() => patchField(item.id, 'featured', !item.featured)}
                    title={t.adminFeaturedShort}
                  />
                </td>
                {hasViewCount && (
                  <td style={{ ...s.td, textAlign: 'center', fontSize: 12, color: 'var(--blog-admin-text-dim)' }}>
                    {item.viewCount !== undefined ? item.viewCount.toLocaleString() : '-'}
                  </td>
                )}
                <td style={{ ...s.td, textAlign: 'center', fontSize: 12, color: 'var(--blog-admin-text-dim)' }}>
                  {item.author?.name || item.author?.email || '-'}
                </td>
                <td style={{ ...s.td, textAlign: 'center', fontSize: 12, color: 'var(--blog-admin-text-dim)', whiteSpace: 'nowrap' }}>
                  {fmtDate(item.createdAt)}
                </td>
                <td style={{ ...s.td, textAlign: 'center', fontSize: 12, color: 'var(--blog-admin-text-dim)', whiteSpace: 'nowrap' }}>
                  {fmtDate(item.updatedAt)}
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
                  <span key={`gap-${p}`} style={{ color: 'var(--blog-admin-text-dim)', padding: '0 4px' }}>...</span>
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
        <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: 'var(--blog-admin-text-dim)' }}>
          {total}{t.adminCountSuffix}
        </div>
      )}
    </div>
  );
}
