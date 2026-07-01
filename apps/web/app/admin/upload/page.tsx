'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Input } from '@/components/ui/Input';
import type { IngestResponse } from '@/types';

// ── File dropzone ──────────────────────────────────────────────────────────────
function FileDropzone({
  accept,
  onFile,
  label,
  selectedFile,
}: {
  accept: string;
  onFile: (file: File) => void;
  label: string;
  selectedFile: File | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <div>
      <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: '8px' }}>
        {label} <span style={{ color: 'var(--color-destructive)' }}>*</span>
      </p>
      <div
        role="button"
        tabIndex={0}
        aria-label={`Upload ${label}`}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragging ? 'var(--color-accent)' : selectedFile ? 'rgba(34,197,94,0.5)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '28px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? 'rgba(34,197,94,0.05)' : selectedFile ? 'rgba(34,197,94,0.04)' : 'var(--color-surface-2)',
          transition: 'border-color var(--duration-fast), background var(--duration-fast)',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
        />

        {selectedFile ? (
          <>
            <div style={{ color: 'var(--color-accent)', marginBottom: '6px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ display: 'inline' }} aria-hidden="true">
                <path d="M5 12L10 17L19 7" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--color-text)' }}>{selectedFile.name}</p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-dim)', marginTop: '4px' }}>
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Click to replace
            </p>
          </>
        ) : (
          <>
            <div style={{ marginBottom: '10px' }} aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ display: 'inline' }}>
                <path d="M16 4v16M8 12l8-8 8 8" stroke="var(--color-text-dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 24h24" stroke="var(--color-text-dim)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <p style={{ fontWeight: 500, fontSize: '0.9375rem', color: 'var(--color-text-muted)' }}>
              Drop file here or click to browse
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-dim)', marginTop: '6px' }}>
              {accept}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ── Success panel ──────────────────────────────────────────────────────────────
function SuccessPanel({ result, onReset }: { result: IngestResponse; onReset: () => void }) {
  return (
    <div
      className="animate-scale-in"
      style={{
        padding: 'var(--space-8)',
        background: 'rgba(34,197,94,0.06)',
        border: '1px solid rgba(34,197,94,0.3)',
        borderRadius: 'var(--radius-xl)',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '60px', height: '60px', borderRadius: '50%',
          background: 'rgba(34,197,94,0.15)',
          border: '2px solid var(--color-accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto var(--space-5)',
        }}
        aria-hidden="true"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M5 12L10 17L19 7" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 style={{ color: 'var(--color-accent)', marginBottom: 'var(--space-3)' }}>Track indexed!</h2>

      <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', textAlign: 'left' }}>
        {[
          ['Title', result.title],
          ['Artist', result.artist],
          ['Fingerprints', result.fingerprint_count.toLocaleString()],
          ['Duration', result.duration_seconds != null ? `${Math.floor(result.duration_seconds / 60)}:${String(result.duration_seconds % 60).padStart(2, '0')}` : 'Unknown'],
          ['Processing time', `${result.processing_time_seconds}s`],
          ['Track ID', result.track_id.slice(0, 8) + '…'],
        ].map(([k, v]) => (
          <div key={k} style={{ padding: 'var(--space-3)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-subtle)' }}>
            <dt style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginBottom: '4px' }}>{k}</dt>
            <dd style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text)' }}>{v}</dd>
          </div>
        ))}
      </dl>

      <button
        onClick={onReset}
        style={{
          padding: '12px 32px', borderRadius: 'var(--radius-pill)',
          background: 'var(--color-accent)', color: '#0a0a1a',
          border: 'none', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.9375rem',
          cursor: 'pointer',
        }}
      >
        Index another track
      </button>
    </div>
  );
}

// ── Admin Upload page ──────────────────────────────────────────────────────────
export default function AdminUploadPage() {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IngestResponse | null>(null);

  const canSubmit = title.trim() && artist.trim() && audioFile && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('artist', artist.trim());
    if (album.trim()) formData.append('album', album.trim());
    formData.append('audio_file', audioFile!);

    try {
      // POST to the Next.js proxy route — ADMIN_API_KEY stays server-side
      const res = await fetch('/api/admin/ingest', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || body.error || `Error ${res.status}`);
      }

      const data: IngestResponse = await res.json();
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setTitle('');
    setArtist('');
    setAlbum('');
    setAudioFile(null);
    setError(null);
  };

  return (
    <div className="bg-mesh" style={{ minHeight: '100dvh' }}>
      <Navbar />

      <main id="main-content" className="container" style={{ paddingTop: 'var(--space-10)', paddingBottom: 'var(--space-12)', maxWidth: '680px' }}>
        {/* Header */}
        <div className="animate-fade-in-up" style={{ marginBottom: 'var(--space-8)' }}>
          <Link
            href="/"
            style={{ fontSize: '0.875rem', color: 'var(--color-text-dim)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: 'var(--space-4)' }}
          >
            ← Back to SoundFind
          </Link>
          <h1 style={{ marginBottom: '8px' }}>Index a New Track</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9375rem' }}>
            Upload an audio file. The backend will extract fingerprints and add it to the recognition catalogue.
          </p>
        </div>

        {result ? (
          <SuccessPanel result={result} onReset={handleReset} />
        ) : (
          <form
            onSubmit={handleSubmit}
            className="animate-fade-in-up"
            noValidate
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', animationDelay: '0.1s' }}
          >
            {/* Error */}
            {error && (
              <div role="alert" aria-live="assertive" style={{ padding: '14px 18px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 'var(--radius-md)', color: '#fca5a5', fontSize: '0.9rem' }}>
                {error}
              </div>
            )}

            {/* Metadata */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <Input label="Title" id="track-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Song title" required />
              <Input label="Artist" id="track-artist" value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Artist name" required />
            </div>
            <Input label="Album" id="track-album" value={album} onChange={(e) => setAlbum(e.target.value)} placeholder="Album name (optional)" helper="Leave blank if not part of an album" />

            {/* Audio file */}
            <FileDropzone
              label="Audio file"
              accept=".mp3,.wav,.flac,.m4a,.ogg,.aac"
              onFile={setAudioFile}
              selectedFile={audioFile}
            />

            {/* Submit */}
            <button
              type="submit"
              id="upload-submit"
              disabled={!canSubmit}
              aria-busy={loading}
              style={{
                height: '56px', width: '100%',
                background: canSubmit ? 'var(--color-accent)' : 'var(--color-surface-3)',
                color: canSubmit ? '#0a0a1a' : 'var(--color-text-dim)',
                border: 'none', borderRadius: 'var(--radius-pill)',
                fontFamily: 'var(--font-body)', fontSize: '1.0625rem', fontWeight: 700,
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                transition: 'background var(--duration-fast), box-shadow var(--duration-fast)',
                boxShadow: canSubmit ? 'var(--shadow-glow-green)' : 'none',
              }}
            >
              {loading ? (
                <>
                  <span aria-hidden="true" style={{ width: '20px', height: '20px', border: '2.5px solid rgba(0,0,0,0.3)', borderTopColor: '#0a0a1a', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  Uploading &amp; fingerprinting…
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M10 2v10M5 7l5-5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2 16h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Upload &amp; Index Track
                </>
              )}
            </button>

            <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--color-text-dim)' }}>
              Supported formats: MP3, WAV, FLAC, M4A, OGG, AAC · Max 30 MB
            </p>
          </form>
        )}
      </main>
    </div>
  );
}
