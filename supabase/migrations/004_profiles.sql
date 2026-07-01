-- ============================================================
-- Migration 004: profiles table + auto-create trigger
-- Extends auth.users with app-level role ('user' | 'admin').
-- ============================================================

CREATE TABLE profiles (
    -- 1:1 with auth.users
    id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Role-based access control
    -- 'user'  → standard authenticated user
    -- 'admin' → can upload tracks, trigger fingerprinting
    role  TEXT NOT NULL DEFAULT 'user'
              CHECK (role IN ('user', 'admin'))
);

-- ── Auto-create profile on signup ──────────────────────────
-- Trigger fires after every new user is created in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_new_user();

-- ── Row Level Security ──────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users: read own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile (except role — service role only)
CREATE POLICY "Users: update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id AND role = 'user'); -- cannot self-promote to admin

-- ── Manually promote a user to admin ───────────────────────
-- Run this in the Supabase SQL editor to create your first admin:
--
--   UPDATE profiles SET role = 'admin' WHERE id = '<your-user-uuid>';
--
-- Or use the service role client in your backend:
--   supabase.table("profiles").update({"role": "admin"}).eq("id", user_id).execute()

-- ── Upgrade tracks admin policies now that profiles exists ──
-- The policies created in 001_tracks.sql used WITH CHECK (FALSE) as placeholders
-- because profiles didn't exist yet. Now we drop and replace them with the real ones.

DROP POLICY IF EXISTS "Admin: can insert tracks" ON tracks;
DROP POLICY IF EXISTS "Admin: can update tracks" ON tracks;
DROP POLICY IF EXISTS "Admin: can delete tracks" ON tracks;

-- Only admins (profiles.role = 'admin') can insert new tracks
CREATE POLICY "Admin: can insert tracks"
    ON tracks FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
        )
    );

-- Only admins can update tracks (e.g. mark as fingerprinted)
CREATE POLICY "Admin: can update tracks"
    ON tracks FOR UPDATE
    USING (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
        )
    );

-- Only admins can delete tracks
CREATE POLICY "Admin: can delete tracks"
    ON tracks FOR DELETE
    USING (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
        )
    );

