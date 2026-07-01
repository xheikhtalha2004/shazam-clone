'use client';

import React from 'react';

// ── Spinner ────────────────────────────────────────────────────────────────────
type SpinnerSize = 'sm' | 'md' | 'lg';

const spinnerDimensions: Record<SpinnerSize, number> = { sm: 16, md: 24, lg: 40 };

export function Spinner({
  size = 'md',
  color = 'var(--color-accent)',
  label = 'Loading…',
}: {
  size?: SpinnerSize;
  color?: string;
  label?: string;
}) {
  const px = spinnerDimensions[size];
  return (
    <span
      role="status"
      aria-label={label}
      style={{
        display: 'inline-block',
        width: px,
        height: px,
        border: `${px > 20 ? 3 : 2}px solid ${color}30`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
        flexShrink: 0,
      }}
    />
  );
}

// ── Badge ──────────────────────────────────────────────────────────────────────
type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default';

const badgeColors: Record<BadgeVariant, { bg: string; color: string; border: string }> = {
  success: { bg: 'rgba(34,197,94,0.12)',  color: '#4ade80', border: 'rgba(34,197,94,0.3)' },
  warning: { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
  error:   { bg: 'rgba(239,68,68,0.12)',  color: '#f87171', border: 'rgba(239,68,68,0.3)' },
  info:    { bg: 'rgba(67,56,202,0.15)',  color: '#818cf8', border: 'rgba(67,56,202,0.4)' },
  default: { bg: 'var(--color-surface-2)', color: 'var(--color-text-muted)', border: 'var(--color-border)' },
};

export function Badge({
  variant = 'default',
  children,
}: {
  variant?: BadgeVariant;
  children: React.ReactNode;
}) {
  const c = badgeColors[variant];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '3px 10px',
        borderRadius: 'var(--radius-pill)',
        fontSize: '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
      }}
    >
      {children}
    </span>
  );
}

// ── Card ───────────────────────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  elevated?: boolean;
  glass?: boolean;
  onClick?: () => void;
}

export function Card({ children, style, elevated = false, glass = false, onClick }: CardProps) {
  const baseStyles: React.CSSProperties = {
    background: elevated ? 'var(--color-surface-2)' : 'var(--color-surface)',
    border: '1px solid var(--color-border-subtle)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-6)',
    boxShadow: elevated ? 'var(--shadow-md)' : 'var(--shadow-sm)',
    transition: 'transform var(--duration-normal) var(--ease-out), box-shadow var(--duration-normal) var(--ease-out)',
    cursor: onClick ? 'pointer' : undefined,
    ...style,
  };

  if (glass) {
    baseStyles.background = 'rgba(18,18,31,0.7)';
    baseStyles.backdropFilter = 'blur(12px) saturate(150%)';
    (baseStyles as any)['-webkit-backdrop-filter'] = 'blur(12px) saturate(150%)';
    baseStyles.border = '1px solid rgba(49,46,129,0.4)';
  }

  return (
    <div
      style={baseStyles}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (onClick) {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-lg)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          (e.currentTarget as HTMLDivElement).style.transform = '';
          (e.currentTarget as HTMLDivElement).style.boxShadow = elevated ? 'var(--shadow-md)' : 'var(--shadow-sm)';
        }
      }}
    >
      {children}
    </div>
  );
}

// ── Toast ──────────────────────────────────────────────────────────────────────
type ToastVariant = 'success' | 'error' | 'info';

export function Toast({
  message,
  variant = 'info',
  onDismiss,
}: {
  message: string;
  variant?: ToastVariant;
  onDismiss?: () => void;
}) {
  const colors = {
    success: { border: 'rgba(34,197,94,0.4)', icon: '✓', color: '#4ade80' },
    error:   { border: 'rgba(239,68,68,0.4)', icon: '✕', color: '#f87171' },
    info:    { border: 'rgba(67,56,202,0.5)', icon: 'ℹ', color: '#818cf8' },
  }[variant];

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 20px',
        background: 'var(--color-surface-2)',
        border: `1px solid ${colors.border}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        maxWidth: '400px',
        animation: 'fade-in-up 0.25s var(--ease-out) both',
      }}
    >
      <span style={{ color: colors.color, fontWeight: 700, fontSize: '1rem' }}>
        {colors.icon}
      </span>
      <p style={{ color: 'var(--color-text)', fontSize: '0.9375rem', flex: 1 }}>{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss notification"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-dim)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            fontSize: '1.1rem',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
