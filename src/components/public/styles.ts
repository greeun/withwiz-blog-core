/**
 * 공개 UI 인라인 스타일 정의
 *
 * CSS 변수(`--blog-public-*`)를 사용하여 호스트가 자유롭게 오버라이드 가능하다.
 * 전역 CSS 오염 없이 component-scoped styling을 구현한다.
 */
import type { CSSProperties } from 'react';

// ── CSS 변수 기본값 (호스트 오버라이드 가능) ──

export const PUBLIC_CSS_VAR_DEFAULTS: Record<string, string> = {
  '--blog-public-bg': '#ffffff',
  '--blog-public-bg-card': '#f9f9f9',
  '--blog-public-bg-hover': '#f0f0f0',
  '--blog-public-text': '#1a1a1a',
  '--blog-public-text-muted': '#6b7280',
  '--blog-public-text-dim': '#9ca3af',
  '--blog-public-border': '#e5e7eb',
  '--blog-public-accent': '#2563eb',
  '--blog-public-accent-hover': '#1d4ed8',
  '--blog-public-danger': '#ef4444',
  '--blog-public-success': '#22c55e',
  '--blog-public-radius': '8px',
  '--blog-public-radius-sm': '4px',
  '--blog-public-font': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  '--blog-public-font-size': '15px',
  '--blog-public-max-width': '1200px',
};

/** 루트 래퍼에 적용할 CSS 변수 스타일 */
export function publicRootVars(): CSSProperties {
  return PUBLIC_CSS_VAR_DEFAULTS as unknown as CSSProperties;
}

// ── 공통 스타일 ──

