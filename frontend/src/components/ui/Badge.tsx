import React from 'react';
import { ExpiryStatus } from '../../types/sample.types';

export interface BadgeProps {
  status?: ExpiryStatus | 'active' | 'inactive';
  text?: string;
  variant?: 'danger' | 'warning' | 'success' | 'neutral' | 'info';
  children?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ status, text, variant, children }) => {
  let bg = 'var(--bg-surface-elevated)';
  let color = 'var(--text-secondary)';
  let border = 'var(--border-subtle)';
  let label = text || children;

  if (status === 'expired' || variant === 'danger') {
    bg = 'var(--danger-light)';
    color = '#f87171';
    border = 'var(--danger-border)';
    if (!label) label = 'Đã hết hạn';
  } else if (status === 'expiring' || variant === 'warning') {
    bg = 'var(--warning-light)';
    color = '#fbbf24';
    border = 'var(--warning-border)';
    if (!label) label = 'Sắp hết hạn';
  } else if (status === 'valid' || status === 'active' || variant === 'success') {
    bg = 'var(--success-light)';
    color = '#34d399';
    border = 'var(--success-border)';
    if (!label) label = status === 'active' ? 'Đang hoạt động' : 'Còn hạn dùng';
  } else if (status === 'inactive') {
    bg = 'rgba(100, 116, 139, 0.2)';
    color = 'var(--text-muted)';
    border = 'var(--border-subtle)';
    if (!label) label = 'Đã vô hiệu';
  } else if (variant === 'info') {
    bg = 'var(--info-light)';
    color = '#38bdf8';
    border = '#0369a1';
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.2rem 0.65rem',
        fontSize: '0.78rem',
        fontWeight: 600,
        borderRadius: 'var(--radius-full)',
        backgroundColor: bg,
        color,
        border: `1px solid ${border}`,
        whiteSpace: 'nowrap',
        lineHeight: 1.3,
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: color,
        }}
      />
      {label}
    </span>
  );
};
