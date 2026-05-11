'use client';
import type { ButtonProps } from '../../types/ui-components';
import { s } from '../admin/styles';

export function DefaultButton({
  children, variant = 'default', size = 'default', disabled, onClick, type = 'button', style, className,
}: ButtonProps) {
  const base = variant === 'primary' ? s.btnPrimary : variant === 'danger' ? s.btnDanger : s.btn;
  return (
    <button
      type={type}
      style={{ ...base, ...(size === 'small' ? s.btnSmall : {}), ...(disabled ? s.btnDisabled : {}), ...style }}
      className={className}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
