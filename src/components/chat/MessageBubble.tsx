import type { Message } from '../../hooks/useChat';
import clsx from 'clsx';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MessageBubbleProps {
    message: Message;
    isOwn: boolean;
    onDelete?: () => void;
}

export const MessageBubble = ({ message, isOwn, onDelete }: MessageBubbleProps) => {
    const { t } = useTranslation();
    return (
        <motion.div
            initial={{ opacity: 0, x: isOwn ? 20 : -20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            className={clsx(
                'flex flex-col mb-4 max-w-[85%] group',
                isOwn ? 'ml-auto items-end' : 'mr-auto items-start'
            )}
        >
            <div
                className={clsx(
                    'px-5 py-3.5 transition-all duration-500 relative overflow-hidden',
                    isOwn
                        ? 'bg-primary text-on-primary rounded-[28px] rounded-tr-none shadow-2xl shadow-primary/20'
                        : 'bg-surface-container-highest/40 backdrop-blur-xl text-on-surface border border-outline-variant/10 rounded-[28px] rounded-tl-none shadow-xl shadow-black/5'
                )}
            >
                {isOwn && (
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                )}
                <p className="whitespace-pre-wrap text-sm lg:text-base font-medium leading-relaxed tracking-tight relative z-10">
                    {message.content}
                </p>

                {message.image_url && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-3 rounded-2xl overflow-hidden border border-outline-variant/10 shadow-lg relative group/image"
                    >
                        <img
                            src={message.image_url}
                            alt="Chat content"
                            className="w-full h-auto object-cover max-h-[400px] transition-transform duration-500 group-hover/image:scale-105"
                        />
                    </motion.div>
                )}

                {/* Delete Trigger (Own messages only) */}
                {isOwn && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete?.();
                        }}
                        className="absolute top-2 right-2 p-1.5 h-auto text-on-primary/0 group-hover:text-on-primary/40 hover:text-white hover:bg-white/10 rounded-lg transition-all z-20"
                        title={t('chat.delete_message')}
                    >
                        <Trash2 size={14} />
                    </button>
                )}

                {/* Micro-interaction glow on hover */}
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>

            <div className="flex items-center gap-2 mt-2 px-2">
                <span className="text-[9px] uppercase tracking-[0.2em] font-black text-on-surface-variant/30">
                    {format(new Date(message.created_at), 'HH:mm')}
                </span>
                {isOwn && (
                    <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
                )}
            </div>
        </motion.div>
    );
};
