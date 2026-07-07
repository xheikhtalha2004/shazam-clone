'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useState, useEffect } from 'react';

// ── NavLink ────────────────────────────────────────────────────────────────────
function NavLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: () => void }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      onClick={onClick}
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
  const [menuOpen, setMenuOpen] = useState(false);

  // Close on resize to desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 640) setMenuOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Prevent body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const close = () => setMenuOpen(false);

  return (
    <>
      {/* ── Top bar ── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'rgba(10,10,26,0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
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
            onClick={close}
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
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <rect x="2"  y="10" width="3" height="8"  rx="1.5" fill="var(--color-accent)" />
              <rect x="7"  y="5"  width="3" height="18" rx="1.5" fill="var(--color-accent)" opacity="0.8" />
              <rect x="12" y="2"  width="3" height="24" rx="1.5" fill="var(--color-accent)" />
              <rect x="17" y="6"  width="3" height="16" rx="1.5" fill="var(--color-accent)" opacity="0.8" />
              <rect x="22" y="10" width="3" height="8"  rx="1.5" fill="var(--color-accent)" opacity="0.6" />
            </svg>
            SoundFind
          </Link>

          {/* ── Desktop nav (hidden on mobile via CSS) ── */}
          <div
            className="nav-desktop"
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }}
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

          {/* ── Hamburger button (visible on mobile via CSS) ── */}
          <button
            className="nav-hamburger"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((v) => !v)}
            style={{
              display: 'none',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              width: '44px',
              height: '44px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              gap: '5px',
              borderRadius: 'var(--radius-sm)',
              padding: '6px',
            }}
          >
            <span style={{
              display: 'block', width: '22px', height: '2px',
              background: 'var(--color-text)', borderRadius: '2px',
              transition: 'transform var(--duration-normal) var(--ease-out)',
              transform: menuOpen ? 'translateY(7px) rotate(45deg)' : 'none',
            }} />
            <span style={{
              display: 'block', width: '22px', height: '2px',
              background: 'var(--color-text)', borderRadius: '2px',
              transition: 'opacity var(--duration-fast)',
              opacity: menuOpen ? 0 : 1,
            }} />
            <span style={{
              display: 'block', width: '22px', height: '2px',
              background: 'var(--color-text)', borderRadius: '2px',
              transition: 'transform var(--duration-normal) var(--ease-out)',
              transform: menuOpen ? 'translateY(-7px) rotate(-45deg)' : 'none',
            }} />
          </button>
        </nav>
      </header>

      {/* ── Mobile full-screen drawer ── */}
      <div
        id="mobile-menu"
        aria-hidden={!menuOpen}
        className="nav-mobile-drawer"
        style={{
          position: 'fixed',
          top: '64px',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99,
          background: 'rgba(10,10,26,0.98)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          display: 'none',
          flexDirection: 'column',
          padding: 'var(--space-8) var(--space-5)',
          gap: 'var(--space-3)',
          overflowY: 'auto',
          transform: menuOpen ? 'translateY(0)' : 'translateY(-10px)',
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? 'auto' : 'none',
          transition: 'opacity var(--duration-normal) var(--ease-out), transform var(--duration-normal) var(--ease-out)',
        }}
      >
        {[
          { href: '/', label: 'Identify' },
          { href: '/dashboard', label: 'History' },
          { href: '/admin/upload', label: 'Admin' },
        ].map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            onClick={close}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '18px 20px',
              borderRadius: 'var(--radius-md)',
              fontSize: '1.125rem',
              fontWeight: 500,
              fontFamily: 'var(--font-body)',
              textDecoration: 'none',
              color: 'var(--color-text)',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border-subtle)',
              transition: 'border-color var(--duration-fast), background var(--duration-fast)',
            }}
          >
            {label}
          </Link>
        ))}

        <Link
          href="/login"
          onClick={close}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 'var(--space-3)',
            padding: '18px 20px',
            borderRadius: 'var(--radius-pill)',
            fontSize: '1rem',
            fontWeight: 700,
            fontFamily: 'var(--font-body)',
            textDecoration: 'none',
            color: '#0a0a1a',
            background: 'var(--color-accent)',
            boxShadow: 'var(--shadow-glow-green)',
          }}
        >
          Sign in
        </Link>
      </div>

      {/* Responsive CSS */}
      <style>{`
        @media (max-width: 640px) {
          .nav-desktop { display: none !important; }
          .nav-hamburger { display: flex !important; }
          .nav-mobile-drawer { display: flex !important; }
        }
      `}</style>
    </>
  );
}
