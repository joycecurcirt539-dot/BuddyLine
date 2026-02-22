import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ForwardChatModal } from '../components/chat/ForwardChatModal';
import { useChat } from '../hooks/useChat';
import type { Chat as ChatType, Message } from '../hooks/useChat';
import { ChatWindow } from '../components/chat/ChatWindow';
import { Avatar } from '../components/ui/Avatar';
import { Search, Plus, MessageSquare, X, Zap, Loader2, Image as ImageIcon, CornerDownRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFriends } from '../hooks/useFriends';
import type { Profile } from '../hooks/useFriends';
import { formatDistanceToNow } from 'date-fns';
import { SecretPanel } from '../components/chat/SecretPanel';
import { ExperimentsPanel } from '../components/chat/ExperimentsPanel';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useLocation } from 'react-router-dom';
import { CompanionInfo } from '../components/chat/CompanionInfo';
import { getDateLocale } from '../utils/dateLocale';
import { usePresence } from '../hooks/usePresence';

export const Chat = () => {
    const { t, i18n } = useTranslation();
    const { user, isGuest } = useAuth();
    const { friends, blockUser } = useFriends();
    const { chats, activeChat, messages, loading, messagesLoading, selectChat, sendMessage, createDirectChat, deleteChat, deleteMessage, editMessage, forwardMessage } = useChat();
    const { onlineUsers } = usePresence();
    const [mutedChats, setMutedChats] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [view, setView] = useState<'list' | 'chat'>('list');
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const [showNewChat, setShowNewChat] = useState(false);
    const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
    const [newChatSearch, setNewChatSearch] = useState('');
    const [newChatResults, setNewChatResults] = useState<Profile[]>([]);
    const [searching, setSearching] = useState(false);

    // Filter chats
    const filteredChats = chats.filter(chat => {
        const other = chat.participants.find(p => p.id !== user?.id) || chat.participants[0];
        const name = chat.name || other.full_name || other.username;
        return name.toLowerCase().includes(searchTerm.toLowerCase());
    });

    // Auto-select chat from URL
    useEffect(() => {
        const chatId = searchParams.get('id');
        if (chatId) {
            if (chats.length > 0) {
                const chat = chats.find(c => c.id === chatId);
                // Only select if it's different to avoid loops, but strictly follow URL
                if (chat && activeChat?.id !== chat.id) {
                    selectChat(chat);
                    // Defer setting view to avoid cascading render warning
                    setTimeout(() => setView('chat'), 0);
                } else if (chat && view !== 'chat') {
                    // If active chat matches URL but view is wrong (e.g. back button), fix view
                    setTimeout(() => setView('chat'), 0);
                }
            }
        } else {
            // No ID in URL, ensure we are in list view
            // Only force list if we are not already there
            if (view !== 'list') {
                setTimeout(() => setView('list'), 0);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, chats]);

    // Handle Messages tab click (reset to list)
    useEffect(() => {
        if (location.pathname === '/chat' && !location.search) {
            setTimeout(() => setView('list'), 0);
        }
    }, [location]);

    const handleSelectChat = (chat: ChatType) => {
        if (isGuest) {
            alert(t('login_page.login_to_interact'));
            return;
        }
        selectChat(chat);
        setSearchParams({ id: chat.id });
        setView('chat');
    };

    const handleStartNewChat = async (targetUserId: string) => {
        if (isGuest) {
            alert(t('login_page.login_to_interact'));
            return;
        }
        const result = await createDirectChat(targetUserId);
        if (result.success && result.chatId) {
            setShowNewChat(false);
            setSearchParams({ id: result.chatId });
        } else if (result.error) {
            alert(result.error);
        }
    };

    // Search for users to chat with
    useEffect(() => {
        const searchUsers = async () => {
            if (!newChatSearch.trim()) {
                setNewChatResults([]);
                return;
            }
            setSearching(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .or(`username.ilike.%${newChatSearch}%,full_name.ilike.%${newChatSearch}%`)
                .neq('id', user?.id)
                .limit(10);

            if (!error && data) {
                setNewChatResults(data);
            }
            setSearching(false);
        };

        const timer = setTimeout(searchUsers, 300);
        return () => clearTimeout(timer);
    }, [newChatSearch, user?.id]);

    const handleBack = () => {
        setView('list');
        setSearchParams({});
    };

    const handleDeleteChat = async () => {
        if (isGuest) {
            alert(t('login_page.login_to_interact'));
            return;
        }
        if (!activeChat) return;
        if (window.confirm(t('chat.actions.delete_confirm'))) {
            const result = await deleteChat(activeChat.id);
            if (result.success) {
                handleBack();
            } else if (result.error) {
                alert(result.error);
            }
        }
    };

    const handleBlockUser = async () => {
        if (isGuest) {
            alert(t('login_page.login_to_interact'));
            return;
        }
        if (!activeChat) return;
        const other = activeChat.participants.find(p => p.id !== user?.id) || activeChat.participants[0];
        if (window.confirm(`${t('chat.actions.block_confirm')} ${other.full_name || other.username}?`)) {
            const result = await blockUser(other.id);
            if (result.success) {
                handleBack();
            } else if (result.error) {
                alert(result.error);
            }
        }
    };

    const handleMuteToggle = () => {
        if (!activeChat) return;
        setMutedChats(prev => {
            const next = new Set(prev);
            if (next.has(activeChat.id)) next.delete(activeChat.id);
            else next.add(activeChat.id);
            return next;
        });
    };

    const handleForwardSelect = async (targetId: string, isNewChat: boolean) => {
        if (!forwardingMessage) return;

        let chatId = targetId;
        if (isNewChat) {
            const result = await createDirectChat(targetId);
            if (result.success && result.chatId) {
                chatId = result.chatId;
            } else if (result.error) {
                alert(result.error);
                return;
            }
        }

        await forwardMessage(forwardingMessage, chatId);
        setForwardingMessage(null);
        alert(t('chat.message_forwarded'));
    };

    if (view === 'chat' && activeChat) {
        const other = activeChat.participants.find(p => p.id !== user?.id) || activeChat.participants[0];
        return (
            <div className="w-full flex-1 flex gap-6 min-h-0 pb-24 lg:pb-10">
                <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{ willChange: "transform, opacity" }}
                    className="flex-1 liquid-glass overflow-hidden flex flex-col shadow-2xl transition-all min-h-0 border-white/20"
                >
                    <ChatWindow
                        chat={activeChat}
                        messages={messages}
                        loading={messagesLoading}
                        onSendMessage={sendMessage}
                        onDeleteMessage={deleteMessage}
                        onEditMessage={editMessage}
                        onForwardMessage={setForwardingMessage}
                        onBack={handleBack}
                        isMuted={mutedChats.has(activeChat.id)}
                        onMuteToggle={handleMuteToggle}
                        onDeleteChat={handleDeleteChat}
                        onBlockUser={handleBlockUser}
                    />
                </motion.div>

                {/* Desktop Right Sidebar */}
                <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    style={{ willChange: "transform, opacity" }}
                    className="hidden xl:block w-96 shrink-0 liquid-glass overflow-y-auto h-full shadow-2xl transition-all border-white/20"
                >
                    <CompanionInfo
                        participant={other}
                    />
                </motion.div>

                <AnimatePresence>
                    {forwardingMessage && (
                        <ForwardChatModal
                            isOpen={!!forwardingMessage}
                            onClose={() => setForwardingMessage(null)}
                            onSelect={handleForwardSelect}
                            chats={chats}
                            friends={friends}
                            onlineUsers={onlineUsers}
                        />
                    )}
                </AnimatePresence>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 w-full flex-1 relative min-h-0 pb-24 lg:pb-10">
            {/* Background Atmosphere */}
            <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute top-[5%] left-[10%] w-[35%] h-[35%] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute top-[40%] right-[5%] w-[30%] h-[30%] bg-tertiary/5 rounded-full blur-[100px] animate-pulse delay-700" />
            </div>

            {/* New Chat Modal */}
            {createPortal(
                <AnimatePresence>
                    {showNewChat && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowNewChat(false)}
                            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md cursor-pointer"
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 30, opacity: 0 }}
                                animate={{ scale: 1, y: 0, opacity: 1 }}
                                exit={{ scale: 0.9, y: 30, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                style={{ willChange: "transform, opacity" }}
                                onClick={(e) => e.stopPropagation()}
                                className="liquid-glass w-full max-w-md rounded-[3rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.3)] border border-white/20 relative cursor-default"
                            >
                                <div className="p-10 border-b border-white/10 flex items-center justify-between bg-white/5 dark:bg-black/20">
                                    <div>
                                        <h3 className="text-3xl font-black uppercase tracking-tight italic leading-none">{t('chat.start_new')}</h3>
                                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mt-2 opacity-60">{t('chat.initiate_uplink')}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowNewChat(false)}
                                        className="p-3 hover:bg-surface-container rounded-full transition-all group relative z-50"
                                        title={t('common.cancel')}
                                    >
                                        <X size={20} className="group-hover:rotate-90 transition-transform" />
                                    </button>
                                </div>
                                <div className="px-8 pb-4 relative z-10 pt-6">
                                    <div className="absolute inset-x-8 -top-1 bg-gradient-to-r from-primary/20 to-tertiary/20 rounded-2xl blur opacity-0 group-focus-within/newsearch:opacity-100 transition duration-500" />
                                    <input
                                        type="text"
                                        placeholder={t('common.search')}
                                        value={newChatSearch}
                                        onChange={(e) => setNewChatSearch(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-[1.5rem] focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-white/10 transition-all text-sm font-black placeholder:text-on-surface-variant/30 shadow-inner relative z-10"
                                    />
                                    {searching && <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-primary" />}
                                </div>

                                <div className="p-6 pt-2 max-h-[400px] overflow-y-auto space-y-3 custom-scrollbar relative z-10">
                                    {newChatSearch.trim() ? (
                                        newChatResults.length === 0 && !searching ? (
                                            <div className="flex flex-col items-center justify-center py-10 opacity-40">
                                                <Search size={48} className="mb-4" />
                                                <p className="font-bold">{t('common.no_results')}</p>
                                            </div>
                                        ) : (
                                            newChatResults.map(profile => (
                                                <motion.div
                                                    key={profile.id}
                                                    whileHover={{ x: 8 }}
                                                    onClick={() => handleStartNewChat(profile.id)}
                                                    className="liquid-glass p-4 rounded-[2rem] border border-white/10 shadow-sm hover:shadow-lg hover:border-primary/30 flex items-center gap-4 cursor-pointer transition-all duration-300 group"
                                                >
                                                    <Avatar src={profile.avatar_url} alt={profile.username} status={onlineUsers.has(profile.id) ? 'online' : 'offline'} size="md" className="ring-4 ring-white shadow-xl" />
                                                    <div className="flex-1">
                                                        <p className="font-black text-on-surface uppercase italic tracking-tight">{profile.full_name || profile.username}</p>
                                                        <p className="text-[10px] text-primary font-black uppercase tracking-widest opacity-70">@{profile.username}</p>
                                                    </div>
                                                    <div className="p-2 bg-primary/10 rounded-xl group-hover:bg-primary group-hover:text-on-primary transition-all">
                                                        <MessageSquare size={18} />
                                                    </div>
                                                </motion.div>
                                            ))
                                        )
                                    ) : (
                                        friends.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-10 opacity-40">
                                                <MessageSquare size={48} className="mb-4" />
                                                <p className="font-bold">{t('friends_page.empty.title')}</p>
                                            </div>
                                        ) : (
                                            friends.map(friend => (
                                                <motion.div
                                                    key={friend.id}
                                                    whileHover={{ x: 8 }}
                                                    onClick={() => handleStartNewChat(friend.id)}
                                                    className="liquid-glass p-4 rounded-[2rem] border border-white/10 shadow-sm hover:shadow-lg hover:border-primary/30 flex items-center gap-4 cursor-pointer transition-all duration-300 group"
                                                >
                                                    <Avatar src={friend.avatar_url} alt={friend.username} status={onlineUsers.has(friend.id) ? 'online' : 'offline'} size="md" className="ring-4 ring-white shadow-xl" />
                                                    <div className="flex-1">
                                                        <p className="font-black text-on-surface uppercase italic tracking-tight">{friend.full_name || friend.username}</p>
                                                        <p className="text-[10px] text-primary font-black uppercase tracking-widest opacity-70">@{friend.username}</p>
                                                    </div>
                                                    <div className="p-2 bg-primary/10 rounded-xl group-hover:bg-primary group-hover:text-on-primary transition-all">
                                                        <MessageSquare size={18} />
                                                    </div>
                                                </motion.div>
                                            ))
                                        )
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* Central signal hub */}
            <div className="w-full flex flex-col xl:flex-row gap-6">
                <div className="flex-1 flex flex-col min-h-0">
                    {/* The Signal Hub (Header) */}
                    <div className="flex flex-col md:flex-row items-center gap-6 mb-6">
                        <div className="flex-1 flex flex-col md:flex-row items-center gap-6 w-full">
                            <div className="flex-1 w-full relative group/search">
                                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-tertiary/20 rounded-[2rem] blur opacity-0 group-focus-within/search:opacity-100 transition duration-500" />
                                <div className="relative flex items-center bg-white/5 backdrop-blur-md rounded-[2rem] border border-white/10 group-focus-within/search:border-primary/50 group-focus-within/search:bg-white/10 transition-all shadow-inner">
                                    <Search className="ml-4 text-on-surface-variant/40 group-focus-within/search:text-primary transition-colors" size={18} />
                                    <input
                                        type="text"
                                        placeholder={t('common.search')}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-3 pr-4 py-3.5 bg-transparent outline-none text-on-surface font-black text-sm placeholder:text-on-surface-variant/20 tracking-tight"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                                <button
                                    onClick={() => setShowNewChat(true)}
                                    title={t('chat.start_new')}
                                    className="p-3.5 bg-gradient-to-br from-primary to-primary-container text-white rounded-[1.5rem] shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.5)] hover:scale-110 active:scale-95 transition-all duration-300 border border-white/20 group/new"
                                >
                                    <Plus size={24} className="group-hover:rotate-180 transition-transform duration-500" />
                                </button>
                                <SecretPanel variant="compact" />
                            </div>
                        </div>
                    </div>

                    {/* Comm-Log (Chat List) */}
                    <div className="flex-1 min-h-[500px]">
                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="h-32 bg-surface-container-low rounded-[32px] animate-pulse" />
                                ))}
                            </div>
                        ) : filteredChats.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-32 bg-surface-container-low/30 backdrop-blur-xl rounded-[48px] border-2 border-dashed border-outline-variant/20">
                                <div className="w-24 h-24 bg-surface-container-high rounded-full flex items-center justify-center mb-8 relative">
                                    <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping" />
                                    <Zap className="text-on-surface-variant/30 relative z-10" size={40} />
                                </div>
                                <h3 className="text-2xl font-black text-on-surface mb-2 italic uppercase tracking-tighter">{t('chat.empty.title')}</h3>
                                <p className="text-on-surface-variant font-medium max-w-sm text-center">{t('chat.empty.subtitle')}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <AnimatePresence mode="popLayout">
                                    {filteredChats.map((chat, index) => {
                                        const other = chat.participants.find(p => p.id !== user?.id) || chat.participants[0];
                                        return (
                                            <motion.div
                                                key={chat.id}
                                                layout
                                                initial={{ opacity: 0, scale: 0.99 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.99 }}
                                                transition={{
                                                    delay: Math.min(index * 0.03, 0.2),
                                                    duration: 0.2
                                                }}
                                                style={{ willChange: "transform, opacity" }}
                                                onClick={() => handleSelectChat(chat)}
                                                className="group/card relative pt-6 cursor-pointer"
                                            >
                                                {/* Card Atmosphere */}
                                                <div className="absolute top-0 inset-x-8 h-24 bg-gradient-to-b from-primary/15 to-transparent blur-xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-700" />

                                                {/* Avatar Orbit (Overlapping) */}
                                                <div className="absolute top-0 left-8 z-20 group-hover/card:-translate-y-1 transition-transform">
                                                    <Avatar
                                                        src={other.avatar_url}
                                                        alt={other.username}
                                                        status={onlineUsers.has(other.id) ? 'online' : 'offline'}
                                                        size="lg"
                                                        className="ring-4 ring-surface shadow-2xl group-hover/card:ring-primary/20 transition-all duration-500"
                                                    />
                                                </div>
                                                {/* Card Content */}
                                                <div className="liquid-glass p-5 pl-20 hover:bg-white/10 relative overflow-hidden h-full flex flex-col justify-center rounded-[2.5rem] border border-white/10 hover:border-primary/30 shadow-lg hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.15)] transition-all duration-500 group-hover/card:scale-[1.02]">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <h3 className="font-black text-on-surface uppercase italic tracking-tight truncate group-hover/card:text-primary transition-colors">
                                                            {chat.name || other.full_name || other.username}
                                                        </h3>
                                                        {chat.updated_at && (
                                                            <span className="text-[9px] font-black text-primary uppercase tracking-widest opacity-60 shrink-0 ml-2">
                                                                {formatDistanceToNow(new Date(chat.updated_at), {
                                                                    addSuffix: false,
                                                                    locale: getDateLocale(i18n.language)
                                                                })}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-on-surface-variant font-medium line-clamp-1 opacity-80 group-hover/card:opacity-100 flex items-center gap-1">
                                                        {chat.last_message ? (
                                                            <>
                                                                {chat.last_message.sender_id === user?.id && <span className="opacity-60">{t('common.you')}: </span>}
                                                                {chat.last_message.is_forwarded ? (
                                                                    <span className="italic flex items-center gap-1"><CornerDownRight size={12} /> {t('chat.message.forwarded')}</span>
                                                                ) : chat.last_message.content ? (
                                                                    <span>{chat.last_message.content}</span>
                                                                ) : (
                                                                    <span className="italic flex items-center gap-1"><ImageIcon size={12} /> {t('common.photo')}</span>
                                                                )}
                                                            </>
                                                        ) : (
                                                            t('chat.no_messages')
                                                        )}
                                                    </div>

                                                    {/* Glow Indicator for new messages (Mock) */}
                                                    <div className="absolute right-4 bottom-4 w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_currentColor] animate-pulse opacity-0 group-hover/card:opacity-100 transition-opacity" />
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </div>

                {/* Signals Sidebar (Former Experiments) */}
                <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{ willChange: "transform, opacity" }}
                    className="w-full xl:w-80 space-y-6"
                >
                    <div className="sticky top-24">
                        <ExperimentsPanel />
                    </div>
                </motion.div>
            </div >
        </div >
    );
};
