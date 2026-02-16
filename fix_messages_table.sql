-- Comprehensive Fix for Messages Table
-- 1. Ensure 'image_url' column exists
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS image_url text;
-- 2. Ensure 'reply_to_id' column exists
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.messages(id) ON DELETE
SET NULL;
-- 3. Ensure forwarding columns exist
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS is_forwarded BOOLEAN DEFAULT FALSE;
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS forwarded_from_chat_id UUID REFERENCES public.chats(id) ON DELETE
SET NULL;
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS forwarded_from_message_id UUID REFERENCES public.messages(id) ON DELETE
SET NULL;
-- 4. Create Index for replies if not exists
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON public.messages(reply_to_id);
-- 5. Ensure update_chat_timestamp function is SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.update_chat_timestamp() RETURNS TRIGGER AS $$ BEGIN
UPDATE public.chats
SET updated_at = NEW.created_at
WHERE id = NEW.chat_id;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- 6. Ensure Trigger exists
DROP TRIGGER IF EXISTS on_message_sent ON public.messages;
CREATE TRIGGER on_message_sent
AFTER
INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_chat_timestamp();
-- 7. Refresh Policies (Just to be safe)
-- Policy for Sending Messages
DROP POLICY IF EXISTS "send_messages" ON public.messages;
CREATE POLICY "send_messages" ON public.messages FOR
INSERT WITH CHECK (
        auth.uid() = sender_id
        AND chat_id IN (
            SELECT chat_id
            FROM public.chat_members
            WHERE user_id = auth.uid()
        )
    );
-- Policy for Viewing Messages
DROP POLICY IF EXISTS "view_messages" ON public.messages;
CREATE POLICY "view_messages" ON public.messages FOR
SELECT USING (
        chat_id IN (
            SELECT chat_id
            FROM public.chat_members
            WHERE user_id = auth.uid()
        )
    );
-- Policy for Updating Own Messages
DROP POLICY IF EXISTS "update_own_messages" ON public.messages;
CREATE POLICY "update_own_messages" ON public.messages FOR
UPDATE USING (auth.uid() = sender_id) WITH CHECK (auth.uid() = sender_id);
-- Policy for Deleting Own Messages
DROP POLICY IF EXISTS "delete_own_messages" ON public.messages;
CREATE POLICY "delete_own_messages" ON public.messages FOR DELETE USING (auth.uid() = sender_id);