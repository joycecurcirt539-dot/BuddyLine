-- Fix Chat Creation Function (Ambiguous Parameter Resolution)
-- Drop the old function to avoid overload confusion
DROP FUNCTION IF EXISTS public.create_new_chat(uuid);
-- Recreate with a distinct parameter name 'target_user_id'
CREATE OR REPLACE FUNCTION public.create_new_chat(target_user_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE new_chat_id uuid;
is_friend boolean;
BEGIN -- Check if they are actually friends
SELECT EXISTS (
        SELECT 1
        FROM public.friendships
        WHERE (
                user_id = auth.uid()
                AND friend_id = target_user_id
                AND status = 'accepted'
            )
            OR (
                user_id = target_user_id
                AND friend_id = auth.uid()
                AND status = 'accepted'
            )
    ) INTO is_friend;
IF NOT is_friend THEN RAISE EXCEPTION 'You can only start chats with friends.';
END IF;
-- Create the chat
INSERT INTO public.chats (type)
VALUES ('direct')
RETURNING id INTO new_chat_id;
-- Add current user
INSERT INTO public.chat_members (chat_id, user_id)
VALUES (new_chat_id, auth.uid());
-- Add target user
INSERT INTO public.chat_members (chat_id, user_id)
VALUES (new_chat_id, target_user_id);
RETURN new_chat_id;
END;
$$;