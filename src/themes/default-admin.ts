import type { CSSProperties } from 'react';

export const ADMIN_THEME_DEFAULTS: Record<string, string> = {
  '--blog-theme-default-admin-bg': '#fafafa',
  '--blog-theme-default-admin-bg-card': '#ffffff',
  '--blog-theme-default-admin-bg-input': '#ffffff',
  '--blog-theme-default-admin-bg-hover': '#f0f0f0',
  '--blog-theme-default-admin-bg-selected': '#e8f0fe',
  '--blog-theme-default-admin-text': '#171717',
  '--blog-theme-default-admin-text-muted': '#737373',
  '--blog-theme-default-admin-text-dim': '#a3a3a3',
  '--blog-theme-default-admin-border': '#e5e5e5',
  '--blog-theme-default-admin-border-focus': '#bbb',
  '--blog-theme-default-admin-accent': '#4A90D9',
  '--blog-theme-default-admin-accent-hover': '#3a7bc8',
  '--blog-theme-default-admin-danger': '#ef4444',
  '--blog-theme-default-admin-danger-hover': '#dc2626',
  '--blog-theme-default-admin-success': '#22c55e',
  '--blog-theme-default-admin-warning': '#f59e0b',
  '--blog-theme-default-admin-info': '#3b82f6',
  '--blog-theme-default-admin-radius': '6px',
  '--blog-theme-default-admin-radius-sm': '4px',
  '--blog-theme-default-admin-font': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  '--blog-theme-default-admin-font-mono': '"SF Mono", "Fira Code", monospace',
};

export const ADMIN_VAR_MAP: Record<string, string> = {
  '--blog-admin-bg': 'var(--blog-theme-default-admin-bg)',
  '--blog-admin-bg-card': 'var(--blog-theme-default-admin-bg-card)',
  '--blog-admin-bg-input': 'var(--blog-theme-default-admin-bg-input)',
  '--blog-admin-bg-hover': 'var(--blog-theme-default-admin-bg-hover)',
  '--blog-admin-bg-selected': 'var(--blog-theme-default-admin-bg-selected)',
  '--blog-admin-text': 'var(--blog-theme-default-admin-text)',
  '--blog-admin-text-muted': 'var(--blog-theme-default-admin-text-muted)',
  '--blog-admin-text-dim': 'var(--blog-theme-default-admin-text-dim)',
  '--blog-admin-border': 'var(--blog-theme-default-admin-border)',
  '--blog-admin-border-focus': 'var(--blog-theme-default-admin-border-focus)',
  '--blog-admin-accent': 'var(--blog-theme-default-admin-accent)',
  '--blog-admin-accent-hover': 'var(--blog-theme-default-admin-accent-hover)',
  '--blog-admin-danger': 'var(--blog-theme-default-admin-danger)',
  '--blog-admin-danger-hover': 'var(--blog-theme-default-admin-danger-hover)',
  '--blog-admin-success': 'var(--blog-theme-default-admin-success)',
  '--blog-admin-warning': 'var(--blog-theme-default-admin-warning)',
  '--blog-admin-info': 'var(--blog-theme-default-admin-info)',
  '--blog-admin-radius': 'var(--blog-theme-default-admin-radius)',
  '--blog-admin-radius-sm': 'var(--blog-theme-default-admin-radius-sm)',
  '--blog-admin-font': 'var(--blog-theme-default-admin-font)',
  '--blog-admin-font-mono': 'var(--blog-theme-default-admin-font-mono)',
};

export function adminThemeVars(): CSSProperties {
  return { ...ADMIN_THEME_DEFAULTS, ...ADMIN_VAR_MAP } as unknown as CSSProperties;
}
