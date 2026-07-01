'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/Input';

// ── Shared auth form shell ────────────────────────────────────────────────────
function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="bg-mesh"
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div
        className="glass animate-scale-in"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '40px 36px',
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '32px',
            textDecoration: 'none',
            justifyContent: 'center',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <rect x="2"  y="10" width="3" height="8"  rx="1.5" fill="var(--color-accent)" />
            <rect x="7"  y="5"  width="3" height="18" rx="1.5" fill="var(--color-accent)" opacity="0.8" />
            <rect x="12" y="2"  width="3" height="24" rx="1.5" fill="var(--color-accent)" />
            <rect x="17" y="6"  width="3" height="16" rx="1.5" fill="var(--color-accent)" opacity="0.8" />
            <rect x="22" y="10" width="3" height="8"  rx="1.5" fill="var(--color-accent)" opacity="0.6" />
          </svg>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--color-text)' }}>
            SoundFind
          </span>
        </Link>

        <h1
          style={{
            fontSize: '1.75rem',
            textAlign: 'center',
            marginBottom: '8px',
          }}
        >
          {title}
        </h1>
        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: '32px', fontSize: '0.9375rem' }}>
          {subtitle}
        </p>

        {children}
      </div>
    </div>
  );
}

// ── Login page ─────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(
        authError.message === 'Invalid login credentials'
          ? 'Incorrect email or password. Please try again.'
          : authError.message
      );
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to access your match history">
      <form onSubmit={handleLogin} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Global error */}
        {error && (
          <div
            role="alert"
            aria-live="assertive"
            style={{
              padding: '12px 16px',
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.35)',
              borderRadius: 'var(--radius-md)',
              color: '#fca5a5',
              fontSize: '0.9rem',
            }}
          >
            {error}
          </div>
        )}

        <Input
          label="Email address"
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          autoComplete="email"
          autoFocus
        />

        <div>
          <Input
            label="Password"
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            required
            autoComplete="current-password"
          />
          <div style={{ textAlign: 'right', marginTop: '8px' }}>
            <Link href="/forgot-password" style={{ fontSize: '0.8125rem', color: 'var(--color-text-dim)' }}>
              Forgot password?
            </Link>
          </div>
        </div>

        <button
          type="submit"
          id="login-submit"
          disabled={loading || !email || !password}
          aria-busy={loading}
          style={{
            height: '52px',
            width: '100%',
            background: loading || !email || !password
              ? 'var(--color-surface-3)'
              : 'var(--color-accent)',
            color: loading || !email || !password ? 'var(--color-text-dim)' : '#0a0a1a',
            border: 'none',
            borderRadius: 'var(--radius-pill)',
            fontFamily: 'var(--font-body)',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: loading || !email || !password ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            transition: 'background var(--duration-fast), color var(--duration-fast)',
            boxShadow: !loading && email && password ? 'var(--shadow-glow-green)' : 'none',
          }}
        >
          {loading && (
            <span
              aria-hidden="true"
              style={{
                width: '18px', height: '18px',
                border: '2px solid rgba(0,0,0,0.3)',
                borderTopColor: '#0a0a1a',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }}
            />
          )}
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <p style={{ textAlign: 'center', color: 'var(--color-text-dim)', fontSize: '0.9rem' }}>
          No account?{' '}
          <Link href="/signup" style={{ color: 'var(--color-accent)', fontWeight: 500 }}>
            Create one
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
