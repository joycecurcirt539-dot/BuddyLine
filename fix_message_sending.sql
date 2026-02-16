-- Fix Message Sending Issues (Consolidated)
-- 1. Ensure Columns Exist (Safe Idempotent Checks)
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.messages(id) ON DELETE
SET NULL;
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS is_forwarded BOOLEAN DEFAULT FALSE;
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS forwarded_from_chat_id UUID REFERENCES public.chats(id) ON DELETE
SET NULL;
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS forwarded_from_message_id UUID REFERENCES public.messages(id) ON DELETE
SET NULL;
-- 2. Enable RLS (Ensure it's on)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
-- 3. Fix "Update Chats" Permission
-- Users need to update the chat timestamp when sending a message.
-- While the trigger handles this, explicit permission prevents some edge cases.
DROP POLICY IF EXISTS "update_chats" ON public.chats;
CREATE POLICY "update_chats" ON public.chats FOR
UPDATE USING (
        id IN (
            SELECT get_my_chat_ids()
        )
    );
-- 4. Fix "Send Messages" Policy (Use Helper to avoid Recursion)
DROP POLICY IF EXISTS "send_messages" ON public.messages;
CREATE POLICY "send_messages" ON public.messages FOR
INSERT WITH CHECK (
        auth.uid() = sender_id
        AND chat_id IN (
            SELECT get_my_chat_ids()
        )
    );
-- 5. Fix "View Messages" Policy
DROP POLICY IF EXISTS "view_messages" ON public.messages;
CREATE POLICY "view_messages" ON public.messages FOR
SELECT USING (
        chat_id IN (
            SELECT get_my_chat_ids()
        )
    );
-- 6. Ensure Trigger Function is Security Definer
CREATE OR REPLACE FUNCTION public.update_chat_timestamp() RETURNS TRIGGER AS $$ BEGIN
UPDATE public.chats
SET updated_at = NEW.created_at
WHERE id = NEW.chat_id;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- 7. Ensure Trigger is Bound
DROP TRIGGER IF EXISTS on_message_sent ON public.messages;
CREATE TRIGGER on_message_sent
AFTER
INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_chat_timestamp();