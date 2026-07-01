/**
 * supabase/types.ts
 * Auto-generated Supabase database type stubs for SoundFind.
 *
 * In production, generate this file automatically with:
 *   npx supabase gen types typescript --project-id <your-project-id> > lib/supabase/types.ts
 *
 * For now this provides a minimal typed interface that matches our schema.
 */

export type Database = {
  public: {
    Tables: {
      tracks: {
        Row: {
          id: string;
          title: string;
          artist: string;
          album: string | null;
          duration: number | null;
          audio_url: string;
          cover_url: string | null;
          fingerprinted: boolean;
          fingerprint_count: number;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          artist: string;
          album?: string | null;
          duration?: number | null;
          audio_url: string;
          cover_url?: string | null;
          fingerprinted?: boolean;
          fingerprint_count?: number;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['tracks']['Insert']>;
      };
      audio_fingerprints: {
        Row: {
          id: number;
          track_id: string;
          hash: string;
          offset_time: number;
        };
        Insert: {
          track_id: string;
          hash: string;
          offset_time: number;
        };
        Update: never;
      };
      match_history: {
        Row: {
          id: string;
          user_id: string | null;
          track_id: string | null;
          confidence: number;
          matched: boolean;
          matched_at: string;
          session_id: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          track_id?: string | null;
          confidence: number;
          matched: boolean;
          matched_at?: string;
          session_id?: string | null;
        };
        Update: Partial<Database['public']['Tables']['match_history']['Insert']>;
      };
      profiles: {
        Row: {
          id: string;
          role: 'user' | 'admin';
        };
        Insert: {
          id: string;
          role?: 'user' | 'admin';
        };
        Update: {
          role?: 'user' | 'admin';
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
