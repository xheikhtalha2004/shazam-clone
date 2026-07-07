'use client';

import React, { useState } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { AudioRecorder } from '@/components/audio/AudioRecorder';
import type { RecognizeResponse } from '@/types';

// ── Result Card component ──────────────────────────────────────────────────────
function ResultCard({ result }: { result: RecognizeResponse }) {
  if (!result.matched) {
    return (
      <div
        className="animate-scale-in"
        style={{
          padding: 'var(--space-8)',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-xl)',
          textAlign: 'center',
          maxWidth: '420px',
          width: '100%',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }} aria-hidden="true">🎵</div>
        <h3 style={{ marginBottom: 'var(--space-2)' }}>No match found</h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9375rem' }}>
          Make sure the song is playing clearly and try again with a longer clip.
        </p>
      </div>
    );
  }

  const { track, confidence } = result;
  const confPercent = Math.round(confidence * 100);

  return (
    <div
      className="animate-scale-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        padding: 'var(--space-6)',
        background: 'var(--color-surface)',
        border: '1px solid rgba(34,197,94,0.3)',
        borderRadius: 'var(--radius-xl)',
        maxWidth: '420px',
        width: '100%',
        boxShadow: 'var(--shadow-glow-green)',
      }}
    >
      {/* Cover art + info */}
      <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
        {/* Cover */}
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-surface-2)',
            flexShrink: 0,
            overflow: 'hidden',
            border: '1px solid var(--color-border)',
          }}
        >
          {track.cover_url ? (
            <img
              src={track.cover_url}
              alt={`${track.title} album cover`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-surface-3))',
              }}
              aria-hidden="true"
            >
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="10" stroke="var(--color-accent)" strokeWidth="2" fill="none" />
                <circle cx="16" cy="16" r="3" fill="var(--color-accent)" />
                <circle cx="16" cy="16" r="6" stroke="var(--color-accent)" strokeWidth="1" fill="none" opacity="0.5" />
              </svg>
            </div>
          )}
        </div>

        {/* Title / artist */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--color-accent)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '4px',
            }}
          >
            ✓ Match Found
          </div>
          <h3
            style={{
              fontSize: '1.1rem',
              fontFamily: 'var(--font-display)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {track.title}
          </h3>
          <p
            style={{
              color: 'var(--color-text-muted)',
              fontSize: '0.9rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {track.artist}
            {track.album && ` · ${track.album}`}
          </p>
        </div>
      </div>

      {/* Confidence bar */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '6px',
            fontSize: '0.8125rem',
          }}
        >
          <span style={{ color: 'var(--color-text-dim)' }}>Confidence</span>
          <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{confPercent}%</span>
        </div>
        <div
          style={{
            height: '6px',
            background: 'var(--color-surface-3)',
            borderRadius: 'var(--radius-pill)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${confPercent}%`,
              background: confPercent >= 70
                ? 'linear-gradient(90deg, var(--color-accent-dim), var(--color-accent))'
                : confPercent >= 40
                ? 'linear-gradient(90deg, #d97706, #f59e0b)'
                : 'var(--color-destructive)',
              borderRadius: 'var(--radius-pill)',
              transition: 'width 0.8s var(--ease-out)',
            }}
          />
        </div>
      </div>

      {track.duration && (
        <p style={{ color: 'var(--color-text-dim)', fontSize: '0.8125rem' }}>
          Duration: {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
        </p>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [result, setResult] = useState<RecognizeResponse | null>(null);

  const handleResult = (res: RecognizeResponse) => {
    setResult(res);
  };

  const handleReset = () => {
    setResult(null);
  };

  return (
    <div className="bg-mesh" style={{ minHeight: '100dvh' }}>
      <Navbar />

      <main
        id="main-content"
        className="home-main"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100dvh - 64px)',
          padding: 'var(--space-10) var(--space-6)',
          gap: 'var(--space-12)',
        }}
      >
      <style>{`
        @media (max-width: 640px) {
          .home-main { padding: var(--space-8) var(--space-4) var(--space-10) !important; gap: var(--space-8) !important; }
          .home-hero h1 { font-size: clamp(1.75rem, 8vw, 2.5rem) !important; }
          .home-hero p { font-size: 1rem !important; }
        }
      `}</style>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div
        className="animate-fade-in-up home-hero"
        style={{ textAlign: 'center', maxWidth: '560px' }}
      >
          <h1
            className="text-glow-green"
            style={{ marginBottom: 'var(--space-4)' }}
          >
            SoundFind
          </h1>
          <p
            style={{
              fontSize: '1.125rem',
              color: 'var(--color-text-muted)',
              maxWidth: '44ch',
              margin: '0 auto',
              lineHeight: 1.7,
            }}
          >
            Identify songs from your own music library. Record a few seconds — get the answer instantly.
          </p>
        </div>

        {/* ── Recorder / Result ──────────────────────────────────────────── */}
        <div
          className="animate-fade-in-up"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-8)',
            animationDelay: '0.12s',
          }}
        >
          {!result && (
            <AudioRecorder onResult={handleResult} />
          )}

          {result && (
            <>
              <ResultCard result={result} />
              <button
                onClick={handleReset}
                style={{
                  background: 'none',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-muted)',
                  padding: '10px 28px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '0.9375rem',
                  cursor: 'pointer',
                  transition: 'border-color var(--duration-fast), color var(--duration-fast)',
                  fontFamily: 'var(--font-body)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-accent)';
                  e.currentTarget.style.color = 'var(--color-accent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.color = 'var(--color-text-muted)';
                }}
              >
                Try another song
              </button>
            </>
          )}
        </div>

        {/* ── CTAs ──────────────────────────────────────────────────────── */}
        <div
          className="animate-fade-in"
          style={{
            display: 'flex',
            gap: 'var(--space-3)',
            flexWrap: 'wrap',
            justifyContent: 'center',
            animationDelay: '0.24s',
          }}
        >
          <Link
            href="/login"
            style={{
              padding: '10px 24px',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-muted)',
              fontSize: '0.9rem',
              textDecoration: 'none',
              transition: 'border-color var(--duration-fast)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
          >
            Sign in to save history
          </Link>
          <Link
            href="/dashboard"
            style={{
              padding: '10px 24px',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-muted)',
              fontSize: '0.9rem',
              textDecoration: 'none',
              transition: 'border-color var(--duration-fast)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
          >
            View history
          </Link>
        </div>
      </main>
    </div>
  );
}
