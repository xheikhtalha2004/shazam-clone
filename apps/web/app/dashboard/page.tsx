import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { MatchHistoryItem } from '@/types';
import { Navbar } from '@/components/layout/Navbar';
import { LogoutButton } from './LogoutButton';

// ── Confidence pill ────────────────────────────────────────────────────────────
function ConfidencePill({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? 'var(--color-accent)' : pct >= 40 ? '#fbbf24' : '#f87171';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: 'var(--radius-pill)',
        fontSize: '0.75rem',
        fontWeight: 700,
        background: `${color}18`,
        color,
        border: `1px solid ${color}40`,
      }}
    >
      {pct}%
    </span>
  );
}

// ── History card ───────────────────────────────────────────────────────────────
function HistoryCard({ item }: { item: MatchHistoryItem }) {
  const track = item.tracks;
  const date = new Date(item.matched_at);
  const formattedDate = date.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
        padding: 'var(--space-4) var(--space-5)',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 'var(--radius-lg)',
        transition: 'border-color var(--duration-fast)',
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border)')}
      onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border-subtle)')}
    >
      {/* Cover thumbnail */}
      <div
        style={{
          width: '52px', height: '52px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          flexShrink: 0,
          overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        aria-hidden="true"
      >
        {track?.cover_url ? (
          <img src={track.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="7" stroke="var(--color-text-dim)" strokeWidth="1.5" fill="none" />
            <circle cx="10" cy="10" r="2" fill="var(--color-text-dim)" />
          </svg>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {item.matched && track ? (
          <>
            <p style={{ fontWeight: 600, fontSize: '0.9375rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {track.title}
            </p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {track.artist}{track.album ? ` · ${track.album}` : ''}
            </p>
          </>
        ) : (
          <>
            <p style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--color-text-muted)' }}>No match found</p>
            <p style={{ color: 'var(--color-text-dim)', fontSize: '0.8125rem' }}>Song not in catalogue</p>
          </>
        )}
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
        {item.matched && <ConfidencePill value={item.confidence} />}
        <time
          dateTime={item.matched_at}
          style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}
        >
          {formattedDate}
        </time>
      </div>
    </div>
  );
}

// ── Page (Server Component) ────────────────────────────────────────────────────
export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Fetch match history with joined track data
  const { data: history, error } = await supabase
    .from('match_history')
    .select(`
      id, user_id, track_id, confidence, matched, matched_at, session_id,
      tracks ( id, title, artist, album, cover_url, duration )
    `)
    .eq('user_id', user.id)
    .order('matched_at', { ascending: false })
    .limit(50);

  const items: MatchHistoryItem[] = (history ?? []) as MatchHistoryItem[];
  const matchCount = items.filter((i) => i.matched).length;

  return (
    <div className="bg-mesh" style={{ minHeight: '100dvh' }}>
      <Navbar />

      <main
        id="main-content"
        className="container"
        style={{ paddingTop: 'var(--space-10)', paddingBottom: 'var(--space-12)' }}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div
          className="animate-fade-in-up"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-4)',
            marginBottom: 'var(--space-10)',
          }}
        >
          <div>
            <h1 style={{ marginBottom: '8px' }}>Your History</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9375rem' }}>
              {user.email} ·{' '}
              <span style={{ color: 'var(--color-accent)' }}>{matchCount} songs identified</span>
            </p>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <Link
              href="/"
              style={{
                padding: '10px 22px',
                borderRadius: 'var(--radius-pill)',
                background: 'var(--color-accent)',
                color: '#0a0a1a',
                fontWeight: 700,
                fontSize: '0.9rem',
                textDecoration: 'none',
              }}
            >
              Identify a song
            </Link>
            <LogoutButton />
          </div>
        </div>

        {/* ── Stats ───────────────────────────────────────────────────────── */}
        <div
          className="animate-fade-in-up"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 'var(--space-4)',
            marginBottom: 'var(--space-8)',
            animationDelay: '0.08s',
          }}
        >
          {[
            { label: 'Total searches', value: items.length },
            { label: 'Songs matched', value: matchCount },
            { label: 'No matches', value: items.length - matchCount },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{
                padding: 'var(--space-5)',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: 'var(--radius-lg)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', color: 'var(--color-accent)', marginBottom: '4px' }}>
                {value}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* ── History list ─────────────────────────────────────────────────── */}
        <section
          className="animate-fade-in-up"
          aria-label="Match history"
          style={{ animationDelay: '0.16s' }}
        >
          {error && (
            <div
              role="alert"
              style={{
                padding: 'var(--space-5)',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 'var(--radius-md)',
                color: '#fca5a5',
                marginBottom: 'var(--space-4)',
              }}
            >
              Failed to load history: {error.message}
            </div>
          )}

          {items.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: 'var(--space-16) var(--space-6)',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: 'var(--radius-xl)',
              }}
            >
              <svg width="56" height="56" viewBox="0 0 56 56" fill="none" style={{ margin: '0 auto 20px' }} aria-hidden="true">
                <circle cx="28" cy="28" r="20" stroke="var(--color-border)" strokeWidth="2" fill="none" />
                <circle cx="28" cy="28" r="7" stroke="var(--color-text-dim)" strokeWidth="2" fill="none" />
                <line x1="28" y1="8" x2="28" y2="14" stroke="var(--color-border)" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <h3 style={{ marginBottom: '10px', color: 'var(--color-text-muted)' }}>No history yet</h3>
              <p style={{ color: 'var(--color-text-dim)', fontSize: '0.9375rem', marginBottom: 'var(--space-6)' }}>
                Go identify a song to see it appear here.
              </p>
              <Link
                href="/"
                style={{
                  display: 'inline-flex', padding: '12px 28px',
                  background: 'var(--color-accent)', color: '#0a0a1a',
                  fontWeight: 700, fontSize: '0.9375rem',
                  textDecoration: 'none', borderRadius: 'var(--radius-pill)',
                }}
              >
                Identify a song
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {items.map((item) => (
                <HistoryCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
