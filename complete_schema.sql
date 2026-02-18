-- ============================================================
-- BuddyLine — Complete Database Schema
-- Run this ONCE in Supabase SQL Editor
-- ============================================================
-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- ============================================================
-- 1. TABLES
-- ============================================================
-- 1.1 Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    status TEXT CHECK (status IN ('online', 'offline', 'away')) DEFAULT 'offline',
    last_seen TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);
-- 1.2 Friendships
DO $$ BEGIN CREATE TYPE friendship_status AS ENUM ('pending', 'accepted', 'blocked');
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    friend_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status friendship_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, friend_id)
);
-- 1.3 Chats
DO $$ BEGIN CREATE TYPE chat_type AS ENUM ('direct', 'group');
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
CREATE TABLE IF NOT EXISTS public.chats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    type chat_type DEFAULT 'direct',
    name TEXT,
    image_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);
-- 1.4 Chat Members
CREATE TABLE IF NOT EXISTS public.chat_members (
    chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (chat_id, user_id)
);
-- 1.5 Messages
DO $$ BEGIN CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read');
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    status message_status DEFAULT 'sent',
    reply_to_id UUID REFERENCES public.messages(id) ON DELETE
    SET NULL,
        is_forwarded BOOLEAN DEFAULT FALSE,
        forwarded_from_chat_id UUID REFERENCES public.chats(id) ON DELETE
    SET NULL,
        forwarded_from_message_id UUID REFERENCES public.messages(id) ON DELETE
    SET NULL,
        edited_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
);
-- 1.6 Posts
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT,
    image_url TEXT,
    likes_count INT DEFAULT 0,
    views_count INT DEFAULT 0,
    edited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);
