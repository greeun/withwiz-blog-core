/**
 * 관리자 UI 인라인 스타일 정의
 *
 * CSS 변수(`--blog-*`)를 사용하여 호스트가 자유롭게 오버라이드 가능하다.
 * 전역 CSS 오염 없이 component-scoped styling을 구현한다.
 */
import type { CSSProperties } from 'react';

// ── CSS 변수 기본값 (호스트 오버라이드 가능) ──

export const CSS_VAR_DEFAULTS: Record<string, string> = {
  '--blog-bg': '#0a0a0a',
  '--blog-bg-card': '#1a1a1a',
  '--blog-bg-input': '#141414',
  '--blog-bg-hover': '#252525',
  '--blog-bg-selected': '#1e2a3a',
  '--blog-text': '#e0e0e0',
  '--blog-text-muted': '#888',
  '--blog-text-dim': '#666',
  '--blog-border': '#333',
  '--blog-border-focus': '#555',
  '--blog-accent': '#D4AF37',
  '--blog-accent-hover': '#e5c048',
  '--blog-danger': '#ef4444',
  '--blog-danger-hover': '#dc2626',
  '--blog-success': '#22c55e',
  '--blog-warning': '#f59e0b',
  '--blog-info': '#3b82f6',
  '--blog-radius': '6px',
  '--blog-radius-sm': '4px',
  '--blog-font': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  '--blog-font-mono': '"SF Mono", "Fira Code", monospace',
};

/** 루트 래퍼에 적용할 CSS 변수 스타일 */
export function rootVars(): CSSProperties {
  return CSS_VAR_DEFAULTS as unknown as CSSProperties;
}

// ── 공통 스타일 ──

