-- ============================================================
-- BuddyLine — Reliable Signaling Table
-- Run this in the Supabase SQL Editor to fix 'Connecting' issues
-- ============================================================
-- 1. Create the signaling table
CREATE TABLE IF NOT EXISTS public.call_signals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    call_id UUID REFERENCES public.calls(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    signal_type TEXT NOT NULL,
    -- 'OFFER', 'ANSWER'
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
-- 2. Index for performance
CREATE INDEX IF NOT EXISTS idx_call_signals_call_id ON public.call_signals(call_id);
CREATE INDEX IF NOT EXISTS idx_call_signals_receiver_id ON public.call_signals(receiver_id);
-- 3. Enable RLS
ALTER TABLE public.call_signals ENABLE ROW LEVEL SECURITY;
-- 4. Policies
DROP POLICY IF EXISTS "view_call_signals" ON public.call_signals;
CREATE POLICY "view_call_signals" ON public.call_signals FOR
SELECT USING (
        auth.uid() = sender_id
        OR auth.uid() = receiver_id
    );
DROP POLICY IF EXISTS "insert_call_signals" ON public.call_signals;
CREATE POLICY "insert_call_signals" ON public.call_signals FOR
INSERT WITH CHECK (auth.uid() = sender_id);
-- 5. Enable Realtime
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'call_signals'
) THEN ALTER PUBLICATION supabase_realtime
ADD TABLE public.call_signals;
END IF;
EXCEPTION
WHEN OTHERS THEN NULL;
END $$;