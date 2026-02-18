-- ============================================================
-- Enable Cascading User Deletion
-- Run this in Supabase SQL Editor to ensure related data is 
-- deleted when a user is removed from auth.users.
-- ============================================================
-- 1. Profiles: Link to auth.users
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- 2. Friendships: Link to public.profiles
ALTER TABLE public.friendships DROP CONSTRAINT IF EXISTS friendships_user_id_fkey,
    DROP CONSTRAINT IF EXISTS friendships_friend_id_fkey;
ALTER TABLE public.friendships
ADD CONSTRAINT friendships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.friendships
ADD CONSTRAINT friendships_friend_id_fkey FOREIGN KEY (friend_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
-- 3. Messages: Link to public.profiles
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE public.messages
ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
-- 4. Posts: Link to public.profiles
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_user_id_fkey;
ALTER TABLE public.posts
ADD CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
-- 5. Comments: Link to public.profiles
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_user_id_fkey;
ALTER TABLE public.comments
ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
-- Note: post_likes, post_views, and chat_members already have ON DELETE CASCADE in the complete schema.