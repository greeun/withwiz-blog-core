/**
 * BlogEditForm 내부 헬퍼/스타일
 *
 * BlogEditForm.tsx에서 분리된 순수 fetch 래퍼, 빈 폼 팩토리, 허용 이미지
 * 타입, 스타일 객체다. 동작은 불변이며 가독성을 위해 분리했다. (내부 전용)
 */
import type { CSSProperties } from 'react';
import type { BlogFormData, SlugStatus } from './types';

/** fetch 래퍼 */
export function apiFetch(
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

// ── 빈 폼 팩토리 ──

export function createEmptyForm(categories: Record<string, unknown>): BlogFormData {
  const firstCategory = Object.keys(categories)[0] || '';
  return {
    title: '',
    slug: '',
    category: firstCategory,
    content: '',
    editorType: 'block',
    excerpt: '',
    coverImageUrl: '',
    coverImageKey: '',
    attachments: [],
    featured: false,
    published: false,
    publishedAt: '',
    tagIds: [],
    ctaEnabled: false,
    ctaMsg: '',
    ctaBtn: '',
    ctaUrl: '',
  };
}

// ── 허용 이미지 타입 ──
export const ALLOWED_IMG_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// ── 스타일 ──

export const ef = {
  form: {
    maxWidth: 800,
  } as CSSProperties,

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  } as CSSProperties,

  slugRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  } as CSSProperties,

  slugStatus: (status: SlugStatus): CSSProperties => {
    const colors: Record<SlugStatus, string> = {
      idle: 'var(--blog-admin-text-dim)',
      checking: 'var(--blog-admin-warning)',
      available: 'var(--blog-admin-success)',
      duplicate: 'var(--blog-admin-danger)',
      invalid: 'var(--blog-admin-danger)',
    };
    return { fontSize: 11, color: colors[status], marginTop: 4 };
  },

  twoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
  } as CSSProperties,

  coverPreview: {
    maxWidth: '100%',
    maxHeight: 200,
    objectFit: 'cover' as const,
    borderRadius: 'var(--blog-admin-radius-sm)',
    marginTop: 8,
  } as CSSProperties,

  attachList: {
    marginTop: 8,
  } as CSSProperties,

  attachItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 0',
    fontSize: 13,
    borderBottom: '1px solid var(--blog-admin-border)',
  } as CSSProperties,

  attachRemove: {
    background: 'none',
    border: 'none',
    color: 'var(--blog-admin-danger)',
    cursor: 'pointer',
    padding: '2px 6px',
    fontSize: 14,
    fontFamily: 'var(--blog-admin-font)',
  } as CSSProperties,

  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid var(--blog-admin-border)',
  } as CSSProperties,

  toggleLabel: {
    fontSize: 13,
    color: 'var(--blog-admin-text)',
  } as CSSProperties,

  ctaSection: {
    padding: 16,
    backgroundColor: 'var(--blog-admin-bg-card)',
    borderRadius: 'var(--blog-admin-radius-sm)',
    border: '1px solid var(--blog-admin-border)',
  } as CSSProperties,

  footer: {
    display: 'flex',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 24,
    paddingTop: 16,
    borderTop: '1px solid var(--blog-admin-border)',
  } as CSSProperties,

  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--blog-admin-text-muted)',
    marginBottom: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  } as CSSProperties,

  sectionTag: {
    fontSize: 10,
    fontWeight: 400,
    color: 'var(--blog-admin-text-dim)',
    padding: '1px 6px',
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 3,
  } as CSSProperties,

  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  } as CSSProperties,

  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  } as CSSProperties,

  toggleInlineRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  } as CSSProperties,

  toggleInlineLabel: {
    fontSize: 12,
    color: 'var(--blog-admin-text-muted)',
    whiteSpace: 'nowrap' as const,
  } as CSSProperties,

  catTabs: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 16,
  } as CSSProperties,

  catTab: (active: boolean): CSSProperties => ({
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    fontFamily: 'var(--blog-admin-font)',
    borderRadius: 'var(--blog-admin-radius-sm)',
    border: active ? '1px solid var(--blog-admin-accent)' : '1px solid var(--blog-admin-border)',
    backgroundColor: active ? 'rgba(74,144,217,0.12)' : 'transparent',
    color: active ? 'var(--blog-admin-accent)' : 'var(--blog-admin-text-muted)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  }),

  slugBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 10px',
    backgroundColor: 'var(--blog-admin-bg-card)',
    border: '1px solid var(--blog-admin-border)',
    borderRadius: 'var(--blog-admin-radius-sm)',
    marginBottom: 16,
    fontSize: 12,
  } as CSSProperties,

  slugPrefix: {
    color: 'var(--blog-admin-text-dim)',
    fontSize: 12,
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  } as CSSProperties,

  slugInput: {
    border: 'none',
    background: 'none',
    fontSize: 12,
    color: 'var(--blog-admin-text)',
    outline: 'none',
    flex: 1,
    minWidth: 100,
    fontFamily: 'var(--blog-admin-font)',
    padding: '2px 0',
  } as CSSProperties,

  titleInput: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: 'var(--blog-admin-bg-input)',
    color: 'var(--blog-admin-text)',
    border: '1px solid var(--blog-admin-border)',
    borderRadius: 'var(--blog-admin-radius-sm)',
    fontSize: 16,
    fontWeight: 600,
    outline: 'none',
    boxSizing: 'border-box' as const,
    fontFamily: 'var(--blog-admin-font)',
  } as CSSProperties,
};
