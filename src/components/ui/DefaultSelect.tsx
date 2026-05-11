'use client';
import type { SelectProps } from '../../types/ui-components';
import { s } from '../admin/styles';

export function DefaultSelect({ value, onChange, options, disabled, style }: SelectProps) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} style={{ ...s.select, ...style }}>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}
