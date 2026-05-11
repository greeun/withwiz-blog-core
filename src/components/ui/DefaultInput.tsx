'use client';
import type { InputProps } from '../../types/ui-components';
import { s } from '../admin/styles';

export function DefaultInput({ value, onChange, placeholder, disabled, type = 'text', style, className }: InputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{ ...s.input, ...style }}
      className={className}
    />
  );
}
