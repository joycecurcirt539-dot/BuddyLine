import { RealtimeChannel } from '@supabase/supabase-js';
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Profile } from './useFriends';

// Fallback for non-secure contexts (HTTP over LAN)
const generateUUID = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    // Fallback using crypto.getRandomValues
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
        (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
    );
};

export interface Message {
    id: string;
    chat_id: string;
    sender_id: string;
    content: string;
    image_url?: string;
    created_at: string;
    edited_at?: string;
    status: 'sent' | 'delivered' | 'read';
    reply_to_id?: string;
    is_forwarded?: boolean;
    forwarded_from_chat_id?: string;
    forwarded_from_message_id?: string;
    reply_message?: Message; // For UI convenience, we might join this
}

export interface Chat {
    id: string;
    type: 'direct' | 'group';
    name?: string;
    updated_at?: string; // Real column from DB
    participants: Profile[];
    last_message?: Message;
    image_url?: string;
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formattedChats: Chat[] = chatsData.map((c: any) => ({
            id: c.id,
            type: c.type,
            name: c.name,
            updated_at: c.updated_at,
            participants: c.chat_members.map((m: any) => m.profile),
            image_url: c.image_url,
        }));

        // 4. Fetch last message for each chat
        const chatsWithMessages = await Promise.all(formattedChats.map(async (chat) => {
            const { data } = await supabase
                .from('messages')
                .select('*')
                .eq('chat_id', chat.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            return {
                ...chat,
                last_message: data || undefined,
                updated_at: data?.created_at || chat.updated_at
            };
        }));

        // Sort by updated_at desc
        chatsWithMessages.sort((a, b) => {
            const dateA = new Date(a.updated_at || 0).getTime();
            const dateB = new Date(b.updated_at || 0).getTime();
            return dateB - dateA;
        });

        setChats(chatsWithMessages);
        setLoading(false);
    }, [user]);

    const fetchMessages = useCallback(async (chatId: string) => {
        setMessagesLoading(true);
        // Fetch messages AND their reply context if possible
        // For simplicity, we fetch all and map replies in UI or fetch replies separately?
        // Let's just fetch * and if we need the reply content, we might key off existing loaded messages
        // or join. Supabase recursive join is hard.
        // Let's just fetch messages. We'll handle "Reply not found" in UI gracefully or fetch on demand.
        // Actually, let's try to fetch reply_message details if we can, but let's stick to simple first.
        const { data, error } = await supabase
            .from('messages')
            .select(`
                *,
                reply_message:messages!reply_to_id(
                    id,
                    content,
                    sender_id,
                    image_url
                )
            `)
            .eq('chat_id', chatId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching messages:', error);
        } else {
            setMessages(data as unknown as Message[]);
        }
        setMessagesLoading(false);
    }, []);

    const selectChat = useCallback((chat: Chat) => {
        setActiveChat(chat);
        fetchMessages(chat.id);
    }, [fetchMessages]);

    const sendMessage = async (content: string, imageUrl?: string, replyToId?: string) => {
        if (!user || !activeChat) return;

        const messageId = generateUUID();

        // Optimistically add message
        const newMessage: Message = {
            id: messageId,
            chat_id: activeChat.id,
            sender_id: user.id,
            content,
            image_url: imageUrl,
            created_at: new Date().toISOString(),
            status: 'sent',
            reply_to_id: replyToId,
            // We can't easily optimistic update reply_message details without finding it in `messages`
            reply_message: replyToId ? messages.find(m => m.id === replyToId) : undefined
        };
        setMessages(prev => [...prev, newMessage]);

        const { error } = await supabase
            .from('messages')
            .insert([{
                id: messageId,
                chat_id: activeChat.id,
                sender_id: user.id,
                content,
                image_url: imageUrl,
                reply_to_id: replyToId
            }]);

        if (error) {
            console.error('Error sending message:', error.message, error.details, error.hint);
            alert(`Failed to send message: ${error.message}`);
            // Revert optimistic update if error
            setMessages(prev => prev.filter(m => m.id !== messageId));
            return;
        }
    };

    const editMessage = async (messageId: string, newContent: string) => {
        if (!user) return;

        const { error } = await supabase
            .from('messages')
            .update({ content: newContent, edited_at: new Date().toISOString() })
            .eq('id', messageId)
            .eq('sender_id', user.id);

        if (error) {
            console.error('Error editing message:', error);
            alert(`Failed to edit message: ${error.message}`);
            return { error: error.message };
        }

        // Optimistic update
        setMessages(prev => prev.map(m =>
            m.id === messageId
                ? { ...m, content: newContent, edited_at: new Date().toISOString() }
                : m
        ));
        return { success: true };
    };

    const forwardMessage = async (originalMessage: Message, targetChatId: string) => {
        if (!user) return;

        const messageId = generateUUID();

        // If forwarding to active chat, optimistic update
        if (activeChat?.id === targetChatId) {
            const newMessage: Message = {
                id: messageId,
                chat_id: targetChatId,
                sender_id: user.id,
                content: originalMessage.content,
                image_url: originalMessage.image_url,
                created_at: new Date().toISOString(),
                status: 'sent',
                is_forwarded: true,
                forwarded_from_chat_id: originalMessage.chat_id,
                forwarded_from_message_id: originalMessage.id
            };
            setMessages(prev => [...prev, newMessage]);
        }

        const { error } = await supabase
            .from('messages')
            .insert([{
                id: messageId,
                chat_id: targetChatId,
                sender_id: user.id,
                content: originalMessage.content,
                image_url: originalMessage.image_url,
                is_forwarded: true,
                forwarded_from_chat_id: originalMessage.chat_id,
                forwarded_from_message_id: originalMessage.id
            }]);

        if (error) {
            console.error('Error forwarding message:', error);
            // Revert optimistic if needed
            if (activeChat?.id === targetChatId) {
                setMessages(prev => prev.filter(m => m.id !== messageId));
            }
            return { error: error.message };
        }

        // If we forwarded to another chat, we should probably update that chat's updated_at locally
        // but `fetchChats` will get it eventually or realtime will handle if we listen to global messages (which we don't for perf)
        // For now, let's just refresh chats to show the new top chat
        fetchChats();

        return { success: true };
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
            .rpc('create_new_chat', { target_user_id: friendId });

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
                event: '*', // Listen to all changes (INSERT, DELETE, UPDATE)
                schema: 'public',
                table: 'messages',
                filter: `chat_id=eq.${activeChat.id}`
            }, async (payload) => {
                console.log('Realtime message change:', payload.eventType, payload);

                if (payload.eventType === 'INSERT') {
                    const newMessage = payload.new as Message;

                    // If it has a reply, we might want to fetch the reply detail?
                    // For now, let's just trust we have it or it's optimistic.
                    // Actually, if we are the sender, we already have it. 
                    // If we are receiver, we might need to fetch the reply message content if it's not in our list.

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
                } else if (payload.eventType === 'UPDATE') {
                    const updatedMessage = payload.new as Message;
                    setMessages(prev => prev.map(m => m.id === updatedMessage.id ? updatedMessage : m));
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
        editMessage,
        forwardMessage,
        createDirectChat,
        deleteChat,
        refreshChats: fetchChats
    };
};
