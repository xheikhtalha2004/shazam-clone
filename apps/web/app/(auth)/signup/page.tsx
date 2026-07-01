'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/Input';

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const passwordsMatch = password === confirmPassword;
  const passwordLongEnough = password.length >= 8;
  const canSubmit = email && passwordLongEnough && passwordsMatch && !loading;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Supabase sends a confirmation email by default
    setSuccess(true);
    setLoading(false);
  };

  if (success) {
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
          style={{ width: '100%', maxWidth: '440px', padding: '48px 36px', textAlign: 'center' }}
        >
          <div
            style={{
              width: '64px', height: '64px',
              borderRadius: '50%',
              background: 'rgba(34,197,94,0.15)',
              border: '2px solid var(--color-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px',
            }}
            aria-hidden="true"
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M5 14L11 20L23 8" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 style={{ marginBottom: '12px' }}>Check your email</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9375rem', maxWidth: '36ch', margin: '0 auto 28px' }}>
            We sent a confirmation link to <strong style={{ color: 'var(--color-text)' }}>{email}</strong>.
            Open it to activate your account.
          </p>
          <Link
            href="/login"
            style={{
              display: 'inline-flex', padding: '12px 32px',
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-pill)',
              color: 'var(--color-text)',
              textDecoration: 'none', fontSize: '0.9375rem', fontWeight: 500,
            }}
          >
            Back to Sign in
          </Link>
        </div>
      </div>
    );
  }

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
        style={{ width: '100%', maxWidth: '440px', padding: '40px 36px' }}
      >
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px', textDecoration: 'none', justifyContent: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <rect x="2"  y="10" width="3" height="8"  rx="1.5" fill="var(--color-accent)" />
            <rect x="7"  y="5"  width="3" height="18" rx="1.5" fill="var(--color-accent)" opacity="0.8" />
            <rect x="12" y="2"  width="3" height="24" rx="1.5" fill="var(--color-accent)" />
            <rect x="17" y="6"  width="3" height="16" rx="1.5" fill="var(--color-accent)" opacity="0.8" />
            <rect x="22" y="10" width="3" height="8"  rx="1.5" fill="var(--color-accent)" opacity="0.6" />
          </svg>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--color-text)' }}>SoundFind</span>
        </Link>

        <h1 style={{ fontSize: '1.75rem', textAlign: 'center', marginBottom: '8px' }}>Create account</h1>
        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: '32px', fontSize: '0.9375rem' }}>
          Start identifying songs from your library
        </p>

        <form onSubmit={handleSignup} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div role="alert" aria-live="assertive" style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 'var(--radius-md)', color: '#fca5a5', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          <Input
            label="Email address"
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
            autoFocus
          />

          <Input
            label="Password"
            id="signup-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
            autoComplete="new-password"
            helper="Minimum 8 characters"
            error={password && !passwordLongEnough ? 'Password must be at least 8 characters' : undefined}
          />

          <Input
            label="Confirm password"
            id="signup-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat your password"
            required
            autoComplete="new-password"
            error={confirmPassword && !passwordsMatch ? 'Passwords do not match' : undefined}
          />

          <button
            type="submit"
            id="signup-submit"
            disabled={!canSubmit}
            aria-busy={loading}
            style={{
              height: '52px', width: '100%',
              background: canSubmit ? 'var(--color-accent)' : 'var(--color-surface-3)',
              color: canSubmit ? '#0a0a1a' : 'var(--color-text-dim)',
              border: 'none', borderRadius: 'var(--radius-pill)',
              fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 700,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              transition: 'background var(--duration-fast), color var(--duration-fast)',
              boxShadow: canSubmit ? 'var(--shadow-glow-green)' : 'none',
            }}
          >
            {loading && (
              <span aria-hidden="true" style={{ width: '18px', height: '18px', border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#0a0a1a', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            )}
            {loading ? 'Creating account…' : 'Create account'}
          </button>

          <p style={{ textAlign: 'center', color: 'var(--color-text-dim)', fontSize: '0.9rem' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--color-accent)', fontWeight: 500 }}>Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