export const s = {
  // -- 레이아웃 --
  root: {
    fontFamily: 'var(--blog-font)',
    color: 'var(--blog-text)',
    backgroundColor: 'var(--blog-bg)',
    minHeight: '100%',
    fontSize: 14,
    lineHeight: 1.5,
  } as CSSProperties,

  // -- 카드/섹션 --
  card: {
    backgroundColor: 'var(--blog-bg-card)',
    border: '1px solid var(--blog-border)',
    borderRadius: 'var(--blog-radius)',
    padding: 16,
  } as CSSProperties,

  // -- 입력 --
  input: {
    width: '100%',
    padding: '8px 12px',
    backgroundColor: 'var(--blog-bg-input)',
    color: 'var(--blog-text)',
    border: '1px solid var(--blog-border)',
    borderRadius: 'var(--blog-radius-sm)',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box' as const,
    fontFamily: 'var(--blog-font)',
    transition: 'border-color 0.15s',
  } as CSSProperties,

  textarea: {
    width: '100%',
    minHeight: 300,
    padding: '12px',
    backgroundColor: 'var(--blog-bg-input)',
    color: 'var(--blog-text)',
    border: '1px solid var(--blog-border)',
    borderRadius: 'var(--blog-radius-sm)',
    fontSize: 14,
    fontFamily: 'var(--blog-font)',
    resize: 'vertical' as const,
    outline: 'none',
    boxSizing: 'border-box' as const,
    lineHeight: 1.6,
  } as CSSProperties,

  select: {
    padding: '8px 12px',
    backgroundColor: 'var(--blog-bg-input)',
    color: 'var(--blog-text)',
    border: '1px solid var(--blog-border)',
    borderRadius: 'var(--blog-radius-sm)',
    fontSize: 14,
    outline: 'none',
    cursor: 'pointer',
    fontFamily: 'var(--blog-font)',
  } as CSSProperties,

  // -- 버튼 --
  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 500,
    fontFamily: 'var(--blog-font)',
    borderRadius: 'var(--blog-radius-sm)',
    border: '1px solid var(--blog-border)',
    backgroundColor: 'var(--blog-bg-card)',
    color: 'var(--blog-text)',
    cursor: 'pointer',
    transition: 'background-color 0.15s, border-color 0.15s',
    whiteSpace: 'nowrap' as const,
  } as CSSProperties,

  btnPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'var(--blog-font)',
    borderRadius: 'var(--blog-radius-sm)',
    border: '1px solid var(--blog-accent)',
    backgroundColor: 'var(--blog-accent)',
    color: '#000',
    cursor: 'pointer',
    transition: 'background-color 0.15s, opacity 0.15s',
    whiteSpace: 'nowrap' as const,
  } as CSSProperties,

  btnDanger: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 500,
    fontFamily: 'var(--blog-font)',
    borderRadius: 'var(--blog-radius-sm)',
    border: '1px solid var(--blog-danger)',
    backgroundColor: 'transparent',
    color: 'var(--blog-danger)',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
    whiteSpace: 'nowrap' as const,
  } as CSSProperties,

  btnSmall: {
    padding: '4px 10px',
    fontSize: 12,
  } as CSSProperties,

  btnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    pointerEvents: 'none' as const,
  } as CSSProperties,

  // -- 테이블 --
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: 13,
  } as CSSProperties,

  th: {
    padding: '10px 12px',
    textAlign: 'left' as const,
    fontWeight: 600,
    color: 'var(--blog-text-muted)',
    borderBottom: '1px solid var(--blog-border)',
    fontSize: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  } as CSSProperties,

  td: {
    padding: '10px 12px',
    borderBottom: '1px solid var(--blog-border)',
    verticalAlign: 'middle' as const,
  } as CSSProperties,

  // -- 배지 --
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: 11,
    fontWeight: 500,
    borderRadius: 10,
    whiteSpace: 'nowrap' as const,
  } as CSSProperties,

  badgePublished: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    color: 'var(--blog-success)',
  } as CSSProperties,

  badgeDraft: {
    backgroundColor: 'rgba(136,136,136,0.15)',
    color: 'var(--blog-text-muted)',
  } as CSSProperties,

  badgeFeatured: {
    backgroundColor: 'rgba(212,175,55,0.15)',
    color: 'var(--blog-accent)',
  } as CSSProperties,

  badgeStatus: (status: string): CSSProperties => {
    switch (status) {
      case 'PENDING': return { backgroundColor: 'rgba(245,158,11,0.15)', color: 'var(--blog-warning)' };
      case 'APPROVED': return { backgroundColor: 'rgba(34,197,94,0.15)', color: 'var(--blog-success)' };
      case 'REJECTED': return { backgroundColor: 'rgba(239,68,68,0.15)', color: 'var(--blog-danger)' };
      case 'SPAM': return { backgroundColor: 'rgba(136,136,136,0.15)', color: 'var(--blog-text-muted)' };
      default: return {};
    }
  },

  // -- 라벨 --
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--blog-text-muted)',
    marginBottom: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  } as CSSProperties,

  // -- 토글 스위치 --
  toggle: {
    position: 'relative' as const,
    display: 'inline-block',
    width: 40,
    height: 22,
    cursor: 'pointer',
    flexShrink: 0,
  } as CSSProperties,

  toggleTrack: (active: boolean): CSSProperties => ({
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 11,
    backgroundColor: active ? 'var(--blog-accent)' : 'var(--blog-border)',
    transition: 'background-color 0.2s',
  }),

  toggleThumb: (active: boolean): CSSProperties => ({
    position: 'absolute',
    top: 2,
    left: active ? 20 : 2,
    width: 18,
    height: 18,
    borderRadius: '50%',
    backgroundColor: '#fff',
    transition: 'left 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
  }),

  // -- 기타 --
  flexRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  } as CSSProperties,

  flexBetween: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as CSSProperties,

  fieldGroup: {
    marginBottom: 20,
  } as CSSProperties,

  helperText: {
    fontSize: 11,
    color: 'var(--blog-text-dim)',
    marginTop: 4,
  } as CSSProperties,

  errorText: {
    fontSize: 12,
    color: 'var(--blog-danger)',
    marginTop: 4,
  } as CSSProperties,

  successText: {
    fontSize: 12,
    color: 'var(--blog-success)',
    marginTop: 4,
  } as CSSProperties,

  // -- 드롭존 --
  dropzone: (isDragOver: boolean): CSSProperties => ({
    border: `2px dashed ${isDragOver ? 'var(--blog-accent)' : 'var(--blog-border)'}`,
    borderRadius: 'var(--blog-radius)',
    padding: 24,
    textAlign: 'center',
    cursor: 'pointer',
    backgroundColor: isDragOver ? 'rgba(212,175,55,0.05)' : 'transparent',
    transition: 'border-color 0.2s, background-color 0.2s',
  }),

  // -- 페이지네이션 --
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    marginTop: 16,
  } as CSSProperties,

  pageBtn: (active: boolean): CSSProperties => ({
    padding: '6px 10px',
    fontSize: 13,
    border: active ? '1px solid var(--blog-accent)' : '1px solid var(--blog-border)',
    borderRadius: 'var(--blog-radius-sm)',
    backgroundColor: active ? 'var(--blog-accent)' : 'transparent',
    color: active ? '#000' : 'var(--blog-text)',
    cursor: 'pointer',
    fontFamily: 'var(--blog-font)',
    minWidth: 32,
    textAlign: 'center',
  }),

  // -- 스탯 카드 --
  statCard: {
    backgroundColor: 'var(--blog-bg-card)',
    border: '1px solid var(--blog-border)',
    borderRadius: 'var(--blog-radius)',
    padding: 20,
    textAlign: 'center' as const,
    cursor: 'pointer',
    transition: 'border-color 0.15s',
  } as CSSProperties,

  statValue: {
    fontSize: 28,
    fontWeight: 700,
    color: 'var(--blog-text)',
    marginBottom: 4,
  } as CSSProperties,

  statLabel: {
    fontSize: 12,
    color: 'var(--blog-text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  } as CSSProperties,
};
