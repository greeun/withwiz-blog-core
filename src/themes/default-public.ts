import type { CSSProperties } from 'react';

export const PUBLIC_THEME_DEFAULTS: Record<string, string> = {
  '--blog-theme-default-public-bg': '#ffffff',
  '--blog-theme-default-public-bg-card': '#f9f9f9',
  '--blog-theme-default-public-bg-hover': '#f0f0f0',
  '--blog-theme-default-public-text': '#1a1a1a',
  '--blog-theme-default-public-text-muted': '#6b7280',
  '--blog-theme-default-public-text-dim': '#9ca3af',
  '--blog-theme-default-public-border': '#e5e7eb',
  '--blog-theme-default-public-accent': '#2563eb',
  '--blog-theme-default-public-accent-hover': '#1d4ed8',
  '--blog-theme-default-public-danger': '#ef4444',
  '--blog-theme-default-public-success': '#22c55e',
  '--blog-theme-default-public-radius': '8px',
  '--blog-theme-default-public-radius-sm': '4px',
  '--blog-theme-default-public-font': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  '--blog-theme-default-public-font-size': '15px',
  '--blog-theme-default-public-max-width': '1200px',
};

export const PUBLIC_VAR_MAP: Record<string, string> = {
  '--blog-public-bg': 'var(--blog-theme-default-public-bg)',
  '--blog-public-bg-card': 'var(--blog-theme-default-public-bg-card)',
  '--blog-public-bg-hover': 'var(--blog-theme-default-public-bg-hover)',
  '--blog-public-text': 'var(--blog-theme-default-public-text)',
  '--blog-public-text-muted': 'var(--blog-theme-default-public-text-muted)',
  '--blog-public-text-dim': 'var(--blog-theme-default-public-text-dim)',
  '--blog-public-border': 'var(--blog-theme-default-public-border)',
  '--blog-public-accent': 'var(--blog-theme-default-public-accent)',
  '--blog-public-accent-hover': 'var(--blog-theme-default-public-accent-hover)',
  '--blog-public-danger': 'var(--blog-theme-default-public-danger)',
  '--blog-public-success': 'var(--blog-theme-default-public-success)',
  '--blog-public-radius': 'var(--blog-theme-default-public-radius)',
  '--blog-public-radius-sm': 'var(--blog-theme-default-public-radius-sm)',
  '--blog-public-font': 'var(--blog-theme-default-public-font)',
  '--blog-public-font-size': 'var(--blog-theme-default-public-font-size)',
  '--blog-public-max-width': 'var(--blog-theme-default-public-max-width)',
};

export function publicThemeVars(): CSSProperties {
  return { ...PUBLIC_THEME_DEFAULTS, ...PUBLIC_VAR_MAP } as unknown as CSSProperties;
}
