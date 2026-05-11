'use client';
import type { CSSProperties } from 'react';
import type { BadgeProps } from '../../types/ui-components';
import { s } from '../admin/styles';

const variantStyles: Record<string, CSSProperties> = {
  published: s.badgePublished,
  draft: s.badgeDraft,
  featured: s.badgeFeatured,
};

export function DefaultBadge({ children, variant = 'default', style }: BadgeProps) {
  return (
    <span style={{ ...s.badge, ...(variantStyles[variant] ?? {}), ...style }}>
      {children}
    </span>
  );
}
