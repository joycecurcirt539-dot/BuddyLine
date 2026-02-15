-- Enable required extensions
create extension if not exists "uuid-ossp";
-- Profiles
create table if not exists public.profiles (
    id uuid references auth.users not null primary key,
    username text unique not null,
    full_name text,
    avatar_url text,
    bio text,
    status text check (status in ('online', 'offline', 'away')) default 'offline',
    last_seen timestamp with time zone default timezone('utc'::text, now()),
    created_at timestamp with time zone default timezone('utc'::text, now())
);
-- Friendships
create type friendship_status as enum ('pending', 'accepted', 'blocked');
create table if not exists public.friendships (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.profiles(id) not null,
    friend_id uuid references public.profiles(id) not null,
    status friendship_status default 'pending',
    created_at timestamp with time zone default timezone('utc'::text, now()),
    unique(user_id, friend_id)
);
-- Chats
create type chat_type as enum ('direct', 'group');
create table if not exists public.chats (
    id uuid default uuid_generate_v4() primary key,
    type chat_type default 'direct',
    name text,
    -- for group chats
    created_at timestamp with time zone default timezone('utc'::text, now())
);
-- Chat Members
create table if not exists public.chat_members (
    chat_id uuid references public.chats(id) on delete cascade not null,
    user_id uuid references public.profiles(id) on delete cascade not null,
    joined_at timestamp with time zone default timezone('utc'::text, now()),
    primary key (chat_id, user_id)
);
-- Messages
create type message_status as enum ('sent', 'delivered', 'read');
create table if not exists public.messages (
    id uuid default uuid_generate_v4() primary key,
    chat_id uuid references public.chats(id) on delete cascade not null,
    sender_id uuid references public.profiles(id) not null,
    content text not null,
    status message_status default 'sent',
    created_at timestamp with time zone default timezone('utc'::text, now())
);
-- Posts
create table if not exists public.posts (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.profiles(id) not null,
    content text,
    image_url text,
    likes_count int default 0,
    created_at timestamp with time zone default timezone('utc'::text, now())
);
-- Comments
create table if not exists public.comments (
    id uuid default uuid_generate_v4() primary key,
    post_id uuid references public.posts(id) on delete cascade not null,
    user_id uuid references public.profiles(id) not null,
    content text not null,
    created_at timestamp with time zone default timezone('utc'::text, now())
);
-- Helper function to avoid infinite recursion in RLS
create or replace function get_my_chat_ids() returns setof uuid language sql security definer
set search_path = public stable as $$
select chat_id
from chat_members
where user_id = auth.uid();
$$;
-- RLS Policies
alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.chats enable row level security;
alter table public.chat_members enable row level security;
alter table public.messages enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
-- Profiles policies
create policy "view_profiles" on public.profiles for
select using (true);
create policy "insert_own_profile" on public.profiles for
insert with check (auth.uid() = id);
create policy "update_own_profile" on public.profiles for
update using (auth.uid() = id);
-- Posts policies
create policy "view_posts" on public.posts for
select using (true);
create policy "insert_own_posts" on public.posts for
insert with check (auth.uid() = user_id);
create policy "update_own_posts" on public.posts for
update using (auth.uid() = user_id);
create policy "delete_own_posts" on public.posts for delete using (auth.uid() = user_id);
-- Friendships policies
create policy "view_own_friendships" on public.friendships for
select using (
        auth.uid() = user_id
        or auth.uid() = friend_id
    );
create policy "insert_friendships" on public.friendships for
insert with check (auth.uid() = user_id);
create policy "update_friendships" on public.friendships for
update using (auth.uid() = user_id);
-- Chats policies
create policy "create_chats" on public.chats for
insert with check (auth.uid() is not null);
-- View chats using helper to avoid recursion
create policy "view_chats" on public.chats for
select using (
        id in (
            select get_my_chat_ids()
        )
    );
-- Delete chats (only members can delete)
create policy "delete_chats" on public.chats for delete using (
    id in (
        select get_my_chat_ids()
    )
);
-- Chat Members policies
create policy "add_members" on public.chat_members for
insert with check (true);
-- View members using helper to avoid recursion
create policy "view_members" on public.chat_members for
select using (
        chat_id in (
            select get_my_chat_ids()
        )
    );
-- Delete members (self-removal)
create policy "delete_members" on public.chat_members for delete using (user_id = auth.uid());
-- Delete friendships (either party)
create policy "delete_friendships" on public.friendships for delete using (
    auth.uid() = user_id
    or auth.uid() = friend_id
);
-- Messages policies
create policy "send_messages" on public.messages for
insert with check (
        auth.uid() = sender_id
        and chat_id in (
            select get_my_chat_ids()
        )
    );
create policy "view_messages" on public.messages for
select using (
        chat_id in (
            select get_my_chat_ids()
        )
    );
create policy "delete_own_messages" on public.messages for delete using (auth.uid() = sender_id);
-- Comments policies
create policy "view_comments" on public.comments for
select using (true);
create policy "insert_own_comments" on public.comments for
insert with check (auth.uid() = user_id);
-- Storage (Avatars)
-- Note: You must create a bucket named 'avatars' in the Supabase Dashboard -> Storage
-- Helper function to create chat atomically
create or replace function create_new_chat(friend_id uuid) returns uuid language plpgsql security definer as $$
declare new_chat_id uuid;
begin
insert into chats (type)
values ('direct')
returning id into new_chat_id;
insert into chat_members (chat_id, user_id)
values (new_chat_id, auth.uid());
insert into chat_members (chat_id, user_id)
values (new_chat_id, friend_id);
return new_chat_id;
end;
$$;
-- Enable Realtime for tables that use postgres_changes subscriptions
alter publication supabase_realtime
add table public.posts;
alter publication supabase_realtime
add table public.messages;