import { useState, useRef, useEffect } from 'react';
import type { Message, Chat } from '../../hooks/useChat';
import { Send, MoreVertical, Phone, Video, ArrowLeft, MessageCircle, Smile, Image as ImageIcon, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '../ui/Avatar';
import { MessageBubble } from './MessageBubble';
import { usePresence } from '../../hooks/usePresence';
import type { TFunction } from 'i18next';
import { EmojiPicker } from '../ui/EmojiPicker';
import { CompanionInfo } from './CompanionInfo';
import { BotBadge } from '../ui/BotBadge';
import { compressImage } from '../../utils/compressImage';
import { supabase } from '../../lib/supabase';

interface ChatWindowProps {
    chat: Chat | null;
    messages: Message[];
    loading: boolean;
    onSendMessage: (content: string, imageUrl?: string) => void;
    onDeleteMessage?: (messageId: string) => void;
    onBack?: () => void;
    isMuted?: boolean;
    onMuteToggle?: () => void;
    onDeleteChat?: () => void;
    onBlockUser?: () => void;
}

const formatLastSeen = (dateString: string | null | undefined, t: TFunction, lang: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return t('chat.status.just_now');
    if (diffMins < 60) return t('chat.status.minutes_ago', { count: diffMins });
    if (diffHours < 24) return t('chat.status.hours_ago', { count: diffHours });
    return date.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US');
};

export const ChatWindow = ({
    chat,
    messages,
    loading,
    onSendMessage,
    onDeleteMessage,
    onBack,
    isMuted,
    onMuteToggle,
    onDeleteChat,
    onBlockUser
}: ChatWindowProps) => {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const { onlineUsers } = usePresence();
    const [newMessage, setNewMessage] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [showCompanionInfo, setShowCompanionInfo] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert(t('post.invalid_image'));
            return;
        }

        setSelectedImage(file);
        const reader = new FileReader();
        reader.onload = (ev) => setImagePreview(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    const removeImage = () => {
        setSelectedImage(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const uploadImage = async (file: File): Promise<string | null> => {
        if (!user) return null;

        // Compress (logic same as Feed.tsx)
        const compressed = await compressImage(file, 150);

        const extension = compressed.type.split('/')[1] || 'jpg';
        const fileName = `chat/${chat?.id}/${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${extension}`;

        const { error } = await supabase.storage
            .from('post-images') // Reuse post-images bucket for simplicity unless designated chat-images exists
            .upload(fileName, compressed, {
                contentType: compressed.type,
                upsert: false,
            });

        if (error) {
            console.error('Chat upload error:', error);
            throw error;
        }

        const { data: urlData } = supabase.storage
            .from('post-images')
            .getPublicUrl(fileName);

        return urlData.publicUrl;
    };

    const performSubmit = async (content: string, imageFile: File | null) => {
        if ((!content.trim() && !imageFile) || uploading) return;

        setUploading(true);
        try {
            let imageUrl: string | undefined;
            if (imageFile) {
                imageUrl = (await uploadImage(imageFile)) || undefined;
            }

            onSendMessage(content.trim(), imageUrl);
            setNewMessage('');
            removeImage();
            setShowEmojiPicker(false);
        } catch (error) {
            console.error('Error in chat submit:', error);
            alert(t('common.error'));
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await performSubmit(newMessage, selectedImage);
    };

    const handleEmojiSelect = (emoji: string) => {
        const input = inputRef.current;
        if (!input) return;

        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const text = newMessage;
        const before = text.substring(0, start);
        const after = text.substring(end);
        const updatedContent = before + emoji + after;

        setNewMessage(updatedContent);

        // Reset focus and cursor position after state update
        setTimeout(() => {
            input.focus();
            input.setSelectionRange(start + emoji.length, start + emoji.length);
        }, 0);
    };

    if (!chat) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50 text-gray-400">
                <p>{t('chat.select_chat')}</p>
            </div>
        );
    }

    const otherParticipant = chat.participants.find(p => p.id !== user?.id) || chat.participants[0];
    const isUserOnline = onlineUsers.has(otherParticipant.id);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ willChange: "transform, opacity" }}
            className="flex-1 flex flex-col h-full relative overflow-hidden bg-surface-container-lowest/30"
        >
            {/* Companion Info Mobile Overlay */}
            <AnimatePresence>
                {showCompanionInfo && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm lg:hidden"
                        onClick={() => setShowCompanionInfo(false)}
                    >
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="absolute right-0 top-0 bottom-0 w-[85%] max-w-sm"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <CompanionInfo
                                participant={otherParticipant}
                                isMuted={isMuted}
                                onMuteToggle={onMuteToggle}
                                onDeleteChat={onDeleteChat}
                                onBlockUser={onBlockUser}
                                onClose={() => setShowCompanionInfo(false)}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Window Atmosphere */}
            <div className="absolute inset-0 -z-10 pointer-events-none opacity-40">
                <div className="absolute top-0 right-0 w-full h-1/4 bg-gradient-to-b from-primary/10 to-transparent" />
                <div className="absolute bottom-0 left-0 w-full h-1/4 bg-gradient-to-t from-tertiary/5 to-transparent" />
            </div>

            {/* Floating Comm-Header */}
            <div className="sticky top-0 z-30 p-4">
                <div className="bg-surface/60 backdrop-blur-3xl px-6 py-4 rounded-[32px] border border-outline-variant/20 flex items-center justify-between shadow-2xl shadow-primary/5">
                    <div className="flex items-center gap-4">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="p-2 -ml-2 hover:bg-surface-container rounded-full lg:hidden transition-all group"
                                title={t('common.back')}
                            >
                                <ArrowLeft size={22} className="text-on-surface animate-pulse group-hover:-translate-x-1" />
                            </button>
                        )}
                        <div className="relative group/avatar">
                            <div className="absolute -inset-1 bg-gradient-to-tr from-primary to-tertiary rounded-full opacity-0 group-hover/avatar:opacity-30 blur-md transition-opacity" />
                            <Avatar src={otherParticipant.avatar_url} alt={otherParticipant.username} status={isUserOnline ? 'online' : 'offline'} size="md" className="ring-2 ring-surface relative z-10" />
                        </div>
                        <div>
                            <h2 className="font-black text-on-surface uppercase italic tracking-tight leading-none mb-1 text-sm md:text-base truncate max-w-[120px] md:max-w-none flex items-center gap-2">
                                {chat.name || otherParticipant.full_name || otherParticipant.username}
                                <BotBadge username={otherParticipant.username} />
                            </h2>
                            <div className="flex items-center gap-2">
                                <div className={clsx("w-1.5 h-1.5 rounded-full", isUserOnline ? "bg-primary shadow-[0_0_8px_currentColor] animate-pulse" : "bg-outline-variant")} />
                                <span className="text-[10px] font-black text-primary uppercase tracking-[0.1em] opacity-80">
                                    {isUserOnline
                                        ? t('chat.uplink_status.established')
                                        : `${t('chat.status.last_seen')} ${formatLastSeen(otherParticipant.last_seen, t, i18n.language)}`}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 md:gap-2">
                        <button title={t('chat.actions.voice_call')} className="hidden sm:p-3 sm:flex hover:bg-surface-container rounded-2xl transition-all hover:scale-110 active:scale-90 text-on-surface/60 hover:text-primary"><Phone size={20} /></button>
                        <button title={t('chat.actions.video_call')} className="hidden sm:p-3 sm:flex hover:bg-surface-container rounded-2xl transition-all hover:scale-110 active:scale-90 text-on-surface/60 hover:text-tertiary"><Video size={20} /></button>
                        <div className="hidden sm:block w-[1px] h-8 bg-outline-variant/20 mx-1 xl:hidden" />
                        <button
                            title={t('common.more')}
                            onClick={() => setShowCompanionInfo(true)}
                            className="p-3 hover:bg-surface-container rounded-2xl transition-all hover:scale-110 active:scale-90 text-on-surface/60 xl:hidden"
                        >
                            <MoreVertical size={20} />
                        </button>
                        <div className="hidden xl:block w-[1px] h-8 bg-outline-variant/20 mx-1" />
                        <button title={t('common.more')} className="hidden xl:p-3 xl:flex hover:bg-surface-container rounded-2xl transition-all hover:scale-110 active:scale-90 text-on-surface/60"><MoreVertical size={20} /></button>
                    </div>
                </div>
            </div>

            {/* Messages Cascade */}
            <div className="flex-1 overflow-y-auto px-6 space-y-6 pb-6 scrollbar-hide">
                <div className="h-4" /> {/* Top Padding */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant/40">
                        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-widest">{t('chat.loading_messages')}</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant/30 italic">
                        <div className="w-20 h-20 bg-surface-container/50 rounded-full flex items-center justify-center mb-6 border border-outline-variant/10">
                            <MessageCircle size={40} className="opacity-20 translate-y-1" />
                        </div>
                        <p className="font-bold uppercase tracking-tighter text-lg">{t('chat.no_messages')}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map((msg) => (
                            <MessageBubble
                                key={msg.id}
                                message={msg}
                                isOwn={msg.sender_id === user?.id}
                                onDelete={() => onDeleteMessage?.(msg.id)}
                            />
                        ))}
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Uplink Pill Input */}
            <div className="p-6">
                <div className="max-w-4xl mx-auto relative">
                    {/* Image Preview */}
                    <AnimatePresence>
                        {imagePreview && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute bottom-full mb-4 left-0 w-32 h-32 rounded-3xl overflow-hidden border-2 border-primary/20 shadow-2xl z-20 group/preview"
                            >
                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                <button
                                    onClick={removeImage}
                                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/preview:opacity-100 transition-opacity text-white"
                                    title={t('common.remove', 'Remove')}
                                >
                                    <X size={24} />
                                </button>
                                {uploading && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Shadow/Glow base */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 via-transparent to-tertiary/10 blur-xl rounded-[32px] opacity-50" />

                    <form
                        onSubmit={handleSubmit}
                        className="relative flex gap-3 items-center bg-surface/60 backdrop-blur-3xl border border-outline-variant/20 rounded-[32px] p-2 pl-4 shadow-2xl transition-all focus-within:border-primary/40 focus-within:shadow-primary/5"
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageSelect}
                            className="hidden"
                            title={t('post.add_image')}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className={clsx(
                                "p-3 rounded-2xl transition-all shrink-0 active:scale-90",
                                selectedImage ? "text-primary bg-primary/10" : "text-on-surface-variant/40 hover:text-primary hover:bg-primary/5"
                            )}
                            title={t('post.add_image')}
                        >
                            <ImageIcon size={24} />
                        </button>

                        <input
                            ref={inputRef}
                            type="text"
                            placeholder={t('chat.type_placeholder')}
                            className="flex-1 bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-on-surface-variant/30 text-sm lg:text-base outline-none py-2"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                        />

                        <div className="relative flex items-center shrink-0">
                            <button
                                type="button"
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className={clsx(
                                    "p-3 text-on-surface-variant/40 hover:text-primary rounded-2xl transition-all active:scale-90",
                                    showEmojiPicker && "text-primary"
                                )}
                                title={t('post.add_emoji', 'Add emoji')}
                            >
                                <Smile size={24} />
                            </button>

                            <AnimatePresence>
                                {showEmojiPicker && (
                                    <EmojiPicker
                                        onSelect={handleEmojiSelect}
                                        onClose={() => setShowEmojiPicker(false)}
                                        className="absolute bottom-full mb-6 right-0"
                                    />
                                )}
                            </AnimatePresence>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            type="submit"
                            disabled={(!newMessage.trim() && !selectedImage) || uploading}
                            className={clsx(
                                "rounded-2xl w-12 h-12 lg:w-14 lg:h-14 p-0 flex items-center justify-center shadow-xl transition-all shrink-0",
                                (newMessage.trim() || selectedImage)
                                    ? "bg-primary text-on-primary shadow-primary/30"
                                    : "bg-surface-container-high text-on-surface-variant/20 cursor-not-allowed shadow-none"
                            )}
                        >
                            <Send
                                size={22}
                                className={clsx(
                                    "transition-all duration-500",
                                    (newMessage.trim() || selectedImage) && "rotate-[-12deg] translate-x-0.5 -translate-y-0.5"
                                )}
                            />
                        </motion.button>
                    </form>
                </div>
            </div>
        </motion.div>
    );
};
