'use client';

/**
 * 댓글 모더레이션 패널
 *
 * 상태별 필터, 일괄 승인/거부/스팸/삭제, 대기 중 카운트 배지를 제공한다.
 *
 * API 계약:
 *   GET    {adminApiBasePath}/comments?status=xxx&page=N&limit=N
 *   PATCH  {adminApiBasePath}/comments/{id}       body: { status }
 *   DELETE {adminApiBasePath}/comments/{id}
 *   PATCH  {adminApiBasePath}/comments/bulk        body: { ids, status }
 *   DELETE {adminApiBasePath}/comments/bulk        body: { ids }
 */

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { Comment, CommentStatus } from '../../types/comment';
import type { PaginatedResult } from '../../types/common';
import type { CommentModerationPanelProps } from './types';
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

const cs = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  } as CSSProperties,

  title: {
    fontSize: 18,
    fontWeight: 600,
    color: 'var(--blog-text)',
  } as CSSProperties,

  pendingBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 12px',
    borderRadius: 12,
    backgroundColor: 'rgba(245,158,11,0.15)',
    color: 'var(--blog-warning)',
    fontSize: 13,
    fontWeight: 600,
  } as CSSProperties,

  filterRow: {
    display: 'flex',
    gap: 4,
    marginBottom: 12,
    flexWrap: 'wrap' as const,
  } as CSSProperties,

  filterBtn: (active: boolean): CSSProperties => ({
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    border: `1px solid ${active ? 'var(--blog-accent)' : 'var(--blog-border)'}`,
    borderRadius: 'var(--blog-radius-sm)',
    backgroundColor: active ? 'rgba(212,175,55,0.1)' : 'transparent',
    color: active ? 'var(--blog-accent)' : 'var(--blog-text-muted)',
    cursor: 'pointer',
    fontFamily: 'var(--blog-font)',
    transition: 'all 0.15s',
  }),

  bulkRow: {
    display: 'flex',
    gap: 6,
    marginBottom: 12,
    flexWrap: 'wrap' as const,
  } as CSSProperties,

  commentContent: {
    maxWidth: 400,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    whiteSpace: 'nowrap' as const,
  } as CSSProperties,

  actionBtn: {
    ...s.btn,
    ...s.btnSmall,
    marginRight: 4,
  } as CSSProperties,

  empty: {
    padding: 40,
    textAlign: 'center' as const,
    color: 'var(--blog-text-dim)',
  } as CSSProperties,
};

