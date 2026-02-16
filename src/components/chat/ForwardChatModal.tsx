import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, MessageSquare, Loader2, Send } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { useTranslation } from 'react-i18next';
import type { Chat } from '../../hooks/useChat';
import type { Profile } from '../../hooks/useFriends'; // Assuming Profile type is exported here or similar

interface ForwardChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (targetId: string, isNewChat: boolean) => void;
    chats: Chat[];
    friends: Profile[]; // Use Profile type if available
    onlineUsers: Set<string>;
    loading?: boolean;
}

export const ForwardChatModal = ({
    isOpen,
    onClose,
    onSelect,
    chats,
    friends,
    onlineUsers,
    loading = false
}: ForwardChatModalProps) => {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredChats = useMemo(() => {
        return chats.filter(chat => {
            const name = chat.name || chat.participants.find(p => p.id !== 'me')?.full_name || 'Chat';
            return name.toLowerCase().includes(searchTerm.toLowerCase());
        });
    }, [chats, searchTerm]);

    const filteredFriends = useMemo(() => {
        return friends.filter(friend =>
            friend.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (friend.full_name && friend.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [friends, searchTerm]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
                >
                    <motion.div
                        initial={{ scale: 0.98, y: 10 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.98, y: 10, opacity: 0 }}
                        className="bg-surface-container-low w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl border border-outline-variant/10 flex flex-col max-h-[80vh]"
                    >
                        <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container/30 shrink-0">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight italic leading-none">{t('chat.forward_to', 'Forward to...')}</h3>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-surface-container rounded-full transition-all"
                                title={t('common.close', 'Close')}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="px-6 py-4 shrink-0">
                            <div className="relative group/search">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within/search:text-primary transition-colors" size={16} />
                                <input
                                    type="text"
                                    placeholder={t('common.search')}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-surface/50 border border-outline-variant/10 rounded-[20px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-bold"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="animate-spin text-primary" size={24} />
                                </div>
                            ) : (
                                <>
                                    {/* Recent Chats Section */}
                                    {filteredChats.length > 0 && (
                                        <div className="mb-4">
                                            <h4 className="px-4 text-xs font-bold text-on-surface-variant/50 uppercase tracking-widest mb-2">{t('chat.recent_chats', 'Recent Chats')}</h4>
                                            {filteredChats.map(chat => {
                                                // Generic participant logic - assumes chat handles participant filtering or we do it here
                                                // Ideally we need 'user' id to filter out self, but for now we take the first other participant
                                                // Accessing participant from chat object - assuming chat structure
                                                const other = chat.participants[0];
                                                // Note: This needs refinement if we don't have user ID to exclude self. 
                                                // But in Chat.tsx we usually filter. Here we just rely on display logic.

                                                return (
                                                    <button
                                                        key={chat.id}
                                                        onClick={() => onSelect(chat.id, false)}
                                                        className="w-full p-3 hover:bg-primary/5 rounded-2xl flex items-center gap-3 transition-colors group text-left"
                                                    >
                                                        <Avatar
                                                            src={other?.avatar_url}
                                                            alt={other?.username || 'Chat'}
                                                            size="md"
                                                            status={other && onlineUsers.has(other.id) ? 'online' : 'offline'}
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-bold text-on-surface truncate">{chat.name || other?.full_name || other?.username}</p>
                                                            <p className="text-xs text-on-surface-variant/60 truncate">
                                                                {chat.last_message?.content || t('chat.no_messages')}
                                                            </p>
                                                        </div>
                                                        <div className="p-2 text-on-surface-variant/20 group-hover:text-primary transition-colors">
                                                            <Send size={16} className="-rotate-45 translate-y-0.5" />
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Friends Section */}
                                    {filteredFriends.length > 0 && (
                                        <div>
                                            <h4 className="px-4 text-xs font-bold text-on-surface-variant/50 uppercase tracking-widest mb-2">{t('common.friends', 'Friends')}</h4>
                                            {filteredFriends.map(friend => (
                                                <button
                                                    key={friend.id}
                                                    onClick={() => onSelect(friend.id, true)}
                                                    className="w-full p-3 hover:bg-primary/5 rounded-2xl flex items-center gap-3 transition-colors group text-left"
                                                >
                                                    <Avatar
                                                        src={friend.avatar_url}
                                                        alt={friend.username}
                                                        size="md"
                                                        status={onlineUsers.has(friend.id) ? 'online' : 'offline'}
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-on-surface truncate">{friend.full_name || friend.username}</p>
                                                        <p className="text-[10px] text-primary font-black uppercase tracking-widest opacity-60">@{friend.username}</p>
                                                    </div>
                                                    <div className="p-2 text-on-surface-variant/20 group-hover:text-primary transition-colors">
                                                        <MessageSquare size={16} />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {filteredChats.length === 0 && filteredFriends.length === 0 && (
                                        <div className="text-center py-8 text-on-surface-variant/40">
                                            <p>{t('common.no_results')}</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
