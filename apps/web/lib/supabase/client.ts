/**
 * supabase/client.ts
 * Browser-side Supabase client for the SoundFind web app.
 *
 * Use this in Client Components ('use client') and hooks.
 * Uses the public anon key — all access is governed by RLS policies.
 *
 * Never import the service-role key here. That lives server-side only.
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

/**
 * Creates a browser Supabase client singleton.
 *
 * @returns Supabase client for use in client-side code.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
