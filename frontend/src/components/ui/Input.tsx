import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  className = '',
  id,
  style,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%' }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
          }}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        style={{
          width: '100%',
          backgroundColor: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          border: `1px solid ${error ? 'var(--danger)' : 'var(--border-subtle)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '0.6rem 0.85rem',
          outline: 'none',
          transition: 'var(--transition)',
          boxShadow: 'var(--shadow-sm)',
          ...style,
        }}
        onFocus={(e) => {
          if (!error) e.target.style.borderColor = 'var(--primary)';
        }}
        onBlur={(e) => {
          if (!error) e.target.style.borderColor = 'var(--border-subtle)';
        }}
        className={className}
        {...props}
      />
      {error ? (
        <span style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 500 }}>{error}</span>
      ) : helperText ? (
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{helperText}</span>
      ) : null}
    </div>
  );
};
