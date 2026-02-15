-- Add image_url to messages table
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS image_url text;