export default function CommentModerationPanel({
  adminApiBasePath,
  authHeaders,
  defaultLimit = 20,
  i18n,
  className,
}: CommentModerationPanelProps) {
  const t = resolveI18n(i18n);

  const STATUS_OPTIONS: Array<{ value: CommentStatus | 'ALL'; label: string }> = [
    { value: 'ALL', label: t.moderationAll },
    { value: 'PENDING', label: t.moderationPending },
    { value: 'APPROVED', label: t.moderationApproved },
    { value: 'REJECTED', label: t.moderationRejected },
    { value: 'SPAM', label: t.moderationSpam },
  ];

  const [status, setStatus] = useState<CommentStatus | 'ALL'>('PENDING');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaginatedResult<Comment> | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const commentsPath = `${adminApiBasePath}/comments`;

  const fetchList = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(defaultLimit));
      if (status !== 'ALL') params.set('status', status);

      const res = await apiFetch(`${commentsPath}?${params}`, authHeaders);
      if (!res.ok) throw new Error(t.moderationLoadError);
      const json = await res.json();
      // { success, data: PaginatedResult } or PaginatedResult directly
      const result = (json as Record<string, unknown>)?.data ?? json;
      setData(result as PaginatedResult<Comment>);
      setSelected(new Set());
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t.errorUnknown);
    } finally {
      setLoading(false);
    }
  }, [commentsPath, authHeaders, page, status, defaultLimit, t]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  // pending count는 목록 로드와 동시에 갱신
  useEffect(() => {
    apiFetch(`${commentsPath}?status=PENDING&limit=1`, authHeaders)
      .then((r) => r.json())
      .then((json) => {
        const result = (json as Record<string, unknown>)?.data ?? json;
        const total = (result as PaginatedResult<Comment>)?.total ?? 0;
        setPendingCount(total);
      })
      .catch(() => { /* 무시 */ });
  }, [commentsPath, authHeaders, data]);

  const allIds = useMemo(() => data?.items.map((c) => c.id) ?? [], [data]);

  const toggleAll = useCallback((checked: boolean) => {
    setSelected(checked ? new Set(allIds) : new Set());
  }, [allIds]);

  const toggleOne = useCallback((id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }, []);

  const updateStatus = useCallback(async (id: string, nextStatus: CommentStatus) => {
    try {
      const res = await apiFetch(`${commentsPath}/${id}`, authHeaders, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error(t.moderationLoadError);
      await fetchList();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t.errorUnknown);
    }
  }, [commentsPath, authHeaders, fetchList, t]);

  const deleteOne = useCallback(async (id: string) => {
    if (!confirm(t.moderationDeleteConfirm)) return;
    try {
      const res = await apiFetch(`${commentsPath}/${id}`, authHeaders, { method: 'DELETE' });
      if (!res.ok) throw new Error(t.moderationLoadError);
      await fetchList();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t.errorUnknown);
    }
  }, [commentsPath, authHeaders, fetchList, t]);

  const bulkUpdate = useCallback(async (nextStatus: CommentStatus) => {
    if (selected.size === 0) return;
    setLoading(true);
    try {
      const res = await apiFetch(`${commentsPath}/bulk`, authHeaders, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...selected], status: nextStatus }),
      });
      if (!res.ok) throw new Error(t.moderationLoadError);
      await fetchList();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t.errorUnknown);
    } finally {
      setLoading(false);
    }
  }, [commentsPath, authHeaders, selected, fetchList, t]);

  const bulkDelete = useCallback(async () => {
    if (selected.size === 0) return;
    if (!confirm(t.moderationBulkDeleteConfirm)) return;
    setLoading(true);
    try {
      const res = await apiFetch(`${commentsPath}/bulk`, authHeaders, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...selected] }),
      });
      if (!res.ok) throw new Error(t.moderationLoadError);
      await fetchList();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t.errorUnknown);
    } finally {
      setLoading(false);
    }
  }, [commentsPath, authHeaders, selected, fetchList, t]);

  /** 날짜 포맷 */
  function fmtDate(v: string | Date): string {
    const d = new Date(v as string);
    return isNaN(d.getTime()) ? '-' : d.toLocaleString('ko-KR');
  }

  return (
    <section>
      {/* 헤더 */}
      <div style={cs.header}>
        <h2 style={cs.title}>{t.moderationTitle}</h2>
        {pendingCount > 0 && (
          <span style={cs.pendingBadge}>
            {t.moderationPending} {pendingCount}
          </span>
        )}
      </div>

      {/* 상태 필터 */}
      <div style={cs.filterRow}>
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            style={cs.filterBtn(status === opt.value)}
            onClick={() => { setStatus(opt.value); setPage(1); }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 일괄 작업 */}
      {selected.size > 0 && (
        <div style={cs.bulkRow}>
          <span style={{ fontSize: 12, color: 'var(--blog-text-muted)', alignSelf: 'center' }}>
            {selected.size}{t.adminBulkSelectedSuffix}
          </span>
          <button type="button" style={{ ...s.btn, ...s.btnSmall }} onClick={() => bulkUpdate('APPROVED')} disabled={loading}>
            {t.moderationBulkApprove}
          </button>
          <button type="button" style={{ ...s.btn, ...s.btnSmall }} onClick={() => bulkUpdate('REJECTED')} disabled={loading}>
            {t.moderationBulkReject}
          </button>
          <button type="button" style={{ ...s.btn, ...s.btnSmall }} onClick={() => bulkUpdate('SPAM')} disabled={loading}>
            {t.moderationBulkSpam}
          </button>
          <button type="button" style={{ ...s.btnDanger, ...s.btnSmall }} onClick={bulkDelete} disabled={loading}>
            {t.moderationBulkDelete}
          </button>
        </div>
      )}

      {/* 에러 */}
      {errorMessage && <p style={s.errorText} role="alert">{errorMessage}</p>}

      {/* 댓글 테이블 */}
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
              <th style={s.th}>{t.commentFormNameLabel}</th>
              <th style={s.th}>{t.commentFormContentLabel}</th>
              <th style={{ ...s.th, width: 100 }}>{t.adminPublishedLabel}</th>
              <th style={{ ...s.th, width: 150 }}>{t.adminMetaCreatedAt}</th>
              <th style={{ ...s.th, width: 200 }}>{''}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} style={{ ...s.td, textAlign: 'center', color: 'var(--blog-text-muted)' }}>
                  {t.adminLoading}
                </td>
              </tr>
            )}
            {!loading && data && data.items.length === 0 && (
              <tr>
                <td colSpan={6} style={{ ...s.td, textAlign: 'center', color: 'var(--blog-text-dim)' }}>
                  {t.moderationEmpty}
                </td>
              </tr>
            )}
            {!loading && data?.items.map((c) => (
              <tr key={c.id}>
                <td style={s.td}>
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={(e) => toggleOne(c.id, e.target.checked)}
                    aria-label={c.id}
                  />
                </td>
                <td style={s.td}>
                  {c.authorName ?? c.guestName ?? (c.authorId ? t.commentMemberLabel : t.commentGuestLabel)}
                </td>
                <td style={{ ...s.td, ...cs.commentContent }}>{c.content}</td>
                <td style={s.td}>
                  <span style={{ ...s.badge, ...s.badgeStatus(c.status) }}>
                    {c.status}
                  </span>
                </td>
                <td style={{ ...s.td, fontSize: 12, color: 'var(--blog-text-dim)' }}>
                  {fmtDate(c.createdAt)}
                </td>
                <td style={{ ...s.td, whiteSpace: 'nowrap' }}>
                  {c.status !== 'APPROVED' && (
                    <button type="button" style={cs.actionBtn} onClick={() => updateStatus(c.id, 'APPROVED')}>
                      {t.moderationApproveButton}
                    </button>
                  )}
                  {c.status !== 'REJECTED' && (
                    <button type="button" style={cs.actionBtn} onClick={() => updateStatus(c.id, 'REJECTED')}>
                      {t.moderationRejectButton}
                    </button>
                  )}
                  {c.status !== 'SPAM' && (
                    <button type="button" style={cs.actionBtn} onClick={() => updateStatus(c.id, 'SPAM')}>
                      {t.moderationSpamButton}
                    </button>
                  )}
                  <button type="button" style={{ ...s.btnDanger, ...s.btnSmall }} onClick={() => deleteOne(c.id)}>
                    {t.moderationDeleteButton}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {data && data.totalPages > 1 && (
        <div style={s.pagination}>
          <button
            type="button"
            style={s.pageBtn(false)}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
          >
            {t.publicPrevPage}
          </button>
          <span style={{ fontSize: 13, color: 'var(--blog-text-muted)', margin: '0 8px' }}>
            {page} / {data.totalPages}
          </span>
          <button
            type="button"
            style={s.pageBtn(false)}
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page >= data.totalPages || loading}
          >
            {t.publicNextPage}
          </button>
        </div>
      )}
    </section>
  );
}
