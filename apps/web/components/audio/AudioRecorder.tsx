'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { RecognizeResponse } from '@/types';

// ── Types ──────────────────────────────────────────────────────────────────────
type RecorderState = 'idle' | 'requesting' | 'recording' | 'processing' | 'done' | 'error';

interface AudioRecorderProps {
  onResult: (result: RecognizeResponse) => void;
  onError?: (message: string) => void;
  recordingDuration?: number; // seconds, default 7
}

// ── Constants ──────────────────────────────────────────────────────────────────
const SAMPLE_DURATION = 7; // seconds
const API_URL = process.env.NEXT_PUBLIC_MATCHER_API_URL ?? 'http://localhost:8000';

// ── Waveform animation bars ────────────────────────────────────────────────────
function WaveBars({ active }: { active: boolean }) {
  const barCount = 5;
  return (
    <div
      aria-hidden="true"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        height: '28px',
      }}
    >
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          style={{
            width: '4px',
            borderRadius: '2px',
            background: 'var(--color-accent)',
            height: active ? `${Math.random() * 60 + 20}%` : '20%',
            transition: 'height 0.12s ease',
            animation: active
              ? `wavebar 0.6s ease-in-out ${i * 0.1}s infinite alternate`
              : 'none',
          }}
        />
      ))}
      <style>{`
        @keyframes wavebar {
          from { height: 20%; }
          to   { height: 80%; }
        }
      `}</style>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function AudioRecorder({
  onResult,
  onError,
  recordingDuration = SAMPLE_DURATION,
}: AudioRecorderProps) {
  const [state, setState] = useState<RecorderState>('idle');
  const [countdown, setCountdown] = useState(recordingDuration);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current ?? undefined);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ── Handle recording completion ───────────────────────────────────────────
  const handleRecordingStop = useCallback(
    async (chunks: Blob[]) => {
      setState('processing');

      const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
      const blob = new Blob(chunks, { type: mimeType });

      try {
        const formData = new FormData();
        formData.append('audio_file', blob, `clip.${mimeType.includes('mp4') ? 'm4a' : 'webm'}`);

        const response = await fetch(`${API_URL}/recognize`, {
          method: 'POST',
          headers: {
            'x-admin-api-key': process.env.NEXT_PUBLIC_MATCHER_API_KEY ?? '',
          },
          body: formData,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.detail || `Server error: ${response.status}`);
        }

        const result: RecognizeResponse = await response.json();
        setState('done');
        onResult(result);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Recognition failed. Please try again.';
        setErrorMessage(msg);
        setState('error');
        onError?.(msg);
      }
    },
    [onResult, onError]
  );

  // ── Start recording ───────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    setErrorMessage(null);
    setState('requesting');

    // Check browser support
    if (!navigator.mediaDevices?.getUserMedia) {
      const msg = 'Your browser does not support audio recording.';
      setErrorMessage(msg);
      setState('error');
      onError?.(msg);
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
    } catch (err: unknown) {
      const msg =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Microphone access denied. Please allow microphone access and try again.'
          : 'Could not access microphone. Please check your device settings.';
      setErrorMessage(msg);
      setState('error');
      onError?.(msg);
      return;
    }

    // Choose best supported MIME type
    const mimeType = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ].find((type) => MediaRecorder.isTypeSupported(type)) ?? '';

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    mediaRecorderRef.current = recorder;
    audioChunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      handleRecordingStop(audioChunksRef.current);
    };

    recorder.start(250); // collect data every 250ms
    setState('recording');
    setCountdown(recordingDuration);

    // Auto-stop countdown
    let remaining = recordingDuration;
    timerRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(timerRef.current ?? undefined);
        recorder.stop();
      }
    }, 1000);
  }, [recordingDuration, handleRecordingStop, onError]);

  // ── Manual stop ───────────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    clearInterval(timerRef.current ?? undefined);
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setState('idle');
    setErrorMessage(null);
    setCountdown(recordingDuration);
  }, [recordingDuration]);

  // ── Derived state ─────────────────────────────────────────────────────────
  const isRecording = state === 'recording';
  const isProcessing = state === 'processing';
  const isRequesting = state === 'requesting';
  const isError = state === 'error';
  const isDone = state === 'done';

  // ── Button label ──────────────────────────────────────────────────────────
  const buttonLabel = {
    idle: 'Tap to Identify',
    requesting: 'Requesting mic…',
    recording: `Stop (${countdown}s)`,
    processing: 'Identifying…',
    done: 'Identify Again',
    error: 'Try Again',
  }[state];

  // ── Circle progress ring ──────────────────────────────────────────────────
  const CIRCLE_R = 90;
  const CIRCLE_C = 2 * Math.PI * CIRCLE_R;
  const progress = isRecording ? (countdown / recordingDuration) : 1;
  const dashOffset = CIRCLE_C * (1 - progress);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-8)',
      }}
    >
      {/* ── Main button ───────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', width: '220px', height: '220px' }}>
        {/* Animated progress ring */}
        {isRecording && (
          <svg
            width="220"
            height="220"
            viewBox="0 0 220 220"
            style={{
              position: 'absolute',
              inset: 0,
              transform: 'rotate(-90deg)',
              pointerEvents: 'none',
            }}
            aria-hidden="true"
          >
            <circle cx="110" cy="110" r={CIRCLE_R} fill="none" stroke="rgba(34,197,94,0.15)" strokeWidth="4" />
            <circle
              cx="110" cy="110" r={CIRCLE_R}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={CIRCLE_C}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
        )}

        {/* Pulse rings (when recording) */}
        {isRecording && (
          <>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid var(--color-accent)', opacity: 0, animation: 'pulse-ring 2s ease-out infinite' }} aria-hidden="true" />
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid var(--color-accent)', opacity: 0, animation: 'pulse-ring 2s ease-out 0.6s infinite' }} aria-hidden="true" />
          </>
        )}

        {/* Center button */}
        <button
          id="record-button"
          onClick={
            isRecording ? stopRecording :
            (isDone || isError) ? reset :
            (!isProcessing && !isRequesting) ? startRecording :
            undefined
          }
          disabled={isProcessing || isRequesting}
          aria-label={buttonLabel}
          aria-pressed={isRecording}
          style={{
            position: 'absolute',
            inset: '12px',
            borderRadius: '50%',
            border: 'none',
            cursor: isProcessing || isRequesting ? 'not-allowed' : 'pointer',
            background: isRecording
              ? 'radial-gradient(circle at 35% 35%, #7f1d1d, #450a0a)'
              : 'radial-gradient(circle at 35% 35%, #1a3a2a, #0a1f0f)',
            boxShadow: isRecording
              ? '0 0 0 2px #ef4444, 0 0 40px rgba(239,68,68,0.4), inset 0 2px 8px rgba(0,0,0,0.5)'
              : 'var(--shadow-glow-green), inset 0 2px 8px rgba(0,0,0,0.5)',
            animation: isRecording ? 'pulse-dot 2s ease-in-out infinite' : 'none',
            transition: 'box-shadow var(--duration-normal) var(--ease-out), background var(--duration-normal) var(--ease-out)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
          }}
        >
          {/* Icon */}
          {isProcessing ? (
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true"
              style={{ animation: 'spin 1.2s linear infinite' }}>
              <circle cx="20" cy="20" r="16" stroke="var(--color-accent)" strokeWidth="3" strokeDasharray="60 40" strokeLinecap="round" />
            </svg>
          ) : isRecording ? (
            /* Stop icon */
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
              <rect x="10" y="10" width="16" height="16" rx="3" fill="#ef4444" />
            </svg>
          ) : (
            /* Mic icon */
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
              <rect x="14" y="4" width="12" height="22" rx="6" fill="var(--color-accent)" />
              <path d="M8 20C8 27.2 13.4 33 20 33C26.6 33 32 27.2 32 20" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <line x1="20" y1="33" x2="20" y2="38" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="13" y1="38" x2="27" y2="38" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          )}

          {/* Wave bars (recording state only) */}
          {isRecording && <WaveBars active />}

          {/* Label */}
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: isRecording ? '#fca5a5' : 'var(--color-accent)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {buttonLabel}
          </span>
        </button>
      </div>

      {/* ── Error message ─────────────────────────────────────────────────── */}
      {isError && errorMessage && (
        <div
          role="alert"
          style={{
            padding: '14px 20px',
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#fca5a5',
            fontSize: '0.9rem',
            textAlign: 'center',
            maxWidth: '380px',
            animation: 'fade-in-up 0.25s var(--ease-out)',
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* ── Help text ─────────────────────────────────────────────────────── */}
      {state === 'idle' && (
        <p
          style={{
            color: 'var(--color-text-dim)',
            fontSize: '0.875rem',
            textAlign: 'center',
          }}
        >
          Hold your device near the music source for best results
        </p>
      )}
    </div>
  );
}
