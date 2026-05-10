'use client';

/**
 * 관리자 대시보드 컴포넌트
 *
 * 전체 글 수, 공개/비공개/추천 글 수, 카테고리별 글 수,
 * 최근 작성 글 목록을 표시한다.
 */

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import type { DashboardStats, BlogListItem } from '../../types/blog';
import type { BlogDashboardProps } from './types';
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

const ds = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 12,
    marginBottom: 24,
  } as CSSProperties,

  section: {
    marginBottom: 24,
  } as CSSProperties,

  sectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--blog-text)',
    marginBottom: 12,
  } as CSSProperties,

  catRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    borderBottom: '1px solid var(--blog-border)',
    fontSize: 13,
  } as CSSProperties,

  catLabel: {
    color: 'var(--blog-text)',
  } as CSSProperties,

  catCount: {
    color: 'var(--blog-accent)',
    fontWeight: 600,
    fontSize: 14,
  } as CSSProperties,

  recentItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    borderBottom: '1px solid var(--blog-border)',
    fontSize: 13,
    cursor: 'pointer',
  } as CSSProperties,

  recentTitle: {
    color: 'var(--blog-text)',
    flex: 1,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    whiteSpace: 'nowrap' as const,
  } as CSSProperties,

  recentDate: {
    color: 'var(--blog-text-dim)',
    fontSize: 12,
    marginLeft: 12,
    flexShrink: 0,
  } as CSSProperties,

  loading: {
    padding: 40,
    textAlign: 'center' as const,
    color: 'var(--blog-text-muted)',
  } as CSSProperties,

  error: {
    padding: 16,
    color: 'var(--blog-danger)',
    textAlign: 'center' as const,
  } as CSSProperties,
};

/** 날짜를 YYYY.MM.DD 형식으로 포맷 */
function fmtDate(v: string | Date | null | undefined): string {
  if (!v) return '-';
  const d = new Date(v as string);
  if (isNaN(d.getTime())) return '-';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function BlogDashboard({
  adminApiBasePath,
  authHeaders,
  categories,
  i18n,
  onNavigate,
}: BlogDashboardProps) {
  const t = resolveI18n(i18n);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`${adminApiBasePath}/dashboard`, authHeaders);
      if (!res.ok) throw new Error(t.adminUnknownError);
      const json = await res.json();
      const data = (json as Record<string, unknown>)?.data ?? json;
      setStats(data as DashboardStats);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.adminUnknownError);
    } finally {
      setLoading(false);
    }
  }, [adminApiBasePath, authHeaders, t.adminUnknownError]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  if (loading) {
    return <div style={ds.loading}>{t.adminLoading}</div>;
  }

  if (error) {
    return <div style={ds.error}>{error}</div>;
  }

  if (!stats) {
    return <div style={ds.loading}>{t.dashboardNoData}</div>;
  }

  const statCards: Array<{
    label: string;
    value: number;
    onClick?: () => void;
  }> = [
    {
      label: t.dashboardTotal,
      value: stats.total,
      onClick: () => onNavigate?.({}),
    },
    {
      label: t.dashboardPublished,
      value: stats.published,
      onClick: () => onNavigate?.({ published: true }),
    },
    {
      label: t.dashboardUnpublished,
      value: stats.unpublished,
      onClick: () => onNavigate?.({ published: false }),
    },
    {
      label: t.dashboardFeatured,
      value: stats.featured,
      onClick: () => onNavigate?.({ featured: true }),
    },
  ];

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, color: 'var(--blog-text)' }}>
        {t.dashboardTitle}
      </h2>

      {/* 통계 카드 */}
      <div style={ds.grid}>
        {statCards.map((card) => (
          <div
            key={card.label}
            style={s.statCard}
            onClick={card.onClick}
            role="button"
            tabIndex={0}
          >
            <div style={s.statValue}>{card.value}</div>
            <div style={s.statLabel}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* 카테고리별 */}
      <div style={ds.section}>
        <h3 style={ds.sectionTitle}>{t.dashboardByCategory}</h3>
        <div style={{ ...s.card, padding: 0 }}>
          {Object.entries(stats.byCategory).map(([cat, count]) => (
            <div
              key={cat}
              style={ds.catRow}
              onClick={() => onNavigate?.({ category: cat })}
              role="button"
              tabIndex={0}
            >
              <span style={ds.catLabel}>
                {categories[cat]?.label || cat}
              </span>
              <span style={ds.catCount}>{count}</span>
            </div>
          ))}
          {Object.keys(stats.byCategory).length === 0 && (
            <div style={{ ...ds.catRow, color: 'var(--blog-text-dim)' }}>
              {t.dashboardNoData}
            </div>
          )}
        </div>
      </div>

      {/* 최근 글 */}
      <div style={ds.section}>
        <h3 style={ds.sectionTitle}>{t.dashboardRecentPosts}</h3>
        <div style={{ ...s.card, padding: 0 }}>
          {stats.recentPosts.map((post) => (
            <div key={post.id} style={ds.recentItem}>
              <span style={ds.recentTitle}>{post.title}</span>
              <span style={ds.recentDate}>
                {fmtDate(post.createdAt as string)}
              </span>
            </div>
          ))}
          {stats.recentPosts.length === 0 && (
            <div style={{ ...ds.catRow, color: 'var(--blog-text-dim)' }}>
              {t.dashboardNoData}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
