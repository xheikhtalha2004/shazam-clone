'use client';

import React from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

// ── Styles map ─────────────────────────────────────────────────────────────────
const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    background: linear-gradient(135deg, var(--color-secondary), var(--color-primary));
    color: var(--color-text);
    border: 1px solid rgba(67,56,202,0.5);
    box-shadow: var(--shadow-glow-violet);
  `,
  secondary: `
    background: var(--color-surface-2);
    color: var(--color-text);
    border: 1px solid var(--color-border);
  `,
  ghost: `
    background: transparent;
    color: var(--color-text-muted);
    border: 1px solid transparent;
  `,
  danger: `
    background: rgba(239,68,68,0.15);
    color: var(--color-destructive);
    border: 1px solid rgba(239,68,68,0.3);
  `,
};

const sizeStyles: Record<ButtonSize, { padding: string; fontSize: string; height: string }> = {
  sm:  { padding: '6px 14px',  fontSize: '0.8125rem', height: '34px' },
  md:  { padding: '10px 22px', fontSize: '0.9375rem', height: '44px' },
  lg:  { padding: '14px 32px', fontSize: '1.0625rem', height: '52px' },
};

// ── Component ──────────────────────────────────────────────────────────────────
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      fullWidth = false,
      children,
      disabled,
      style,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    const sz = sizeStyles[size];

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          height: sz.height,
          padding: sz.padding,
          fontSize: sz.fontSize,
          fontFamily: 'var(--font-body)',
          fontWeight: 600,
          borderRadius: 'var(--radius-pill)',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          opacity: isDisabled ? 0.5 : 1,
          transition: `
            opacity var(--duration-fast) var(--ease-out),
            transform var(--duration-fast) var(--ease-out),
            box-shadow var(--duration-fast) var(--ease-out)
          `,
          whiteSpace: 'nowrap',
          userSelect: 'none',
          width: fullWidth ? '100%' : undefined,
          ...style,
        }}
        onMouseEnter={(e) => {
          if (!isDisabled) {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
            (e.currentTarget as HTMLButtonElement).style.opacity = '0.92';
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = '';
          (e.currentTarget as HTMLButtonElement).style.opacity = '1';
        }}
        onMouseDown={(e) => {
          if (!isDisabled) {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)';
          }
        }}
        onMouseUp={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = '';
        }}
        {...props}
      >
        <style>{`
          button[data-variant="${variant}"]:not(:disabled):hover {
            filter: brightness(1.1);
          }
          .btn-${variant} { ${variantStyles[variant]} }
        `}</style>
        <span
          className={`btn-${variant}`}
          style={{
            display: 'contents',
          }}
        />
        {loading ? (
          <span
            aria-hidden="true"
            style={{
              width: '16px',
              height: '16px',
              border: '2px solid currentColor',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
              flexShrink: 0,
            }}
          />
        ) : icon ? (
          <span aria-hidden="true" style={{ flexShrink: 0 }}>{icon}</span>
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
