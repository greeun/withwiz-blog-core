'use client';

/**
 * 블로그 상세 미리보기 컴포넌트
 *
 * 편집 폼의 데이터를 상세 페이지처럼 미리보기한다.
 * 공개 UI 컴포넌트(Sprint 6)에 의존하지 않고 자체 렌더링한다.
 */

import { useMemo, type CSSProperties } from 'react';
import type { BlogDetailPreviewProps } from './types';
import { resolveI18n } from '../../i18n';
import { formatFileSize, getFileIcon } from '../../utils/file-helpers';
import { s } from './styles';

// ── 스타일 ──

const ps = {
  container: {
    backgroundColor: 'var(--blog-bg)',
    borderRadius: 'var(--blog-radius)',
    overflow: 'hidden',
  } as CSSProperties,

  hero: {
    width: '100%',
    maxHeight: 300,
    objectFit: 'cover' as const,
    display: 'block',
    borderBottom: '1px solid var(--blog-border)',
  } as CSSProperties,

  body: {
    padding: 24,
  } as CSSProperties,

  category: {
    ...s.badge,
    backgroundColor: 'rgba(212,175,55,0.15)',
    color: 'var(--blog-accent)',
    marginBottom: 12,
    display: 'inline-block',
  } as CSSProperties,

  title: {
    fontSize: 24,
    fontWeight: 700,
    color: 'var(--blog-text)',
    marginBottom: 8,
    lineHeight: 1.3,
  } as CSSProperties,

  excerpt: {
    fontSize: 14,
    color: 'var(--blog-text-muted)',
    marginBottom: 16,
    lineHeight: 1.5,
  } as CSSProperties,

  meta: {
    fontSize: 12,
    color: 'var(--blog-text-dim)',
    marginBottom: 20,
    display: 'flex',
    gap: 12,
  } as CSSProperties,

  content: {
    fontSize: 14,
    lineHeight: 1.8,
    color: 'var(--blog-text)',
    wordBreak: 'break-word' as const,
  } as CSSProperties,

  attachments: {
    marginTop: 24,
    padding: 16,
    backgroundColor: 'var(--blog-bg-card)',
    borderRadius: 'var(--blog-radius-sm)',
    border: '1px solid var(--blog-border)',
  } as CSSProperties,

  attachItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 0',
    fontSize: 13,
    color: 'var(--blog-text)',
  } as CSSProperties,

  cta: {
    marginTop: 24,
    padding: 20,
    textAlign: 'center' as const,
    borderRadius: 'var(--blog-radius)',
    border: '1px solid var(--blog-accent)',
    backgroundColor: 'rgba(212,175,55,0.05)',
  } as CSSProperties,

  ctaMsg: {
    fontSize: 14,
    color: 'var(--blog-text)',
    marginBottom: 12,
  } as CSSProperties,

  ctaBtn: {
    display: 'inline-block',
    padding: '10px 24px',
    backgroundColor: 'var(--blog-accent)',
    color: '#000',
    borderRadius: 'var(--blog-radius-sm)',
    fontWeight: 600,
    fontSize: 14,
    textDecoration: 'none',
  } as CSSProperties,

  navRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 24,
    padding: '12px 0',
    borderTop: '1px solid var(--blog-border)',
    fontSize: 13,
    color: 'var(--blog-text-dim)',
  } as CSSProperties,

  empty: {
    padding: 60,
    textAlign: 'center' as const,
    color: 'var(--blog-text-dim)',
    fontSize: 13,
  } as CSSProperties,
};

/** 날짜 포맷 */
function fmtDate(v: string | null): string {
  if (!v) return '-';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '-';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function BlogDetailPreview({
  form,
  categories,
  basePath,
  i18n,
}: BlogDetailPreviewProps) {
  const t = resolveI18n(i18n);

  const categoryLabel = categories[form.category]?.label || form.category;

  return (
    <div style={ps.container}>
      {/* 대표 이미지 */}
      {form.coverImageUrl && (
        <img
          src={form.coverImageUrl}
          alt={form.title || t.adminItemNoTitle}
          style={ps.hero}
        />
      )}

      <div style={ps.body}>
        {/* 카테고리 */}
        <span style={ps.category}>{categoryLabel}</span>

        {/* 제목 */}
        <h1 style={ps.title}>{form.title || t.adminItemNoTitle}</h1>

        {/* 요약 */}
        {form.excerpt && <p style={ps.excerpt}>{form.excerpt}</p>}

        {/* 메타 */}
        <div style={ps.meta}>
          <span>{fmtDate(form.publishedAt || null)}</span>
          {form.featured && (
            <span style={{ color: 'var(--blog-accent)' }}>{t.adminFeaturedLabel}</span>
          )}
          {form.published ? (
            <span style={{ color: 'var(--blog-success)' }}>{t.adminPublishedLabel}</span>
          ) : (
            <span>{t.adminUnpublishedLabel}</span>
          )}
        </div>

        {/* 본문 */}
        <div
          style={ps.content}
          dangerouslySetInnerHTML={{ __html: form.content || '' }}
        />

        {/* CTA */}
        {form.ctaEnabled && form.ctaBtn && (
          <div style={ps.cta}>
            {form.ctaMsg && <p style={ps.ctaMsg}>{form.ctaMsg}</p>}
            <a href={form.ctaUrl || '#'} style={ps.ctaBtn}>
              {form.ctaBtn}
            </a>
          </div>
        )}

        {/* 첨부파일 */}
        {form.attachments.length > 0 && (
          <div style={ps.attachments}>
            <div style={{ ...s.label, marginBottom: 8 }}>{t.publicAttachmentsLabel}</div>
            {form.attachments.map((a, i) => (
              <div key={i} style={ps.attachItem}>
                <span>{getFileIcon(a.type)}</span>
                <span style={{ flex: 1 }}>{a.name}</span>
                <span style={{ color: 'var(--blog-text-dim)', fontSize: 12 }}>
                  {formatFileSize(a.size)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 이전/다음 네비게이션 (더미) */}
        <div style={ps.navRow}>
          <span>{t.publicPrevPost}</span>
          <span>{t.publicNextPost}</span>
        </div>
      </div>
    </div>
  );
}
