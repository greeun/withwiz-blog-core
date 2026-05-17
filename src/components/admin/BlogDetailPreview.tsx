'use client';

/**
 * 블로그 상세 미리보기 컴포넌트
 *
 * 편집 폼의 데이터를 상세 페이지처럼 미리보기한다.
 * 공개 UI 컴포넌트(Sprint 6)에 의존하지 않고 자체 렌더링한다.
 */

import { type CSSProperties } from 'react';
import type { BlogDetailPreviewProps } from './types';
import { resolveI18n } from '../../i18n';
import { formatFileSize, getFileIcon } from '../../utils/file-helpers';
import { s } from './styles';

// ── 스타일 ──

const ps = {
  container: {
    backgroundColor: 'var(--blog-admin-bg)',
    borderRadius: 'var(--blog-admin-radius)',
    overflow: 'hidden',
  } as CSSProperties,

  hero: {
    width: '100%',
    maxHeight: 300,
    objectFit: 'cover' as const,
    display: 'block',
    marginBottom: 0,
  } as CSSProperties,

  body: {
    padding: '32px 24px',
  } as CSSProperties,

  category: {
    display: 'inline-block',
    padding: '4px 10px',
    fontSize: 11,
    letterSpacing: '1.5px',
    textTransform: 'uppercase' as const,
    color: '#fff',
    fontWeight: 500,
    marginBottom: 12,
  } as CSSProperties,

  title: {
    fontSize: 28,
    fontWeight: 700,
    color: 'var(--blog-admin-text)',
    marginBottom: 8,
    lineHeight: 1.5,
  } as CSSProperties,

  excerpt: {
    fontSize: 15,
    color: 'var(--blog-admin-text-muted)',
    marginBottom: 0,
    lineHeight: 1.6,
  } as CSSProperties,

  divider: {
    width: 32,
    height: 2,
    marginTop: 20,
    marginBottom: 24,
  } as CSSProperties,

  content: {
    fontSize: 14,
    lineHeight: 1.8,
    color: 'var(--blog-admin-text)',
    wordBreak: 'break-word' as const,
  } as CSSProperties,

  attachments: {
    marginTop: 24,
    padding: 16,
    backgroundColor: 'var(--blog-admin-bg-card)',
    borderRadius: 'var(--blog-admin-radius-sm)',
    border: '1px solid var(--blog-admin-border)',
  } as CSSProperties,

  attachItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 0',
    fontSize: 13,
    color: 'var(--blog-admin-text)',
  } as CSSProperties,

  cta: {
    marginTop: 24,
    padding: 20,
    textAlign: 'center' as const,
    borderRadius: 'var(--blog-admin-radius)',
    border: '1px solid var(--blog-admin-accent)',
    backgroundColor: 'rgba(74,144,217,0.05)',
  } as CSSProperties,

  ctaMsg: {
    fontSize: 14,
    color: 'var(--blog-admin-text)',
    marginBottom: 12,
  } as CSSProperties,

  ctaBtn: {
    display: 'inline-block',
    padding: '10px 24px',
    backgroundColor: 'var(--blog-admin-accent)',
    color: '#000',
    borderRadius: 'var(--blog-admin-radius-sm)',
    fontWeight: 600,
    fontSize: 14,
    textDecoration: 'none',
  } as CSSProperties,

  empty: {
    padding: 60,
    textAlign: 'center' as const,
    color: 'var(--blog-admin-text-dim)',
    fontSize: 13,
  } as CSSProperties,
};

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
        <span style={{ ...ps.category, backgroundColor: categories[form.category]?.main || 'var(--blog-admin-accent)' }}>{categoryLabel}</span>

        {/* 제목 */}
        <h1 style={ps.title}>{form.title || t.adminItemNoTitle}</h1>

        {/* 요약 */}
        {form.excerpt && <p style={ps.excerpt}>{form.excerpt}</p>}

        {/* 구분선 */}
        <div style={{ ...ps.divider, backgroundColor: categories[form.category]?.main || 'var(--blog-admin-accent)' }} />

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
                <span style={{ color: 'var(--blog-admin-text-dim)', fontSize: 12 }}>
                  {formatFileSize(a.size)}
                </span>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
