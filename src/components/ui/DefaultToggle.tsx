'use client';
import type { ToggleProps } from '../../types/ui-components';
import { s } from '../admin/styles';

export function DefaultToggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        type="button"
        style={s.toggle}
        onClick={() => !disabled && onChange(!checked)}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
      >
        <span style={s.toggleTrack(checked)} />
        <span style={s.toggleThumb(checked)} />
      </button>
      {label && <span style={{ fontSize: 13, color: 'var(--blog-text-muted)' }}>{label}</span>}
    </label>
  );
}
