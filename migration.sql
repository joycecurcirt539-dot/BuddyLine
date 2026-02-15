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
-- RLS Policies
alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.chats enable row level security;
alter table public.chat_members enable row level security;
alter table public.messages enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
-- Profiles policies
create policy "Public profiles are viewable by everyone" on public.profiles for
select using (true);
create policy "Users can insert their own profile" on public.profiles for
insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for
update using (auth.uid() = id);
-- Posts policies
create policy "Posts are viewable by everyone" on public.posts for
select using (true);
create policy "Users can insert their own posts" on public.posts for
insert with check (auth.uid() = user_id);
create policy "Users can update their own posts" on public.posts for
update using (auth.uid() = user_id);
create policy "Users can delete their own posts" on public.posts for delete using (auth.uid() = user_id);
-- Friendships policies
create policy "Users can view their own friendships" on public.friendships for
select using (
        auth.uid() = user_id
        or auth.uid() = friend_id
    );
create policy "Users can insert their own friendships" on public.friendships for
insert with check (auth.uid() = user_id);
create policy "Users can update their own friendships" on public.friendships for
update using (auth.uid() = user_id);
-- Chats policies
create policy "Users can view chats they are members of" on public.chats for
select using (
        exists (
            select 1
            from public.chat_members
            where chat_id = public.chats.id
                and user_id = auth.uid()
        )
    );
-- Messages policies
create policy "Users can view messages in their chats" on public.messages for
select using (
        exists (
            select 1
            from public.chat_members
            where chat_id = public.messages.chat_id
                and user_id = auth.uid()
        )
    );
create policy "Users can insert messages in their chats" on public.messages for
insert with check (
        exists (
            select 1
            from public.chat_members
            where chat_id = public.messages.chat_id
                and user_id = auth.uid()
        )
        and sender_id = auth.uid()
    );
-- Comments policies
create policy "Comments are viewable by everyone" on public.comments for
select using (true);
create policy "Users can insert their own comments" on public.comments for
insert with check (auth.uid() = user_id);
-- Storage (Avatars)
-- Note: You must create a bucket named 'avatars' in the Supabase Dashboard -> Storage