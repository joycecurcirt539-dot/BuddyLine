-- ============================================================
-- Notification System Fix
-- Automated Database Triggers for BuddyLine
-- ============================================================
-- 1. Notification Helper Function (Security Definer)
CREATE OR REPLACE FUNCTION public.create_notification(
        p_recipient_id UUID,
        p_actor_id UUID,
        p_type TEXT,
        p_content TEXT DEFAULT NULL,
        p_target_id UUID DEFAULT NULL,
        p_target_preview TEXT DEFAULT NULL
    ) RETURNS VOID AS $$ BEGIN
INSERT INTO public.notifications (
        recipient_id,
        actor_id,
        type,
        content,
        target_id,
        target_preview
    )
VALUES (
        p_recipient_id,
        p_actor_id,
        p_type,
        p_content,
        p_target_id,
        p_target_preview
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- 2. Friendship Notifications
CREATE OR REPLACE FUNCTION public.handle_friendship_notification() RETURNS TRIGGER AS $$ BEGIN IF (TG_OP = 'INSERT') THEN -- New friend request
    PERFORM public.create_notification(
        NEW.friend_id,
        NEW.user_id,
        'friend_request'
    );
ELSIF (TG_OP = 'UPDATE') THEN -- Request accepted
IF (
    OLD.status = 'pending'
    AND NEW.status = 'accepted'
) THEN PERFORM public.create_notification(
    NEW.user_id,
    NEW.friend_id,
    'friend_accept'
);
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
-- 3. Message Notifications
CREATE OR REPLACE FUNCTION public.handle_message_notification() RETURNS TRIGGER AS $$
DECLARE v_recipient_id UUID;
BEGIN -- For direct chats, notify the person who is NOT the sender
FOR v_recipient_id IN
SELECT user_id
FROM public.chat_members
WHERE chat_id = NEW.chat_id
    AND user_id != NEW.sender_id LOOP PERFORM public.create_notification(
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
DROP TRIGGER IF EXISTS on_message_notification ON public.messages;
CREATE TRIGGER on_message_notification
AFTER
INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.handle_message_notification();
-- 4. Post Interaction Notifications (Likes & Comments)
-- 4.1 Likes
CREATE OR REPLACE FUNCTION public.handle_like_notification() RETURNS TRIGGER AS $$
DECLARE v_post_author_id UUID;
v_post_preview TEXT;
BEGIN
SELECT user_id,
    LEFT(content, 50) INTO v_post_author_id,
    v_post_preview
FROM public.posts
WHERE id = NEW.post_id;
-- Don't notify if liking own post
IF v_post_author_id != NEW.user_id THEN PERFORM public.create_notification(
    v_post_author_id,
    NEW.user_id,
    'post_like',
    NULL,
    NEW.post_id,
    v_post_preview
);
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS on_like_notification ON public.post_likes;
CREATE TRIGGER on_like_notification
AFTER
INSERT ON public.post_likes FOR EACH ROW EXECUTE FUNCTION public.handle_like_notification();
-- 4.2 Comments
CREATE OR REPLACE FUNCTION public.handle_comment_notification() RETURNS TRIGGER AS $$
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
IF v_post_author_id != NEW.user_id THEN PERFORM public.create_notification(
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
AND v_parent_author_id != v_post_author_id THEN PERFORM public.create_notification(
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
DROP TRIGGER IF EXISTS on_comment_notification ON public.comments;
CREATE TRIGGER on_comment_notification
AFTER
INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION public.handle_comment_notification();
-- 5. Fix RLS for system notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
-- Allow system (via security definer functions) to insert, but restrict users to only view theirs.
-- The functions are SECURITY DEFINER, so they run with owner privileges and can bypass RLS on INSERT if needed, 
-- but we should still have a clear policy for SELECT.
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR
SELECT USING (auth.uid() = recipient_id);
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR
UPDATE USING (auth.uid() = recipient_id);
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications" ON public.notifications FOR DELETE USING (auth.uid() = recipient_id);