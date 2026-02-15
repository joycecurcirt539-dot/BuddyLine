-- Add is_verified column to profiles for verification badges
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
-- Auto-verify buddy_test for AI badge logic (though we check username, this is good for consistency)
UPDATE public.profiles
SET is_verified = true
WHERE username = 'buddy_test';