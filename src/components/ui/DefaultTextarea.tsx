'use client';
import type { TextareaProps } from '../../types/ui-components';
import { s } from '../admin/styles';

export function DefaultTextarea({ value, onChange, placeholder, rows, disabled, style }: TextareaProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      style={{ ...s.textarea, ...style }}
    />
  );
}
