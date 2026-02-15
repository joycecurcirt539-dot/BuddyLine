import { RealtimeChannel } from '@supabase/supabase-js';
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Profile } from './useFriends';

export interface Message {
    id: string;
    chat_id: string;
    sender_id: string;
    content: string;
    image_url?: string;
    created_at: string;
    status: 'sent' | 'delivered' | 'read';
}

export interface Chat {
    id: string;
    type: 'direct' | 'group';
    name?: string;
    updated_at?: string; // We'll mock this for sorting
    participants: Profile[];
    last_message?: Message;
}

export const useChat = () => {
    const { user } = useAuth();
    const [chats, setChats] = useState<Chat[]>([]);
    const [activeChat, setActiveChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const channelRef = useRef<RealtimeChannel | null>(null);

    const fetchChats = useCallback(async () => {
        if (!user) return;

        // 1. Get all chats user is member of
        const { data: members, error: membersError } = await supabase
            .from('chat_members')
            .select('chat_id')
            .eq('user_id', user.id);

        if (membersError) {
            console.error('Error fetching chat members:', membersError.message, membersError.details, membersError.hint);
            return;
        }

        const chatIds = members.map(m => m.chat_id);
        if (chatIds.length === 0) {
            setChats([]);
            setLoading(false);
            return;
        }

        // 2. Get chat details and other members
        const { data: chatsData, error: chatsError } = await supabase
            .from('chats')
            .select(`
        *,
        chat_members (
          user_id,
          profile:profiles (*)
        )
      `)
            .in('id', chatIds);

        if (chatsError) {
            console.error('Error fetching chats:', chatsError.message, chatsError.details, chatsError.hint);
            return;
        }

        // 3. Format raw data into Chat objects
        const formattedChats: Chat[] = chatsData.map((c: { id: string; type: 'direct' | 'group'; name: string; chat_members: { profile: Profile }[] }) => ({
            id: c.id,
            type: c.type,
            name: c.name,
            participants: c.chat_members.map((m) => m.profile),
        }));

        // 4. Fetch last message for each chat (Separate query for performance/complexity balance)
        // For MVP we might skip this or do it simpler. Let's try to get last messages.
        // Simplifying for now: we'll fetch last message individually or rely on realtime updates.
        // To keep it simple and robust: don't fetch last message in list for MVP v1 to avoid N+1 query complexity manually.

        setChats(formattedChats);
        setLoading(false);
    }, [user]);

    const fetchMessages = useCallback(async (chatId: string) => {
        setMessagesLoading(true);
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching messages:', error.message, error.details, error.hint);
        } else {
            setMessages(data as Message[]);
        }
        setMessagesLoading(false);
    }, []);

    const selectChat = useCallback((chat: Chat) => {
        setActiveChat(chat);
        fetchMessages(chat.id);
    }, [fetchMessages]);

    const sendMessage = async (content: string, imageUrl?: string) => {
        if (!user || !activeChat) return;

        // Generate ID explicitly for robustness
        const messageId = crypto.randomUUID();

        const { error } = await supabase
            .from('messages')
            .insert([{
                id: messageId,
                chat_id: activeChat.id,
                sender_id: user.id,
                content,
                image_url: imageUrl
            }]);

        if (error) {
            console.error('Error sending message:', error.message, error.details, error.hint);
            alert(`Failed to send message: ${error.message}`);
        }
    };

    const createDirectChat = async (friendId: string) => {
        if (!user) return { error: 'Not logged in' };

        // 1. Check if a direct chat already exists between these two users
        // This is a bit complex in Supabase without a custom function, 
        // but we can find chats where BOTH users are members.
        const { data: existingChats, error: searchError } = await supabase
            .from('chat_members')
            .select('chat_id')
            .eq('user_id', user.id);

        if (searchError) return { error: searchError.message };

        const myChatIds = existingChats.map(c => c.chat_id);

        if (myChatIds.length > 0) {
            const { data: commonMembers, error: memberError } = await supabase
                .from('chat_members')
                .select('chat_id')
                .in('chat_id', myChatIds)
                .eq('user_id', friendId);

            if (!memberError && commonMembers && commonMembers.length > 0) {
                // Check if any of these are 'direct' type chats
                const { data: directChat, error: typeError } = await supabase
                    .from('chats')
                    .select('id')
                    .in('id', commonMembers.map(m => m.chat_id))
                    .eq('type', 'direct')
                    .maybeSingle();

                if (!typeError && directChat) {
                    return { success: true, chatId: directChat.id };
                }
            }
        }

        // 2. Create Chat via RPC (Atomic & Secure)
        const { data: newChatId, error: rpcError } = await supabase
            .rpc('create_new_chat', { friend_id: friendId });

        if (rpcError) return { error: rpcError.message };

        await fetchChats(); // Refresh list
        return { success: true, chatId: newChatId };
    };

    const deleteMessage = async (messageId: string) => {
        const { error } = await supabase
            .from('messages')
            .delete()
            .eq('id', messageId);

        if (error) {
            console.error('Error deleting message:', error);
            return { error: error.message };
        }

        // Optimistic update
        setMessages(prev => prev.filter(m => m.id !== messageId));
        return { success: true };
    };

    const deleteChat = async (chatId: string) => {
        const { error } = await supabase
            .from('chats')
            .delete()
            .eq('id', chatId);

        if (error) {
            console.error('Error deleting chat:', error);
            return { error: error.message };
        }

        setChats(prev => prev.filter(c => c.id !== chatId));
        if (activeChat?.id === chatId) {
            setActiveChat(null);
            setMessages([]);
        }
        return { success: true };
    };

    // Realtime subscription for Messages in Active Chat
    useEffect(() => {
        if (!activeChat) return;

        console.log('Subscribing to messages for chat:', activeChat.id);

        const channel = supabase
            .channel(`chat_messages:${activeChat.id}`)
            .on('postgres_changes', {
                event: '*', // Listen to all changes (INSERT, DELETE, etc.)
                schema: 'public',
                table: 'messages',
                filter: `chat_id=eq.${activeChat.id}`
            }, (payload) => {
                console.log('Realtime message change:', payload.eventType, payload);

                if (payload.eventType === 'INSERT') {
                    const newMessage = payload.new as Message;
                    setMessages(prev => {
                        // If message exists (from optimistic update), replace it to get correct timestamp/status
                        if (prev.some(m => m.id === newMessage.id)) {
                            return prev.map(m => m.id === newMessage.id ? newMessage : m);
                        }
                        return [...prev, newMessage];
                    });

                    setChats(prevChats => prevChats.map(c =>
                        c.id === activeChat.id ? { ...c, last_message: newMessage, updated_at: newMessage.created_at } : c
                    ));
                } else if (payload.eventType === 'DELETE') {
                    const deletedId = (payload.old as { id: string }).id;
                    setMessages(prev => prev.filter(m => m.id !== deletedId));
                }
            })
            .subscribe((status) => {
                console.log(`Subscription status for ${activeChat.id}:`, status);
            });

        channelRef.current = channel;

        return () => {
            console.log('Unsubscribing from messages:', activeChat.id);
            if (channel) supabase.removeChannel(channel);
        };
    }, [activeChat?.id, activeChat, fetchMessages]); // Added activeChat for exhaustive-deps

    // Initial load
    useEffect(() => {
        if (user) {
            // Defer execution to avoid cascading render warning
            const timer = setTimeout(() => {
                fetchChats();
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [fetchChats, user]);

    return {
        chats,
        activeChat,
        messages,
        loading,
        messagesLoading,
        selectChat,
        sendMessage,
        deleteMessage,
        createDirectChat,
        deleteChat,
        refreshChats: fetchChats
    };
};
