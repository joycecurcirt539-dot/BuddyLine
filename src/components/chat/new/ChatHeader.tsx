import { ArrowLeft, MoreVertical, Phone, Video, BellOff, Trash2, Slash } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Avatar } from '../../ui/Avatar';
import { UserBadge } from '../../ui/UserBadge';
import type { Chat } from '../../../hooks/useChat';
import { usePresence } from '../../../hooks/usePresence';

interface ChatHeaderProps {
    chat: Chat | null;
    onBack?: () => void;
    currentUserId?: string;
    isMuted?: boolean;
    onMuteToggle?: () => void;
    onDeleteChat?: () => void;
    onBlockUser?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
    chat,
    onBack,
    currentUserId,
    isMuted,
    onMuteToggle,
    onDeleteChat,
    onBlockUser
}) => {
    const { t } = useTranslation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMenuOpen]);

    if (!chat) return null;



    const otherMember = chat.type === 'group'
        ? null
        : chat.participants.find((p) => p.id !== currentUserId);

    const displayName = chat.type === 'group' ? chat.name : (otherMember?.full_name || otherMember?.username);
    const displayAvatar = chat.type === 'group' ? chat.image_url : otherMember?.avatar_url;
    const { onlineUsers } = usePresence();
    const isOnline = otherMember ? onlineUsers.has(otherMember.id) : false;

    return (
        <div className="p-4 md:p-6 sticky top-0 z-40">
            <div className="bubble flex items-center justify-between p-3 md:p-4 px-4 md:px-8 border border-outline-variant/10 shadow-2xl relative">
                <div className="flex items-center gap-4 md:gap-6">
                    {/* Back Button (Mobile) */}
                    <button
                        onClick={onBack}
                        className="md:hidden p-2.5 text-on-surface-variant hover:text-primary rounded-2xl hover:bg-primary/10 transition-all active:scale-90"
                        aria-label={t('common.back')}
                    >
                        <ArrowLeft size={20} />
                    </button>

                    {/* Avatar & Info Container */}
                    {chat.type !== 'group' && otherMember ? (
                        <Link to={`/profile/${otherMember.id}`} className="flex items-center gap-4 group/header cursor-pointer">
                            <div className="relative">
                                <div className="absolute -inset-2 bg-primary/20 blur-xl opacity-0 group-hover/header:opacity-100 transition-opacity duration-500 rounded-full" />
                                <Avatar
                                    src={displayAvatar}
                                    alt={displayName || 'Chat'}
                                    size="md"
                                    className="bg-surface-container-high ring-4 ring-white/10 shadow-xl group-hover/header:scale-105 transition-all duration-500"
                                />
                                <div className={clsx(
                                    "absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-surface-container-lowest rounded-full transition-all duration-500 shadow-lg",
                                    isOnline ? "bg-primary shadow-[0_0_10px_currentColor] animate-pulse scale-110" : "bg-outline-variant scale-90"
                                )} />
                            </div>

                            <div className="flex flex-col">
                                <h2 className="text-sm md:text-xl font-black text-on-surface flex items-center gap-2 italic uppercase tracking-tight">
                                    {displayName}
                                    <UserBadge username={otherMember.username} isVerified={otherMember.is_verified} />
                                </h2>
                                <span className="text-[10px] md:text-xs font-black text-primary uppercase tracking-[0.2em] opacity-60">
                                    {isOnline ? t('chat.status.online') : t('chat.status.offline')}
                                </span>
                            </div>
                        </Link>
                    ) : (
                        <div className="flex items-center gap-4 group/header">
                            <div className="relative">
                                <Avatar
                                    src={displayAvatar}
                                    alt={displayName || 'Chat'}
                                    size="md"
                                    className="bg-surface-container-high ring-4 ring-white/10 shadow-xl"
                                />
                            </div>

                            <div className="flex flex-col">
                                <h2 className="text-sm md:text-xl font-black text-on-surface flex items-center gap-2 italic uppercase tracking-tight">
                                    {displayName}
                                </h2>
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions Hub */}
                <div className="flex items-center gap-2 md:gap-4">
                    <div className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/5">
                        <button
                            aria-label={t('chat.actions.voice_call')}
                            className="p-3 text-on-surface-variant hover:text-primary rounded-xl hover:bg-primary/10 transition-all active:scale-90"
                        >
                            <Phone size={20} />
                        </button>
                        <button
                            aria-label={t('chat.actions.video_call')}
                            className="p-3 text-on-surface-variant hover:text-primary rounded-xl hover:bg-primary/10 transition-all active:scale-90"
                        >
                            <Video size={20} />
                        </button>
                    </div>

                    <div className="w-[1px] h-8 bg-outline-variant/10 hidden md:block mx-1" />

                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            aria-label={t('chat.actions.more')}
                            className={clsx(
                                "p-3 text-on-surface-variant hover:text-on-surface rounded-2xl hover:bg-white/10 transition-all active:scale-95",
                                isMenuOpen && "bg-white/10 text-on-surface rotate-90"
                            )}
                        >
                            <MoreVertical size={20} />
                        </button>

                        <AnimatePresence>
                            {isMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: 10, x: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 10, x: 20 }}
                                    className="absolute right-0 mt-3 w-64 bubble p-2 shadow-2xl border border-white/10 z-50 flex flex-col gap-1 overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

                                    <button
                                        onClick={() => { onMuteToggle?.(); setIsMenuOpen(false); }}
                                        className="w-full flex items-center gap-3 p-3 text-on-surface-variant hover:text-on-surface hover:bg-white/5 rounded-xl transition-all group/item"
                                    >
                                        <div className={clsx(
                                            "p-2 rounded-lg transition-all group-hover/item:scale-110",
                                            isMuted ? "bg-primary text-on-primary shadow-lg shadow-primary/20" : "bg-white/5"
                                        )}>
                                            <BellOff size={16} />
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-widest">
                                            {isMuted ? t('chat.actions.unmute') : t('chat.actions.mute')}
                                        </span>
                                    </button>

                                    <button
                                        onClick={() => { onDeleteChat?.(); setIsMenuOpen(false); }}
                                        className="w-full flex items-center gap-3 p-3 text-on-surface-variant hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-all group/item"
                                    >
                                        <div className="p-2 bg-white/5 rounded-lg group-hover/item:bg-red-400/10 transition-all group-hover/item:scale-110">
                                            <Trash2 size={16} />
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-widest">{t('chat.actions.delete_chat')}</span>
                                    </button>

                                    <div className="h-[1px] bg-white/5 mx-2 my-1" />

                                    <button
                                        onClick={() => { onBlockUser?.(); setIsMenuOpen(false); }}
                                        className="w-full flex items-center gap-3 p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-all group/item"
                                    >
                                        <div className="p-2 bg-red-500/5 rounded-lg group-hover/item:bg-red-500/10 transition-all group-hover/item:scale-110">
                                            <Slash size={16} />
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-widest">{t('chat.actions.block')}</span>
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
};
