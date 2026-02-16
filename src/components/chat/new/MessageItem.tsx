
import React, { useRef } from 'react';
import type { Message } from '../../../hooks/useChat';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Reply, Forward, MoreVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MessageItemProps {
    message: Message;
    isOwn: boolean;
    onContextMenu: (e: React.MouseEvent | React.TouchEvent, message: Message) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, isOwn, onContextMenu }) => {
    const { t } = useTranslation();
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLongPress = useRef(false);

    const handleTouchStart = (e: React.TouchEvent) => {
        isLongPress.current = false;
        longPressTimer.current = setTimeout(() => {
            isLongPress.current = true;
            if (navigator.vibrate) navigator.vibrate(50);
            onContextMenu(e, message);
        }, 500);
    };

    const handleTouchEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        onContextMenu(e, message);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={clsx(
                "flex flex-col mb-2 max-w-[85%] relative group message-item touch-manipulation",
                isOwn ? "ml-auto items-end" : "mr-auto items-start"
            )}
            onContextMenu={handleContextMenu}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchEnd}
        >
            {/* Forwarded label */}
            {message.is_forwarded && (
                <div className="flex items-center gap-1 text-[10px] text-on-surface-variant/60 font-bold uppercase tracking-wider mb-1 px-2">
                    <Forward size={10} />
                    {t('chat.forwarded_message', 'Forwarded')}
                </div>
            )}

            {/* Reply preview */}
            {message.reply_to_id && message.reply_message && (
                <div className={clsx(
                    "mb-1 rounded-lg px-3 py-1 text-xs border-l-2 flex flex-col max-w-full opacity-80 cursor-pointer hover:opacity-100 transition-opacity",
                    isOwn ? "bg-primary-container/30 border-primary-container text-on-primary-container" : "bg-surface-variant/30 border-outline text-on-surface-variant"
                )}>
                    <span className="font-bold text-[10px] uppercase opacity-70 mb-0.5 flex items-center gap-1">
                        <Reply size={10} />
                        {t('chat.reply_to', 'Replying to')}
                    </span>
                    <span className="truncate italic">
                        {message.reply_message.content || (message.reply_message.image_url ? t('chat.image_message', 'Image') : '')}
                    </span>
                </div>
            )}

            {/* Bubble */}
            <div
                className={clsx(
                    "px-4 py-2.5 relative overflow-hidden transition-all duration-200 group/bubble",
                    isOwn
                        ? "bg-primary text-on-primary rounded-[20px] rounded-tr-sm shadow-sm"
                        : "bg-surface-container-high/60 backdrop-blur-md text-on-surface border border-outline-variant/10 rounded-[20px] rounded-tl-sm shadow-sm"
                )}
            >
                {/* Three dots button — INSIDE bubble, top-right/top-left corner */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onContextMenu(e, message);
                    }}
                    className={clsx(
                        "absolute top-1 p-1 rounded-full opacity-0 group-hover/bubble:opacity-70 hover:!opacity-100 transition-opacity duration-200 z-20 hidden lg:flex items-center justify-center",
                        isOwn
                            ? "right-1.5 text-on-primary/60 hover:text-on-primary hover:bg-white/10"
                            : "left-1.5 text-on-surface-variant/60 hover:text-on-surface-variant hover:bg-black/5"
                    )}
                    aria-label={t('chat.more_options', 'More options')}
                    type="button"
                >
                    <MoreVertical size={14} />
                </button>

                {/* Content */}
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed relative z-10 break-words pr-2">
                    {message.content}
                </p>

                {/* Image */}
                {message.image_url && (
                    <div className="mt-2 rounded-xl overflow-hidden shadow-sm">
                        <img src={message.image_url} alt="Content" className="w-full h-auto max-h-[300px] object-cover" />
                    </div>
                )}

                {/* Meta */}
                <div className={clsx(
                    "flex items-center justify-end gap-1 mt-1 select-none",
                    isOwn ? "text-primary-container/60" : "text-on-surface-variant/40"
                )}>
                    {message.edited_at && <span className="text-[9px] italic mr-1">({t('common.edited', 'edited')})</span>}
                    <span className="text-[9px] font-bold tracking-wider">
                        {format(new Date(message.created_at), 'HH:mm')}
                    </span>
                    {isOwn && (
                        <div className={clsx(
                            "w-1 h-1 rounded-full",
                            message.status === 'read' ? "bg-emerald-300" : "bg-current opacity-50"
                        )} />
                    )}
                </div>
            </div>
        </motion.div>
    );
};
