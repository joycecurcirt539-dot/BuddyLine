import { useState, useEffect } from 'react';
import { useChat } from '../hooks/useChat';
import type { Chat as ChatType } from '../hooks/useChat';
import { ChatWindow } from '../components/chat/ChatWindow';
import { Avatar } from '../components/ui/Avatar';
import { Search, Plus, MessageSquare, X, UserPlus, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFriends } from '../hooks/useFriends';
import { formatDistanceToNow } from 'date-fns';
import { SecretPanel } from '../components/chat/SecretPanel';
import { ExperimentsPanel } from '../components/chat/ExperimentsPanel';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { CompanionInfo } from '../components/chat/CompanionInfo';

export const Chat = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { friends, blockUser } = useFriends();
    const { chats, activeChat, messages, loading, messagesLoading, selectChat, sendMessage, createDirectChat, deleteChat, deleteMessage } = useChat();
    const [mutedChats, setMutedChats] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [view, setView] = useState<'list' | 'chat'>('list');
    const [searchParams, setSearchParams] = useSearchParams();
    const [showNewChat, setShowNewChat] = useState(false);

    // Filter chats
    const filteredChats = chats.filter(chat => {
        const other = chat.participants.find(p => p.id !== user?.id) || chat.participants[0];
        const name = chat.name || other.full_name || other.username;
        return name.toLowerCase().includes(searchTerm.toLowerCase());
    });

    // Auto-select chat from URL
    useEffect(() => {
        const chatId = searchParams.get('id');
        if (chatId && chats.length > 0) {
            const chat = chats.find(c => c.id === chatId);
            if (chat && (!activeChat || activeChat.id !== chat.id)) {
                selectChat(chat);
                // Defer setting view to avoid cascading render warning
                setTimeout(() => setView('chat'), 0);
            }
        }
    }, [searchParams, chats, selectChat, activeChat]);

    const handleSelectChat = (chat: ChatType) => {
        selectChat(chat);
        setSearchParams({ id: chat.id });
        setView('chat');
    };

    const handleStartNewChat = async (friendId: string) => {
        const result = await createDirectChat(friendId);
        if (result.success && result.chatId) {
            setShowNewChat(false);
            setSearchParams({ id: result.chatId });
        } else if (result.error) {
            alert(result.error);
        }
    };

    const handleBack = () => {
        setView('list');
        setSearchParams({});
    };

    const handleDeleteChat = async () => {
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
        if (!activeChat) return;
        const other = activeChat.participants.find(p => p.id !== user?.id) || activeChat.participants[0];
        if (window.confirm(`${t('chat.block_confirm') || 'Block'} ${other.full_name || other.username}?`)) {
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

    if (view === 'chat' && activeChat) {
        const other = activeChat.participants.find(p => p.id !== user?.id) || activeChat.participants[0];
        return (
            <div className="w-full flex-1 flex gap-6 min-h-0">
                <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{ willChange: "transform, opacity" }}
                    className="flex-1 bg-surface-container-lowest rounded-3xl shadow-lg border border-outline-variant/10 overflow-hidden flex flex-col transition-colors min-h-0"
                >
                    <ChatWindow
                        chat={activeChat}
                        messages={messages}
                        loading={messagesLoading}
                        onSendMessage={sendMessage}
                        onDeleteMessage={deleteMessage}
                        onBack={() => selectChat(null as unknown as ChatType)}
                    />
                </motion.div>

                {/* Desktop Right Sidebar */}
                <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    style={{ willChange: "transform, opacity" }}
                    className="hidden xl:block w-96 shrink-0 bg-surface-container-low rounded-3xl shadow-lg border border-outline-variant/10 overflow-hidden transition-all"
                >
                    <CompanionInfo
                        participant={other}
                        isMuted={mutedChats.has(activeChat.id)}
                        onMuteToggle={handleMuteToggle}
                        onDeleteChat={handleDeleteChat}
                        onBlockUser={handleBlockUser}
                    />
                </motion.div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 w-full flex-1 relative min-h-0 pb-10">
            {/* Background Atmosphere */}
            <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute top-[5%] left-[10%] w-[35%] h-[35%] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute top-[40%] right-[5%] w-[30%] h-[30%] bg-tertiary/5 rounded-full blur-[100px] animate-pulse delay-700" />
            </div>

            {/* New Chat Modal */}
            <AnimatePresence>
                {showNewChat && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.98, y: 10 }}
                            animate={{ scale: 1, y: 0 }}
                            style={{ willChange: "transform, opacity" }}
                            className="bg-surface-container-low w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl border border-outline-variant/10"
                        >
                            <div className="p-8 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container/30">
                                <div>
                                    <h3 className="text-2xl font-black uppercase tracking-tight italic leading-none">{t('chat.start_new')}</h3>
                                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1 opacity-60">{t('chat.initiate_uplink')}</p>
                                </div>
                                <button
                                    onClick={() => setShowNewChat(false)}
                                    className="p-3 hover:bg-surface-container rounded-full transition-all group"
                                    title={t('common.cancel')}
                                >
                                    <X size={20} className="group-hover:rotate-90 transition-transform" />
                                </button>
                            </div>
                            <div className="p-6 max-h-[400px] overflow-y-auto space-y-3">
                                {friends.length === 0 ? (
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
                                            className="p-4 bg-surface/50 hover:bg-primary/10 rounded-3xl flex items-center gap-4 cursor-pointer transition-all border border-outline-variant/10 hover:border-primary/20 group"
                                        >
                                            <Avatar src={friend.avatar_url} alt={friend.username} status={friend.status} size="md" className="ring-4 ring-surface shadow-xl" />
                                            <div className="flex-1">
                                                <p className="font-black text-on-surface uppercase italic tracking-tight">{friend.full_name || friend.username}</p>
                                                <p className="text-[10px] text-primary font-black uppercase tracking-widest opacity-70">@{friend.username}</p>
                                            </div>
                                            <div className="p-2 bg-primary/10 rounded-xl group-hover:bg-primary group-hover:text-on-primary transition-all">
                                                <UserPlus size={18} />
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Central signal hub */}
            <div className="w-full flex flex-col xl:flex-row gap-6">
                <div className="flex-1 flex flex-col min-h-0">
                    {/* The Signal Hub (Header) */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ willChange: "transform, opacity" }}
                        className="bg-surface/40 backdrop-blur-3xl border border-outline-variant/20 rounded-[40px] p-6 shadow-2xl shadow-primary/5 mb-6 relative overflow-hidden group"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-tertiary/5 opacity-50" />

                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div>
                                <h1 className="text-2xl lg:text-3xl font-black text-on-surface uppercase tracking-tight italic leading-none mb-1">
                                    {t('common.messages')}
                                </h1>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{t('chat.signal_node_active')}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <div className="relative flex-1 md:w-72 group/search">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-tertiary/20 rounded-2xl blur opacity-0 group-focus-within/search:opacity-100 transition duration-500" />
                                    <div className="relative flex items-center bg-surface-container rounded-2xl border border-outline-variant/20 group-focus-within/search:border-primary group-focus-within/search:bg-surface-container-lowest transition-all">
                                        <Search className="ml-4 text-on-surface-variant/40 group-focus-within/search:text-primary transition-colors" size={18} />
                                        <input
                                            type="text"
                                            placeholder={t('common.search')}
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-3 pr-4 py-3 bg-transparent outline-none text-on-surface font-bold text-sm placeholder:text-on-surface-variant/30"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={() => setShowNewChat(true)}
                                    title={t('chat.start_new')}
                                    className="p-3 bg-primary text-on-primary rounded-2xl shadow-lg shadow-primary/20 hover:scale-110 active:scale-95 transition-all group/new"
                                >
                                    <Plus size={24} className="group-hover:rotate-180 transition-transform duration-500" />
                                </button>
                            </div>
                        </div>
                    </motion.div>

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
                                                        status={other.status}
                                                        size="lg"
                                                        className="ring-4 ring-surface shadow-2xl group-hover/card:ring-primary/20 transition-all duration-500"
                                                    />
                                                </div>

                                                {/* Card Content */}
                                                <div className="bg-surface-container-lowest/60 backdrop-blur-3xl rounded-[32px] border border-outline-variant/10 p-5 pl-20 shadow-xl hover:shadow-2xl hover:bg-surface-container-highest/80 transition-all duration-500 relative overflow-hidden h-full flex flex-col justify-center">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <h3 className="font-black text-on-surface uppercase italic tracking-tight truncate group-hover/card:text-primary transition-colors">
                                                            {chat.name || other.full_name || other.username}
                                                        </h3>
                                                        {chat.updated_at && (
                                                            <span className="text-[9px] font-black text-primary uppercase tracking-widest opacity-60 shrink-0 ml-2">
                                                                {formatDistanceToNow(new Date(chat.updated_at), { addSuffix: false })}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-on-surface-variant font-medium line-clamp-1 opacity-80 group-hover/card:opacity-100">
                                                        {chat.last_message?.content || t('chat.no_messages')}
                                                    </p>

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
                    className="w-full xl:w-96 space-y-6"
                >
                    <SecretPanel />
                    <div className="sticky top-24">
                        <ExperimentsPanel />
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