export const ps = {
  // -- 컨테이너 --
  container: {
    maxWidth: 'var(--blog-public-max-width)',
    margin: '0 auto',
    padding: '0 16px',
    fontFamily: 'var(--blog-public-font)',
    color: 'var(--blog-public-text)',
    fontSize: 'var(--blog-public-font-size)',
    lineHeight: 1.6,
  } as CSSProperties,

  // -- 카테고리 탭 --
  categoryTabs: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 8,
    marginBottom: 24,
    borderBottom: '1px solid var(--blog-public-border)',
    paddingBottom: 12,
  } as CSSProperties,

  categoryTab: (active: boolean): CSSProperties => ({
    padding: '8px 16px',
    fontSize: 14,
    fontWeight: active ? 600 : 400,
    color: active ? 'var(--blog-public-accent)' : 'var(--blog-public-text-muted)',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: active ? '2px solid var(--blog-public-accent)' : '2px solid transparent',
    cursor: 'pointer',
    transition: 'color 0.15s, border-color 0.15s',
    textDecoration: 'none',
    fontFamily: 'var(--blog-public-font)',
    marginBottom: -13,
  }),

  // -- 카드 그리드 --
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 24,
    marginBottom: 32,
  } as CSSProperties,

  card: {
    display: 'block',
    textDecoration: 'none',
    color: 'inherit',
    borderRadius: 'var(--blog-public-radius)',
    overflow: 'hidden',
    border: '1px solid var(--blog-public-border)',
    backgroundColor: 'var(--blog-public-bg-card)',
    transition: 'box-shadow 0.2s, transform 0.2s',
  } as CSSProperties,

  cardImageWrap: {
    position: 'relative' as const,
    width: '100%',
    paddingTop: '56.25%', // 16:9
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
  } as CSSProperties,

  cardImage: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  } as CSSProperties,

  cardPlaceholder: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#e5e7eb',
  } as CSSProperties,

  cardBadge: (color?: string): CSSProperties => ({
    position: 'absolute',
    top: 8,
    left: 8,
    padding: '2px 10px',
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 12,
    backgroundColor: color || '#6b7280',
    color: '#fff',
  }),

  cardBody: {
    padding: 16,
  } as CSSProperties,

  cardMeta: {
    fontSize: 12,
    color: 'var(--blog-public-text-dim)',
    marginBottom: 6,
  } as CSSProperties,

  cardTitle: {
    fontSize: 16,
    fontWeight: 600,
    lineHeight: 1.4,
    margin: '0 0 8px',
    color: 'var(--blog-public-text)',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden',
  } as CSSProperties,

  cardExcerpt: {
    fontSize: 13,
    color: 'var(--blog-public-text-muted)',
    margin: 0,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden',
  } as CSSProperties,

  cardTags: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 4,
    marginTop: 8,
  } as CSSProperties,

  // -- 페이지네이션 --
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    marginTop: 24,
    marginBottom: 24,
  } as CSSProperties,

  pageBtn: (active: boolean): CSSProperties => ({
    padding: '6px 12px',
    fontSize: 14,
    border: '1px solid var(--blog-public-border)',
    borderRadius: 'var(--blog-public-radius-sm)',
    backgroundColor: active ? 'var(--blog-public-accent)' : 'transparent',
    color: active ? '#fff' : 'var(--blog-public-text)',
    cursor: 'pointer',
    textDecoration: 'none',
    fontFamily: 'var(--blog-public-font)',
    minWidth: 36,
    textAlign: 'center',
    transition: 'background-color 0.15s',
  }),

  pageText: {
    fontSize: 14,
    color: 'var(--blog-public-text-muted)',
    padding: '0 8px',
  } as CSSProperties,

  // -- 상세 페이지 --
  detailBack: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 14,
    color: 'var(--blog-public-text-muted)',
    textDecoration: 'none',
    marginBottom: 16,
    cursor: 'pointer',
  } as CSSProperties,

  detailArticle: {
    maxWidth: 800,
    margin: '0 auto',
    paddingBottom: 48,
  } as CSSProperties,

  detailHeader: {
    marginBottom: 24,
  } as CSSProperties,

  detailCategoryBadge: (color?: string): CSSProperties => ({
    display: 'inline-block',
    padding: '3px 12px',
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 12,
    backgroundColor: color || '#6b7280',
    color: '#fff',
    marginBottom: 8,
  }),

  detailTitle: {
    fontSize: 28,
    fontWeight: 700,
    lineHeight: 1.3,
    margin: '8px 0',
    color: 'var(--blog-public-text)',
  } as CSSProperties,

  detailExcerpt: {
    fontSize: 16,
    color: 'var(--blog-public-text-muted)',
    margin: '4px 0 0',
    lineHeight: 1.5,
  } as CSSProperties,

  detailMeta: {
    fontSize: 13,
    color: 'var(--blog-public-text-dim)',
    marginTop: 8,
  } as CSSProperties,

  detailCover: {
    width: '100%',
    borderRadius: 'var(--blog-public-radius)',
    marginBottom: 24,
    maxHeight: 500,
    objectFit: 'cover' as const,
  } as CSSProperties,

  detailContent: {
    lineHeight: 1.8,
    fontSize: 'var(--blog-public-font-size)',
    wordBreak: 'break-word' as const,
  } as CSSProperties,

  // -- 첨부파일 --
  attachmentsSection: {
    marginTop: 32,
    padding: 16,
    border: '1px solid var(--blog-public-border)',
    borderRadius: 'var(--blog-public-radius)',
    backgroundColor: 'var(--blog-public-bg-card)',
  } as CSSProperties,

  attachmentsLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--blog-public-text)',
    marginBottom: 12,
  } as CSSProperties,

  attachmentItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 0',
    borderBottom: '1px solid var(--blog-public-border)',
    textDecoration: 'none',
    color: 'var(--blog-public-text)',
    fontSize: 14,
    transition: 'color 0.15s',
  } as CSSProperties,

  attachmentIcon: {
    fontSize: 18,
    flexShrink: 0,
  } as CSSProperties,

  attachmentName: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  } as CSSProperties,

  attachmentSize: {
    fontSize: 12,
    color: 'var(--blog-public-text-dim)',
    flexShrink: 0,
  } as CSSProperties,

  // -- CTA 버튼 --
  ctaSection: {
    marginTop: 32,
    padding: 24,
    borderRadius: 'var(--blog-public-radius)',
    backgroundColor: 'var(--blog-public-bg-card)',
    border: '1px solid var(--blog-public-border)',
    textAlign: 'center' as const,
  } as CSSProperties,

  ctaMessage: {
    fontSize: 16,
    color: 'var(--blog-public-text)',
    marginBottom: 12,
    fontWeight: 500,
  } as CSSProperties,

  ctaButton: {
    display: 'inline-block',
    padding: '10px 24px',
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    backgroundColor: 'var(--blog-public-accent)',
    borderRadius: 'var(--blog-public-radius)',
    textDecoration: 'none',
    cursor: 'pointer',
    border: 'none',
    transition: 'background-color 0.15s',
  } as CSSProperties,

  // -- 네비게이션 (이전/다음) --
  navSection: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 48,
    paddingTop: 24,
    borderTop: '1px solid var(--blog-public-border)',
  } as CSSProperties,

  navItem: (align: 'left' | 'right'): CSSProperties => ({
    flex: 1,
    textAlign: align,
  }),

  navLabel: {
    fontSize: 12,
    color: 'var(--blog-public-text-dim)',
    marginBottom: 4,
  } as CSSProperties,

  navLink: {
    fontSize: 14,
    color: 'var(--blog-public-accent)',
    textDecoration: 'none',
    fontWeight: 500,
    lineHeight: 1.4,
    display: 'block',
  } as CSSProperties,

  // -- 댓글 --
  commentSection: {
    marginTop: 48,
    paddingTop: 24,
    borderTop: '1px solid var(--blog-public-border)',
  } as CSSProperties,

  commentItem: (depth: number): CSSProperties => ({
    marginLeft: depth > 0 ? depth * 24 : 0,
    paddingLeft: depth > 0 ? 16 : 0,
    borderLeft: depth > 0 ? '2px solid var(--blog-public-border)' : 'none',
    marginBottom: 16,
  }),

  commentHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  } as CSSProperties,

  commentAuthor: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--blog-public-text)',
  } as CSSProperties,

  commentDate: {
    fontSize: 12,
    color: 'var(--blog-public-text-dim)',
  } as CSSProperties,

  commentContent: {
    fontSize: 14,
    lineHeight: 1.6,
    color: 'var(--blog-public-text)',
    whiteSpace: 'pre-wrap' as const,
  } as CSSProperties,

  commentReplyBtn: {
    padding: '2px 8px',
    fontSize: 12,
    color: 'var(--blog-public-text-muted)',
    backgroundColor: 'transparent',
    border: '1px solid var(--blog-public-border)',
    borderRadius: 'var(--blog-public-radius-sm)',
    cursor: 'pointer',
    marginTop: 6,
    fontFamily: 'var(--blog-public-font)',
  } as CSSProperties,

  commentEmpty: {
    fontSize: 14,
    color: 'var(--blog-public-text-muted)',
    textAlign: 'center' as const,
    padding: 24,
  } as CSSProperties,

  // -- 댓글 폼 --
  commentForm: {
    marginTop: 16,
    padding: 16,
    border: '1px solid var(--blog-public-border)',
    borderRadius: 'var(--blog-public-radius)',
    backgroundColor: 'var(--blog-public-bg-card)',
  } as CSSProperties,

  formField: {
    marginBottom: 12,
  } as CSSProperties,

  formLabel: {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--blog-public-text)',
    marginBottom: 4,
  } as CSSProperties,

  formInput: {
    width: '100%',
    padding: '8px 12px',
    fontSize: 14,
    border: '1px solid var(--blog-public-border)',
    borderRadius: 'var(--blog-public-radius-sm)',
    backgroundColor: 'var(--blog-public-bg)',
    color: 'var(--blog-public-text)',
    outline: 'none',
    boxSizing: 'border-box' as const,
    fontFamily: 'var(--blog-public-font)',
    transition: 'border-color 0.15s',
  } as CSSProperties,

  formTextarea: {
    width: '100%',
    minHeight: 100,
    padding: '8px 12px',
    fontSize: 14,
    border: '1px solid var(--blog-public-border)',
    borderRadius: 'var(--blog-public-radius-sm)',
    backgroundColor: 'var(--blog-public-bg)',
    color: 'var(--blog-public-text)',
    outline: 'none',
    resize: 'vertical' as const,
    boxSizing: 'border-box' as const,
    fontFamily: 'var(--blog-public-font)',
    lineHeight: 1.6,
  } as CSSProperties,

  formSubmitBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 20px',
    fontSize: 14,
    fontWeight: 500,
    color: '#fff',
    backgroundColor: 'var(--blog-public-accent)',
    border: 'none',
    borderRadius: 'var(--blog-public-radius-sm)',
    cursor: 'pointer',
    fontFamily: 'var(--blog-public-font)',
    transition: 'background-color 0.15s, opacity 0.15s',
  } as CSSProperties,

  formDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    pointerEvents: 'none' as const,
  } as CSSProperties,

  formError: {
    fontSize: 13,
    color: 'var(--blog-public-danger)',
    marginTop: 4,
  } as CSSProperties,

  formSuccess: {
    fontSize: 14,
    color: 'var(--blog-public-success)',
    textAlign: 'center' as const,
    padding: 16,
  } as CSSProperties,

  formLoginRequired: {
    fontSize: 14,
    color: 'var(--blog-public-text-muted)',
    textAlign: 'center' as const,
    padding: 16,
  } as CSSProperties,

  // -- 태그 배지 --
  tagBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: 12,
    color: 'var(--blog-public-accent)',
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    borderRadius: 12,
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
    whiteSpace: 'nowrap' as const,
  } as CSSProperties,

  // -- 태그 클라우드 --
  tagCloud: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 8,
    padding: 16,
  } as CSSProperties,

  tagCloudItem: {
    color: 'var(--blog-public-accent)',
    textDecoration: 'none',
    padding: '4px 8px',
    borderRadius: 'var(--blog-public-radius-sm)',
    transition: 'background-color 0.15s',
    whiteSpace: 'nowrap' as const,
  } as CSSProperties,

  tagCloudEmpty: {
    fontSize: 14,
    color: 'var(--blog-public-text-muted)',
    textAlign: 'center' as const,
    padding: 16,
  } as CSSProperties,

  // -- 태그 칩 (목록 페이지 내 태그 행) --
  tagRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 6,
    marginBottom: 20,
  } as CSSProperties,

  tagChip: (active: boolean): CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    fontSize: 12,
    borderRadius: 14,
    textDecoration: 'none',
    border: `1px solid ${active ? 'var(--blog-public-accent)' : 'var(--blog-public-border)'}`,
    backgroundColor: active ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
    color: active ? 'var(--blog-public-accent)' : 'var(--blog-public-text-muted)',
    cursor: 'pointer',
    transition: 'background-color 0.15s, border-color 0.15s',
  }),

  tagChipCount: {
    fontSize: 10,
    opacity: 0.7,
  } as CSSProperties,

  // -- 빈 상태 --
  emptyState: {
    textAlign: 'center' as const,
    padding: '48px 16px',
    fontSize: 15,
    color: 'var(--blog-public-text-muted)',
  } as CSSProperties,
};
