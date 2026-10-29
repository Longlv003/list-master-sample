import React from 'react';
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg'; isLoading?: boolean; icon?: React.ReactNode;
}
export const Button: React.FC<ButtonProps> = ({children, variant = 'primary', size = 'md', isLoading = false, icon, disabled, style, ...props}) => {
  const colors: Record<string, React.CSSProperties> = {
    primary: {backgroundColor: 'var(--primary)', color: 'white'}, secondary: {backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--text-primary)'},
    danger: {backgroundColor: 'var(--danger)', color: 'white'}, success: {backgroundColor: 'var(--success)', color: 'white'},
    outline: {backgroundColor: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)'}, ghost: {backgroundColor: 'transparent', color: 'var(--text-secondary)'},
  };
  return <button {...props} disabled={disabled || isLoading} aria-busy={isLoading || undefined} style={{display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 600,
    borderRadius: 'var(--radius-md)', border: '1px solid transparent', padding: size === 'sm' ? '0.4rem 0.75rem' : size === 'lg' ? '0.75rem 1.5rem' : '0.55rem 1.1rem',
    fontSize: size === 'sm' ? '0.85rem' : '0.95rem', minHeight: 44, cursor: disabled || isLoading ? 'not-allowed' : 'pointer', opacity: disabled || isLoading ? 0.6 : 1, ...colors[variant], ...style}}>
    {isLoading ? <span aria-hidden="true">…</span> : icon}{children}</button>;
};
