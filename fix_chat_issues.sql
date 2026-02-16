-- 1. Add updated_at to chats for sorting
ALTER TABLE public.chats
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
-- 2. Function to update chat timestamp
CREATE OR REPLACE FUNCTION public.update_chat_timestamp() RETURNS TRIGGER AS $$ BEGIN
UPDATE public.chats
SET updated_at = NEW.created_at
WHERE id = NEW.chat_id;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- 3. Trigger to update chat timestamp on new message
DROP TRIGGER IF EXISTS on_message_sent ON public.messages;
CREATE TRIGGER on_message_sent
AFTER
INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_chat_timestamp();
-- 4. RLS Policy for Editing Messages
-- Allow users to update their own messages (content and edited_at)
DROP POLICY IF EXISTS "update_own_messages" ON public.messages;
CREATE POLICY "update_own_messages" ON public.messages FOR
UPDATE USING (auth.uid() = sender_id) WITH CHECK (auth.uid() = sender_id);
-- 5. RLS Policy for Deleting Messages
DROP POLICY IF EXISTS "delete_own_messages" ON public.messages;
CREATE POLICY "delete_own_messages" ON public.messages FOR DELETE USING (auth.uid() = sender_id);
-- 6. Fix RLS for inserting messages if needed (ensure it's not too restrictive)
-- The existing policy "send_messages" checks chat membership, which is good.
-- But if the trigger tries to update 'chats', the user needs permission OR the function must be SECURITY DEFINER.
-- We made the function SECURITY DEFINER, so the trigger should work fine even if the user can't update 'chats' directly.