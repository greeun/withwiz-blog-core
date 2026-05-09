/**
 * 댓글 모더레이션 패널 (관리자)
 *
 * 상태별 필터, 일괄 승인/거부/삭제, 대기 중 카운트 배지를 제공한다.
 * 데이터 로딩은 apiBasePath에 POST/GET 호출로 수행한다.
 */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Comment, CommentStatus } from "../../types/comment";
import type { PaginatedResult } from "../../types/common";
import type { BlogI18nStrings } from "../../types/blog";
import { resolveI18n } from "../../i18n";

interface CommentModerationPanelProps {
  /** 댓글 관리 API 베이스 경로 (예: "/api/admin/blog/comments") */
  apiBasePath: string;
  /** 페이지당 기본 개수 (default: 20) */
  defaultLimit?: number;
  /** 추가 CSS 클래스 */
  className?: string;
  /** i18n 오버라이드 (선택) — 미제공 시 한국어 기본값 사용 */
  i18n?: BlogI18nStrings;
}

/** 댓글 모더레이션 패널 */
export default function CommentModerationPanel({
  apiBasePath,
  defaultLimit = 20,
  className,
  i18n,
}: CommentModerationPanelProps) {
  const t = resolveI18n(i18n);
  const STATUS_OPTIONS: Array<{ value: CommentStatus | "ALL"; label: string }> = [
    { value: "ALL", label: t.moderationAll },
    { value: "PENDING", label: t.moderationPending },
    { value: "APPROVED", label: t.moderationApproved },
    { value: "REJECTED", label: t.moderationRejected },
    { value: "SPAM", label: t.moderationSpam },
  ];
  const [status, setStatus] = useState<CommentStatus | "ALL">("PENDING");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaginatedResult<Comment> | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const limit = defaultLimit;

  const fetchList = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (status !== "ALL") params.set("status", status);

      const res = await fetch(`${apiBasePath}?${params.toString()}`, {
        method: "GET",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(t.moderationLoadError);
      const json = (await res.json()) as PaginatedResult<Comment>;
      setData(json);
      setSelected(new Set());
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t.errorUnknown);
    } finally {
      setLoading(false);
    }
  }, [apiBasePath, limit, page, status, t]);

  const fetchPendingCount = useCallback(async () => {
    try {
      const res = await fetch(`${apiBasePath}/pending-count`, {
        method: "GET",
        credentials: "same-origin",
      });
      if (!res.ok) return;
      const json = (await res.json()) as { count: number };
      setPendingCount(json.count ?? 0);
    } catch {
      // 카운트는 조용히 실패 허용
    }
  }, [apiBasePath]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  useEffect(() => {
    void fetchPendingCount();
  }, [fetchPendingCount]);

  const allIds = useMemo(() => data?.items.map((c) => c.id) ?? [], [data]);

  const toggleAll = useCallback(
    (checked: boolean) => {
      setSelected(checked ? new Set(allIds) : new Set());
    },
    [allIds],
  );

  const toggleOne = useCallback((id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const bulkUpdate = useCallback(
    async (nextStatus: CommentStatus) => {
      if (selected.size === 0) return;
      setLoading(true);
      setErrorMessage(null);
      try {
        const res = await fetch(`${apiBasePath}/bulk-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ ids: [...selected], status: nextStatus }),
        });
        if (!res.ok) throw new Error(t.moderationLoadError);
        await fetchList();
        await fetchPendingCount();
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : t.errorUnknown);
      } finally {
        setLoading(false);
      }
    },
    [apiBasePath, fetchList, fetchPendingCount, selected, t],
  );

  const bulkDelete = useCallback(async () => {
    if (selected.size === 0) return;
    if (!confirm(t.moderationBulkDeleteConfirm)) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`${apiBasePath}/bulk-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ ids: [...selected] }),
      });
      if (!res.ok) throw new Error(t.moderationLoadError);
      await fetchList();
      await fetchPendingCount();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t.errorUnknown);
    } finally {
      setLoading(false);
    }
  }, [apiBasePath, fetchList, fetchPendingCount, selected, t]);

  const base = "blog-comment-moderation";
  const classes = className ? `${base} ${className}` : base;

  return (
    <section className={classes}>
      <header className="blog-comment-moderation-header">
        <h2>{t.moderationTitle}</h2>
        <span
          className="blog-comment-pending-badge"
          data-count={pendingCount}
          aria-label={`${t.moderationPending} ${pendingCount}`}
        >
          {t.moderationPending} {pendingCount}
        </span>
      </header>

      <div className="blog-comment-moderation-filter">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={
              status === opt.value
                ? "blog-comment-filter-btn is-active"
                : "blog-comment-filter-btn"
            }
            onClick={() => {
              setStatus(opt.value);
              setPage(1);
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="blog-comment-moderation-actions">
        <button
          type="button"
          onClick={() => bulkUpdate("APPROVED")}
          disabled={selected.size === 0 || loading}
        >
          {t.moderationBulkApprove}
        </button>
        <button
          type="button"
          onClick={() => bulkUpdate("REJECTED")}
          disabled={selected.size === 0 || loading}
        >
          {t.moderationBulkReject}
        </button>
        <button
          type="button"
          onClick={() => bulkUpdate("SPAM")}
          disabled={selected.size === 0 || loading}
        >
          {t.moderationBulkSpam}
        </button>
        <button
          type="button"
          onClick={bulkDelete}
          disabled={selected.size === 0 || loading}
        >
          {t.moderationBulkDelete}
        </button>
      </div>

      {errorMessage && (
        <p className="blog-comment-error" role="alert">
          {errorMessage}
        </p>
      )}

      <table className="blog-comment-moderation-table">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                aria-label={t.adminSelectAll}
                checked={selected.size > 0 && selected.size === allIds.length}
                onChange={(e) => toggleAll(e.target.checked)}
              />
            </th>
            <th>{t.commentFormNameLabel}</th>
            <th>{t.commentFormContentLabel}</th>
            <th>{t.adminPublishedLabel}</th>
            <th>{t.adminMetaCreatedAt}</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={5}>{t.adminLoading}</td>
            </tr>
          )}
          {!loading && data && data.items.length === 0 && (
            <tr>
              <td colSpan={5}>{t.moderationEmpty}</td>
            </tr>
          )}
          {data?.items.map((c) => (
            <tr key={c.id} data-comment-id={c.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selected.has(c.id)}
                  onChange={(e) => toggleOne(c.id, e.target.checked)}
                  aria-label={c.id}
                />
              </td>
              <td>{c.authorName ?? c.guestName ?? (c.authorId ? t.commentMemberLabel : t.commentGuestLabel)}</td>
              <td className="blog-comment-content-cell">{c.content}</td>
              <td>{c.status}</td>
              <td>
                {typeof c.createdAt === "string"
                  ? new Date(c.createdAt).toLocaleString("ko-KR")
                  : c.createdAt.toLocaleString("ko-KR")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {data && data.pagination.totalPages > 1 && (
        <div className="blog-comment-moderation-pagination">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
          >
            {t.publicPrevPage}
          </button>
          <span>
            {page} / {data.pagination.totalPages}
          </span>
          <button
            type="button"
            onClick={() =>
              setPage((p) => Math.min(data.pagination.totalPages, p + 1))
            }
            disabled={page >= data.pagination.totalPages || loading}
          >
            {t.publicNextPage}
          </button>
        </div>
      )}
    </section>
  );
}

export { CommentModerationPanel };
