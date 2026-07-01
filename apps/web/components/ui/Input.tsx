'use client';

import React from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
}

// ── Component ──────────────────────────────────────────────────────────────────
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, id, style, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {label && (
          <label
            htmlFor={inputId}
            style={{
              fontSize: '0.875rem',
              fontWeight: 500,
              color: error ? 'var(--color-destructive)' : 'var(--color-text-muted)',
              transition: 'color var(--duration-fast)',
            }}
          >
            {label}
            {props.required && (
              <span
                aria-label="required"
                style={{ color: 'var(--color-destructive)', marginLeft: '4px' }}
              >
                *
              </span>
            )}
          </label>
        )}

        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helper ? `${inputId}-helper` : undefined}
          style={{
            height: '48px',
            padding: '0 16px',
            background: 'var(--color-surface-2)',
            border: `1px solid ${error ? 'var(--color-destructive)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text)',
            fontFamily: 'var(--font-body)',
            fontSize: '0.9375rem',
            outline: 'none',
            transition: 'border-color var(--duration-fast) var(--ease-out)',
            width: '100%',
            ...style,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = error
              ? 'var(--color-destructive)'
              : 'var(--color-accent)';
            e.currentTarget.style.boxShadow = error
              ? '0 0 0 3px rgba(239,68,68,0.15)'
              : '0 0 0 3px rgba(34,197,94,0.12)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error
              ? 'var(--color-destructive)'
              : 'var(--color-border)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          {...props}
        />

        {error && (
          <p
            id={`${inputId}-error`}
            role="alert"
            style={{
              fontSize: '0.8125rem',
              color: 'var(--color-destructive)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {error}
          </p>
        )}

        {helper && !error && (
          <p
            id={`${inputId}-helper`}
            style={{ fontSize: '0.8125rem', color: 'var(--color-text-dim)' }}
          >
            {helper}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
