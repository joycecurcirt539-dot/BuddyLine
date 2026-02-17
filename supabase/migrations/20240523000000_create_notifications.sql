-- Create a table for notifications
create table if not exists public.notifications (
    id uuid not null default gen_random_uuid (),
    created_at timestamp with time zone not null default now(),
    recipient_id uuid not null references auth.users (id) on delete cascade,
    actor_id uuid references auth.users (id) on delete
    set null,
        type text not null check (
            type in (
                'friend_request',
                'friend_accept',
                'message_received',
                'message_forwarded',
                'message_reply',
                'post_like',
                'post_comment',
                'comment_reply'
            )
        ),
        content text null,
        target_id uuid null,
        -- ID of the related object (post, comment, message, etc.)
        target_preview text null,
        -- Short preview of the target content
        is_read boolean not null default false,
        constraint notifications_pkey primary key (id)
);
-- Enable Row Level Security
alter table public.notifications enable row level security;
-- Policies (Robust implementation)
drop policy if exists "Users can view their own notifications" on public.notifications;
create policy "Users can view their own notifications" on public.notifications for
select using (auth.uid() = recipient_id);
drop policy if exists "Users can update their own notifications" on public.notifications;
create policy "Users can update their own notifications" on public.notifications for
update using (auth.uid() = recipient_id);
drop policy if exists "Users can delete their own notifications" on public.notifications;
create policy "Users can delete their own notifications" on public.notifications for delete using (auth.uid() = recipient_id);
-- Enable Real-time (Safe check to prevent "already exists" error)
do $$ begin if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'notifications'
) then alter publication supabase_realtime
add table public.notifications;
end if;
end $$;