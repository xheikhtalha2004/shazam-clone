/**
 * /api/admin/ingest/route.ts
 * Secure proxy: forwards admin track uploads to the Python backend
 * without ever exposing ADMIN_API_KEY to the browser.
 *
 * Flow:
 *   Browser → POST /api/admin/ingest (multipart/form-data)
 *     → This route adds x-admin-api-key header
 *       → Python backend POST /admin/ingest-track
 *         → JSON response back to browser
 */

import { NextRequest, NextResponse } from 'next/server';

// These are server-only environment variables — never sent to the client
const MATCHER_API_URL = process.env.MATCHER_API_URL;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── Validate server config ─────────────────────────────────────────────────
  if (!MATCHER_API_URL || !ADMIN_API_KEY) {
    console.error('[/api/admin/ingest] Missing MATCHER_API_URL or ADMIN_API_KEY env vars');
    return NextResponse.json(
      { error: 'Server misconfiguration. Contact the administrator.' },
      { status: 500 }
    );
  }

  // ── Read incoming form data from the browser ──────────────────────────────
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid request body. Expected multipart/form-data.' },
      { status: 400 }
    );
  }

  // Basic field validation
  const title = formData.get('title');
  const artist = formData.get('artist');
  const audioFile = formData.get('audio_file');

  if (!title || !artist) {
    return NextResponse.json({ error: 'title and artist are required fields.' }, { status: 400 });
  }
  if (!audioFile || !(audioFile instanceof Blob)) {
    return NextResponse.json({ error: 'audio_file is required.' }, { status: 400 });
  }

  // ── Forward to Python backend ──────────────────────────────────────────────
  const backendUrl = `${MATCHER_API_URL}/admin/ingest-track`;

  let backendResponse: Response;
  try {
    backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        // Inject the secret API key — this never travels to the browser
        'x-admin-api-key': ADMIN_API_KEY,
      },
      // Forward the entire FormData as-is (Next.js will set correct Content-Type)
      body: formData,
    });
  } catch (networkErr) {
    console.error('[/api/admin/ingest] Network error reaching Python backend:', networkErr);
    return NextResponse.json(
      { error: 'Could not reach the fingerprinting service. Is the backend running?' },
      { status: 502 }
    );
  }

  // ── Parse and relay the backend response ──────────────────────────────────
  const responseBody = await backendResponse.json().catch(() => ({
    error: 'Backend returned a non-JSON response.',
  }));

  return NextResponse.json(responseBody, { status: backendResponse.status });
}
