-- 1. Fix Like Counter
-- Function to handle new likes
create or replace function public.handle_new_like() returns trigger as $$ begin
update public.posts
set likes_count = likes_count + 1
where id = new.post_id;
return new;
end;
$$ language plpgsql security definer;
-- Function to handle removed likes
create or replace function public.handle_removed_like() returns trigger as $$ begin
update public.posts
set likes_count = greatest(0, likes_count - 1)
where id = old.post_id;
return old;
end;
$$ language plpgsql security definer;
-- Trigger for new likes
drop trigger if exists on_like_created on public.post_likes;
create trigger on_like_created
after
insert on public.post_likes for each row execute procedure public.handle_new_like();
-- Trigger for removed likes
drop trigger if exists on_like_deleted on public.post_likes;
create trigger on_like_deleted
after delete on public.post_likes for each row execute procedure public.handle_removed_like();
-- 2. Fix View Counter
-- Function to handle new views
create or replace function public.handle_new_view() returns trigger as $$ begin
update public.posts
set views_count = views_count + 1
where id = new.post_id;
return new;
end;
$$ language plpgsql security definer;
-- Trigger for new views
drop trigger if exists on_view_created on public.post_views;
create trigger on_view_created
after
insert on public.post_views for each row execute procedure public.handle_new_view();
-- 3. Secure Chat Creation
-- Update create_new_chat to check friendship status
create or replace function create_new_chat(friend_id uuid) returns uuid language plpgsql security definer as $$
declare new_chat_id uuid;
is_friend boolean;
begin -- Check if they are actually friends
select exists (
        select 1
        from friendships
        where (
                user_id = auth.uid()
                and friend_id = create_new_chat.friend_id
                and status = 'accepted'
            )
            or (
                user_id = create_new_chat.friend_id
                and friend_id = auth.uid()
                and status = 'accepted'
            )
    ) into is_friend;
if not is_friend then raise exception 'You can only start chats with friends.';
end if;
-- Create the chat
insert into chats (type)
values ('direct')
returning id into new_chat_id;
-- Add members
insert into chat_members (chat_id, user_id)
values (new_chat_id, auth.uid());
insert into chat_members (chat_id, user_id)
values (new_chat_id, friend_id);
return new_chat_id;
end;
$$;