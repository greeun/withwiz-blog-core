'use client';
import type { CardProps } from '../../types/ui-components';
import { s } from '../admin/styles';

export function DefaultCard({ children, style, className, onClick, role, tabIndex }: CardProps) {
  return (
    <div style={{ ...s.card, ...style }} className={className} onClick={onClick} role={role} tabIndex={tabIndex}>
      {children}
    </div>
  );
}