-- 1.7 Comments
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    edited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);
-- 1.8 Post Likes
CREATE TABLE IF NOT EXISTS public.post_likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(post_id, user_id)
);
-- 1.9 Post Views
CREATE TABLE IF NOT EXISTS public.post_views (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(post_id, user_id)
);
-- 1.10 Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE
    SET NULL,
        type TEXT NOT NULL,
        content TEXT,
        target_id UUID,
        target_preview TEXT,
        is_read BOOLEAN DEFAULT FALSE
);
-- ============================================================
-- 2. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON public.messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_members_user_id ON public.chat_members(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON public.friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON public.friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
-- ============================================================
-- 3. HELPER FUNCTIONS
-- ============================================================
-- 3.1 Get chat IDs for current user (prevents RLS recursion)
CREATE OR REPLACE FUNCTION get_my_chat_ids() RETURNS SETOF UUID LANGUAGE sql SECURITY DEFINER
SET search_path = public STABLE AS $$
SELECT chat_id
FROM chat_members
WHERE user_id = auth.uid();
$$;
-- 3.2 Create Direct Chat (Atomic)
DROP FUNCTION IF EXISTS public.create_new_chat(uuid);
CREATE OR REPLACE FUNCTION public.create_new_chat(target_user_id UUID) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE new_chat_id UUID;
is_friend BOOLEAN;
BEGIN -- Verify friendship
SELECT EXISTS (
        SELECT 1
        FROM public.friendships
        WHERE (
                (
                    user_id = auth.uid()
                    AND friend_id = target_user_id
                    AND status = 'accepted'
                )
                OR (
                    user_id = target_user_id
                    AND friend_id = auth.uid()
                    AND status = 'accepted'
                )
            )
    ) INTO is_friend;
IF NOT is_friend THEN RAISE EXCEPTION 'You can only start chats with friends.';
END IF;
-- Create chat
INSERT INTO public.chats (type)
VALUES ('direct')
RETURNING id INTO new_chat_id;
-- Add both members
INSERT INTO public.chat_members (chat_id, user_id)
VALUES (new_chat_id, auth.uid());
INSERT INTO public.chat_members (chat_id, user_id)
VALUES (new_chat_id, target_user_id);
RETURN new_chat_id;
END;
$$;
-- ============================================================
-- 4. TRIGGERS
-- ============================================================
-- 4.1 Update chat timestamp when a new message is sent
-- 4.1 Update chat timestamp when a new message is sent
CREATE OR REPLACE FUNCTION public.handle_message_sent() RETURNS TRIGGER AS $$
DECLARE v_recipient_id UUID;
BEGIN -- Update chat timestamp
UPDATE public.chats
SET updated_at = NEW.created_at
WHERE id = NEW.chat_id;
-- Notify participants
FOR v_recipient_id IN
SELECT user_id
FROM public.chat_members
WHERE chat_id = NEW.chat_id
    AND user_id != NEW.sender_id LOOP
INSERT INTO public.notifications (
        recipient_id,
        actor_id,
        type,
        content,
        target_id,
        target_preview
    )
VALUES (
        v_recipient_id,
        NEW.sender_id,
        CASE
            WHEN NEW.reply_to_id IS NOT NULL THEN 'message_reply'
            ELSE 'message_received'
        END,
        LEFT(NEW.content, 100),
        NEW.chat_id,
        LEFT(NEW.content, 50)
    );
END LOOP;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS on_message_sent ON public.messages;
CREATE TRIGGER on_message_sent
AFTER
INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.handle_message_sent();
-- 4.1.b Friendship Notifications
CREATE OR REPLACE FUNCTION public.handle_friendship_notification() RETURNS TRIGGER AS $$ BEGIN IF (TG_OP = 'INSERT') THEN
INSERT INTO public.notifications (recipient_id, actor_id, type)
VALUES (NEW.friend_id, NEW.user_id, 'friend_request');
ELSIF (TG_OP = 'UPDATE') THEN IF (
    OLD.status = 'pending'
    AND NEW.status = 'accepted'
) THEN
INSERT INTO public.notifications (recipient_id, actor_id, type)
VALUES (NEW.user_id, NEW.friend_id, 'friend_accept');
END IF;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS on_friendship_notification ON public.friendships;
CREATE TRIGGER on_friendship_notification
AFTER
INSERT
    OR
UPDATE ON public.friendships FOR EACH ROW EXECUTE FUNCTION public.handle_friendship_notification();
-- 4.2 Likes Counter & Notifications
CREATE OR REPLACE FUNCTION public.handle_new_like() RETURNS TRIGGER AS $$
DECLARE v_post_author_id UUID;
v_post_preview TEXT;
BEGIN -- Update count
UPDATE public.posts
SET likes_count = likes_count + 1
WHERE id = NEW.post_id;
-- Notify author
SELECT user_id,
    LEFT(content, 50) INTO v_post_author_id,
    v_post_preview
FROM public.posts
WHERE id = NEW.post_id;
IF v_post_author_id != NEW.user_id THEN
INSERT INTO public.notifications (
        recipient_id,
        actor_id,
        type,
        target_id,
        target_preview
    )
VALUES (
        v_post_author_id,
        NEW.user_id,
        'post_like',
        NEW.post_id,
        v_post_preview
    );
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE OR REPLACE FUNCTION public.handle_removed_like() RETURNS TRIGGER AS $$ BEGIN
UPDATE public.posts
SET likes_count = GREATEST(0, likes_count - 1)
WHERE id = OLD.post_id;
RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS on_like_created ON public.post_likes;
CREATE TRIGGER on_like_created
AFTER
INSERT ON public.post_likes FOR EACH ROW EXECUTE FUNCTION public.handle_new_like();
DROP TRIGGER IF EXISTS on_like_deleted ON public.post_likes;
CREATE TRIGGER on_like_deleted
AFTER DELETE ON public.post_likes FOR EACH ROW EXECUTE FUNCTION public.handle_removed_like();
-- 4.3 Views Counter
CREATE OR REPLACE FUNCTION public.handle_new_view() RETURNS TRIGGER AS $$ BEGIN
UPDATE public.posts
SET views_count = views_count + 1
WHERE id = NEW.post_id;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS on_view_created ON public.post_views;
CREATE TRIGGER on_view_created
AFTER
INSERT ON public.post_views FOR EACH ROW EXECUTE FUNCTION public.handle_new_view();
-- 4.4 Commentary Notifications
CREATE OR REPLACE FUNCTION public.handle_new_comment() RETURNS TRIGGER AS $$
DECLARE v_post_author_id UUID;
v_post_preview TEXT;
v_parent_author_id UUID;
BEGIN
SELECT user_id,
    LEFT(content, 50) INTO v_post_author_id,
    v_post_preview
FROM public.posts
WHERE id = NEW.post_id;
-- Notify post owner
IF v_post_author_id != NEW.user_id THEN
INSERT INTO public.notifications (
        recipient_id,
        actor_id,
        type,
        content,
        target_id,
        target_preview
    )
VALUES (
        v_post_author_id,
        NEW.user_id,
        'post_comment',
        LEFT(NEW.content, 100),
        NEW.post_id,
        v_post_preview
    );
END IF;
-- Notify parent comment owner if it's a reply
IF NEW.parent_id IS NOT NULL THEN
SELECT user_id INTO v_parent_author_id
FROM public.comments
WHERE id = NEW.parent_id;
IF v_parent_author_id IS NOT NULL
AND v_parent_author_id != NEW.user_id
AND v_parent_author_id != v_post_author_id THEN
INSERT INTO public.notifications (
        recipient_id,
        actor_id,
        type,
        content,
        target_id,
        target_preview
    )
VALUES (
        v_parent_author_id,
        NEW.user_id,
        'comment_reply',
        LEFT(NEW.content, 100),
        NEW.post_id,
        v_post_preview
    );
END IF;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS on_comment_created ON public.comments;
CREATE TRIGGER on_comment_created
AFTER
INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION public.handle_new_comment();
-- ============================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;
-- ── Profiles ──
DROP POLICY IF EXISTS "view_profiles" ON public.profiles;
CREATE POLICY "view_profiles" ON public.profiles FOR
SELECT USING (true);
DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
CREATE POLICY "insert_own_profile" ON public.profiles FOR
INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
CREATE POLICY "update_own_profile" ON public.profiles FOR
UPDATE USING (auth.uid() = id);
-- ── Friendships ──
DROP POLICY IF EXISTS "view_own_friendships" ON public.friendships;
CREATE POLICY "view_own_friendships" ON public.friendships FOR
SELECT USING (
        auth.uid() = user_id
        OR auth.uid() = friend_id
    );
DROP POLICY IF EXISTS "insert_friendships" ON public.friendships;
CREATE POLICY "insert_friendships" ON public.friendships FOR
INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_friendships" ON public.friendships;
CREATE POLICY "update_friendships" ON public.friendships FOR
UPDATE USING (
        auth.uid() = user_id
        OR auth.uid() = friend_id
    );
DROP POLICY IF EXISTS "delete_friendships" ON public.friendships;
CREATE POLICY "delete_friendships" ON public.friendships FOR DELETE USING (
    auth.uid() = user_id
    OR auth.uid() = friend_id
);
-- ── Chats ──
DROP POLICY IF EXISTS "create_chats" ON public.chats;
CREATE POLICY "create_chats" ON public.chats FOR
INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "view_chats" ON public.chats;
CREATE POLICY "view_chats" ON public.chats FOR
SELECT USING (
        id IN (
            SELECT get_my_chat_ids()
        )
    );
DROP POLICY IF EXISTS "update_chats" ON public.chats;
CREATE POLICY "update_chats" ON public.chats FOR
UPDATE USING (
        id IN (
            SELECT get_my_chat_ids()
        )
    );
DROP POLICY IF EXISTS "delete_chats" ON public.chats;
CREATE POLICY "delete_chats" ON public.chats FOR DELETE USING (
    id IN (
        SELECT get_my_chat_ids()
    )
);
-- ── Chat Members ──
DROP POLICY IF EXISTS "add_members" ON public.chat_members;
CREATE POLICY "add_members" ON public.chat_members FOR
INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "view_members" ON public.chat_members;
CREATE POLICY "view_members" ON public.chat_members FOR
SELECT USING (
        chat_id IN (
            SELECT get_my_chat_ids()
        )
    );
DROP POLICY IF EXISTS "delete_members" ON public.chat_members;
CREATE POLICY "delete_members" ON public.chat_members FOR DELETE USING (user_id = auth.uid());
-- ── Messages ──
DROP POLICY IF EXISTS "send_messages" ON public.messages;
CREATE POLICY "send_messages" ON public.messages FOR
INSERT WITH CHECK (
        auth.uid() = sender_id
        AND chat_id IN (
            SELECT get_my_chat_ids()
        )
    );
DROP POLICY IF EXISTS "view_messages" ON public.messages;
CREATE POLICY "view_messages" ON public.messages FOR
SELECT USING (
        chat_id IN (
            SELECT get_my_chat_ids()
        )
    );
DROP POLICY IF EXISTS "update_own_messages" ON public.messages;
CREATE POLICY "update_own_messages" ON public.messages FOR
UPDATE USING (auth.uid() = sender_id) WITH CHECK (auth.uid() = sender_id);
DROP POLICY IF EXISTS "delete_own_messages" ON public.messages;
CREATE POLICY "delete_own_messages" ON public.messages FOR DELETE USING (auth.uid() = sender_id);
-- ── Posts ──
DROP POLICY IF EXISTS "view_posts" ON public.posts;
CREATE POLICY "view_posts" ON public.posts FOR
SELECT USING (true);
DROP POLICY IF EXISTS "insert_own_posts" ON public.posts;
CREATE POLICY "insert_own_posts" ON public.posts FOR
INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_posts" ON public.posts;
CREATE POLICY "update_own_posts" ON public.posts FOR
UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_posts" ON public.posts;
CREATE POLICY "delete_own_posts" ON public.posts FOR DELETE USING (auth.uid() = user_id);
-- ── Comments ──
DROP POLICY IF EXISTS "view_comments" ON public.comments;
CREATE POLICY "view_comments" ON public.comments FOR
SELECT USING (true);
DROP POLICY IF EXISTS "insert_own_comments" ON public.comments;
CREATE POLICY "insert_own_comments" ON public.comments FOR
INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_comments" ON public.comments;
CREATE POLICY "update_own_comments" ON public.comments FOR
UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_comments" ON public.comments;
CREATE POLICY "delete_own_comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);
-- ── Post Likes ──
DROP POLICY IF EXISTS "view_post_likes" ON public.post_likes;
CREATE POLICY "view_post_likes" ON public.post_likes FOR
SELECT USING (true);
DROP POLICY IF EXISTS "insert_post_likes" ON public.post_likes;
CREATE POLICY "insert_post_likes" ON public.post_likes FOR
INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_post_likes" ON public.post_likes;
CREATE POLICY "delete_post_likes" ON public.post_likes FOR DELETE USING (auth.uid() = user_id);
-- ── Post Views ──
DROP POLICY IF EXISTS "view_post_views" ON public.post_views;
CREATE POLICY "view_post_views" ON public.post_views FOR
SELECT USING (true);
DROP POLICY IF EXISTS "insert_post_views" ON public.post_views;
CREATE POLICY "insert_post_views" ON public.post_views FOR
INSERT WITH CHECK (auth.uid() = user_id);
-- ── Notifications ──
DROP POLICY IF EXISTS "view_own_notifications" ON public.notifications;
CREATE POLICY "view_own_notifications" ON public.notifications FOR
SELECT USING (auth.uid() = recipient_id);
DROP POLICY IF EXISTS "update_own_notifications" ON public.notifications;
CREATE POLICY "update_own_notifications" ON public.notifications FOR
UPDATE USING (auth.uid() = recipient_id);
DROP POLICY IF EXISTS "delete_own_notifications" ON public.notifications;
CREATE POLICY "delete_own_notifications" ON public.notifications FOR DELETE USING (auth.uid() = recipient_id);
-- ============================================================
-- 6. REALTIME
-- ============================================================
-- Enable realtime for messages and posts
DO $$ BEGIN ALTER PUBLICATION supabase_realtime
ADD TABLE public.messages;
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime
ADD TABLE public.notifications;
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime
ADD TABLE public.posts;
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;