'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

// ── NavLink ────────────────────────────────────────────────────────────────────
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      style={{
        color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
        fontSize: '0.9375rem',
        fontWeight: isActive ? 600 : 400,
        padding: '6px 4px',
        borderRadius: '4px',
        transition: 'color var(--duration-fast)',
        textDecoration: 'none',
        position: 'relative',
      }}
    >
      {children}
      {isActive && (
        <span
          style={{
            position: 'absolute',
            bottom: '-2px',
            left: 0,
            right: 0,
            height: '2px',
            background: 'var(--color-accent)',
            borderRadius: 'var(--radius-pill)',
          }}
        />
      )}
    </Link>
  );
}

// ── Navbar ─────────────────────────────────────────────────────────────────────
export function Navbar() {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(10,10,26,0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--color-border-subtle)',
      }}
    >
      <nav
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '64px',
        }}
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.5rem',
            color: 'var(--color-text)',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          {/* Waveform icon SVG */}
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            aria-hidden="true"
          >
            <rect x="2"  y="10" width="3" height="8"  rx="1.5" fill="var(--color-accent)" />
            <rect x="7"  y="5"  width="3" height="18" rx="1.5" fill="var(--color-accent)" opacity="0.8" />
            <rect x="12" y="2"  width="3" height="24" rx="1.5" fill="var(--color-accent)" />
            <rect x="17" y="6"  width="3" height="16" rx="1.5" fill="var(--color-accent)" opacity="0.8" />
            <rect x="22" y="10" width="3" height="8"  rx="1.5" fill="var(--color-accent)" opacity="0.6" />
          </svg>
          SoundFind
        </Link>

        {/* Nav links */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-6)',
          }}
        >
          <NavLink href="/">Identify</NavLink>
          <NavLink href="/dashboard">History</NavLink>
          <NavLink href="/admin/upload">Admin</NavLink>
          <Link
            href="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '8px 20px',
              background: 'var(--color-accent)',
              color: '#0a0a1a',
              fontWeight: 700,
              fontSize: '0.875rem',
              borderRadius: 'var(--radius-pill)',
              textDecoration: 'none',
              transition: 'opacity var(--duration-fast)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            Sign in
          </Link>
        </div>
      </nav>
    </header>
  );
}
