-- Add parent_id column to comments table for threaded replies
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;
-- Create index for faster reply lookups
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_id);