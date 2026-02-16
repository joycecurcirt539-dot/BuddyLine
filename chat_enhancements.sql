-- Add support for replies
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.messages(id) ON DELETE
SET NULL;
-- Add support for forwarding
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS is_forwarded BOOLEAN DEFAULT FALSE;
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS forwarded_from_chat_id UUID REFERENCES public.chats(id) ON DELETE
SET NULL;
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS forwarded_from_message_id UUID REFERENCES public.messages(id) ON DELETE
SET NULL;
-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON public.messages(reply_to_id);