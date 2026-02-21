-- ============================================================
-- BuddyLine — Calling System Schema
-- ============================================================
-- 1. Types
DO $$ BEGIN CREATE TYPE call_status AS ENUM (
    'ringing',
    'active',
    'ended',
    'failed',
    'declined'
);
CREATE TYPE call_type AS ENUM ('audio', 'video', 'screen', 'mixed');
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
-- 2. Tables
CREATE TABLE IF NOT EXISTS public.calls (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    caller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    callee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type call_type NOT NULL,
    status call_status DEFAULT 'ringing',
    relay_type TEXT DEFAULT 'p2p',
    created_at TIMESTAMPTZ DEFAULT now(),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_seconds INT DEFAULT 0
);
CREATE TABLE IF NOT EXISTS public.call_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    call_id UUID REFERENCES public.calls(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role TEXT CHECK (role IN ('caller', 'callee')),
    joined_at TIMESTAMPTZ DEFAULT now(),
    left_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS public.user_call_settings (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
    audio_device_id TEXT,
    video_device_id TEXT,
    facing_mode TEXT DEFAULT 'user',
    screen_quality INT DEFAULT 720,
    screen_fps INT DEFAULT 30,
    updated_at TIMESTAMPTZ DEFAULT now()
);
-- 3. Row Level Security (RLS)
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_call_settings ENABLE ROW LEVEL SECURITY;
-- 3.1 Calls Policies
DROP POLICY IF EXISTS "view_calls" ON public.calls;
CREATE POLICY "view_calls" ON public.calls FOR
SELECT USING (
        auth.uid() = caller_id
        OR auth.uid() = callee_id
    );
DROP POLICY IF EXISTS "insert_calls" ON public.calls;
CREATE POLICY "insert_calls" ON public.calls FOR
INSERT WITH CHECK (auth.uid() = caller_id);
DROP POLICY IF EXISTS "update_calls" ON public.calls;
CREATE POLICY "update_calls" ON public.calls FOR
UPDATE USING (
        auth.uid() = caller_id
        OR auth.uid() = callee_id
    );
-- 3.2 Call Participants Policies
DROP POLICY IF EXISTS "view_call_participants" ON public.call_participants;
CREATE POLICY "view_call_participants" ON public.call_participants FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.calls
            WHERE id = call_participants.call_id
                AND (
                    caller_id = auth.uid()
                    OR callee_id = auth.uid()
                )
        )
    );
-- 3.3 User Call Settings Policies
DROP POLICY IF EXISTS "view_own_settings" ON public.user_call_settings;
CREATE POLICY "view_own_settings" ON public.user_call_settings FOR
SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_settings" ON public.user_call_settings;
CREATE POLICY "update_own_settings" ON public.user_call_settings FOR
UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_settings" ON public.user_call_settings;
CREATE POLICY "insert_own_settings" ON public.user_call_settings FOR
INSERT WITH CHECK (auth.uid() = user_id);
-- 4. Realtime
-- Enable realtime for calls table to listen for status changes
DO $$ BEGIN ALTER PUBLICATION supabase_realtime
ADD TABLE public.calls;
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;