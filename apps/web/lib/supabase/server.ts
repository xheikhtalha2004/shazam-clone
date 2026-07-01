/**
 * supabase/server.ts
 * Server-side Supabase client for the SoundFind web app.
 *
 * Use this in Server Components, Server Actions, and Route Handlers.
 * Reads cookies to restore the authenticated user session on the server.
 *
 * This file uses NEXT_PUBLIC_SUPABASE_ANON_KEY only — the service-role key
 * is never used in Next.js code (only in the Python backend).
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './types';

/**
 * Creates a server-side Supabase client that reads/writes cookies
 * to maintain the user session across SSR and Route Handlers.
 *
 * @returns Supabase client configured for server-side use.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll can be called from a Server Component — ignore the error.
            // The middleware handles session refresh in those cases.
          }
        },
      },
    }
  );
}
