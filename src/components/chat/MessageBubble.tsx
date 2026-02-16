import type { Message } from '../../hooks/useChat';
import clsx from 'clsx';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Reply, Forward, MoreVertical } from 'lucide-react'; // Removing Trash2 as it's in menu now
import { useTranslation } from 'react-i18next';
import { useState, useRef } from 'react';

interface MessageBubbleProps {
    message: Message;
    isOwn: boolean;
    onContextMenu: (e: React.MouseEvent | React.TouchEvent, message: Message) => void;
}

export const MessageBubble = ({ message, isOwn, onContextMenu }: MessageBubbleProps) => {
    const { t } = useTranslation();
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const longPressTriggered = useRef(false);
    const touchStartPos = useRef<{ x: number, y: number } | null>(null);
    const [isPressed, setIsPressed] = useState(false);

    const handleTouchStart = (e: React.TouchEvent) => {
        setIsPressed(true);
        longPressTriggered.current = false;
        touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

        longPressTimer.current = setTimeout(() => {
            longPressTriggered.current = true;
            onContextMenu(e, message);
            setIsPressed(false);
            // Vibrate if available
            if (navigator.vibrate) navigator.vibrate(50);
        }, 500);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!touchStartPos.current) return;
        const moveX = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
        const moveY = Math.abs(e.touches[0].clientY - touchStartPos.current.y);

        // If moved more than 10px, cancel long press
        if (moveX > 10 || moveY > 10) {
            if (longPressTimer.current) {
                clearTimeout(longPressTimer.current);
                longPressTimer.current = null;
            }
            setIsPressed(false);
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
        setIsPressed(false);

        // If long press was triggered, prevent default to stop click event
        if (longPressTriggered.current && e.cancelable) {
            e.preventDefault();
        }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation(); // Stop bubbling to prevent immediate close
        onContextMenu(e, message);
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: isOwn ? 20 : -20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            className={clsx(
                'flex flex-col mb-2 max-w-[85%] relative group',
                isOwn ? 'ml-auto items-end' : 'mr-auto items-start'
            )}
            onContextMenu={handleContextMenu}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
        >
            {/* Context Labels */}
            {message.is_forwarded && (
                <div className="flex items-center gap-1 text-[10px] text-on-surface-variant/60 font-bold uppercase tracking-wider mb-1 px-2">
                    <Forward size={10} />
                    {t('chat.forwarded_message', 'Forwarded')}
                </div>
            )}
            {message.reply_to_id && message.reply_message && (
                <div className={clsx(
                    "mb-1 rounded-lg px-3 py-1 text-xs border-l-2 flex flex-col max-w-full opacity-80",
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

            <div className="relative group/bubble">
                <div
                    className={clsx(
                        'px-4 py-2.5 transition-all duration-300 relative overflow-hidden',
                        isOwn
                            ? 'bg-primary text-on-primary rounded-[20px] rounded-tr-sm shadow-sm'
                            : 'bg-surface-container-high/60 backdrop-blur-md text-on-surface border border-outline-variant/10 rounded-[20px] rounded-tl-sm shadow-sm',
                        isPressed && "scale-95 opacity-90"
                    )}
                >
                    {isOwn && (
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                    )}

                    <p className="whitespace-pre-wrap text-[15px] leading-relaxed relative z-10 break-words pr-2">
                        {message.content}
                    </p>

                    {message.edited_at && (
                        <span className="text-[9px] opacity-60 ml-1 italic">(edited)</span>
                    )}

                    {message.image_url && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="mt-2 rounded-xl overflow-hidden shadow-sm relative group/image"
                        >
                            <img
                                src={message.image_url}
                                alt="Chat content"
                                className="w-full h-auto object-cover max-h-[300px]"
                            />
                        </motion.div>
                    )}

                    {/* Meta info inside bubble for compactness */}
                    <div className={clsx(
                        "flex items-center justify-end gap-1 mt-1",
                        isOwn ? "text-primary-container/60" : "text-on-surface-variant/40"
                    )}>
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

                {/* Desktop "Three Dots" Menu Trigger */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        // Explicitly trigger context menu
                        onContextMenu(e, message);
                    }}
                    className={clsx(
                        "absolute top-1/2 -translate-y-1/2 p-1.5 rounded-full backdrop-blur-md shadow-sm border border-outline-variant/10 opacity-0 group-hover/bubble:opacity-100 transition-all duration-200 flex items-center justify-center z-20",
                        isOwn
                            ? "-left-10 text-on-surface-variant bg-surface-container-high hover:bg-surface-container-highest"
                            : "-right-10 text-on-surface-variant bg-surface-container-high hover:bg-surface-container-highest"
                    )}
                    title={t('common.more', 'More options')}
                    type="button" // Ensure it's not a submit button
                >
                    <MoreVertical size={14} />
                </button>
            </div>
        </motion.div>
    );
};
