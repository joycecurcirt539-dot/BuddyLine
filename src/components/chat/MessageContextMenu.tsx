import { motion, AnimatePresence } from 'framer-motion';
import { Reply, Forward, Trash2, Edit2, Copy, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import type { Message } from '../../hooks/useChat';

interface MessageContextMenuProps {
    message: Message;
    isOwn: boolean;
    onClose: () => void;
    onReply: () => void;
    onForward: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onCopy: () => void;
    position: { x: number; y: number };
}

export const MessageContextMenu = ({
    message,
    isOwn,
    onClose,
    onReply,
    onForward,
    onEdit,
    onDelete,
    onCopy,
    position
}: MessageContextMenuProps) => {
    const { t } = useTranslation();

    // Adjust position to keep within viewport
    const style = {
        top: Math.min(position.y, window.innerHeight - 250),
        left: Math.min(position.x, window.innerWidth - 200),
    };

    // If too close to right edge, align right
    if (position.x > window.innerWidth - 200) {
        style.left = position.x - 180;
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center lg:block"
            onClick={onClose}
            onContextMenu={(e) => e.preventDefault()}
        >
            {/* Backdrop for mobile - blurs everything */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/20 backdrop-blur-sm lg:hidden"
            />

            {/* Desktop: Context Menu at position */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="hidden lg:flex flex-col w-48 bg-surface-container-high rounded-xl shadow-2xl border border-outline-variant/10 overflow-hidden absolute"
                style={style}
                onClick={(e) => e.stopPropagation()}
            >
                <MenuItem icon={Reply} label={t('chat.actions.reply', 'Reply')} onClick={onReply} />
                <MenuItem icon={Forward} label={t('chat.actions.forward', 'Forward')} onClick={onForward} />
                <MenuItem icon={Copy} label={t('common.copy', 'Copy')} onClick={onCopy} />
                {isOwn && <MenuItem icon={Edit2} label={t('common.edit', 'Edit')} onClick={onEdit} />}
                {isOwn && <MenuItem icon={Trash2} label={t('common.delete', 'Delete')} onClick={onDelete} destructive />}
            </motion.div>

            {/* Mobile: Bottom Sheet */}
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="lg:hidden absolute bottom-0 left-0 right-0 bg-surface-container-high rounded-t-[32px] overflow-hidden shadow-[0_-8px_30px_rgba(0,0,0,0.12)] border-t border-outline-variant/10"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-center pt-3 pb-1">
                    <div className="w-12 h-1.5 bg-on-surface-variant/20 rounded-full" />
                </div>

                {/* Message Preview */}
                <div className="px-6 py-4 border-b border-outline-variant/5">
                    <p className="text-sm text-on-surface-variant line-clamp-2 italic opacity-80">
                        {message.content || (message.image_url ? t('chat.image_message', 'Image') : '')}
                    </p>
                </div>

                <div className="p-4 space-y-2 pb-8">
                    <MobileMenuItem icon={Reply} label={t('chat.actions.reply', 'Reply')} onClick={onReply} />
                    <MobileMenuItem icon={Forward} label={t('chat.actions.forward', 'Forward')} onClick={onForward} />
                    <MobileMenuItem icon={Copy} label={t('common.copy', 'Copy')} onClick={onCopy} />
                    {isOwn && <MobileMenuItem icon={Edit2} label={t('common.edit', 'Edit')} onClick={onEdit} />}
                    {isOwn && <MobileMenuItem icon={Trash2} label={t('common.delete', 'Delete')} onClick={onDelete} destructive />}
                    <div className="h-2" />
                    <button
                        onClick={onClose}
                        className="w-full py-4 text-center font-bold text-on-surface bg-surface-container rounded-2xl"
                    >
                        {t('common.cancel', 'Cancel')}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

// Sub-components
const MenuItem = ({ icon: Icon, label, onClick, destructive }: any) => (
    <button
        onClick={onClick}
        className={clsx(
            "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-on-surface/5 text-left",
            destructive ? "text-error hover:bg-error/10" : "text-on-surface"
        )}
    >
        <Icon size={16} />
        {label}
    </button>
);

const MobileMenuItem = ({ icon: Icon, label, onClick, destructive }: any) => (
    <button
        onClick={onClick}
        className={clsx(
            "flex items-center gap-4 w-full p-4 rounded-2xl transition-all active:scale-[0.98]",
            destructive ? "bg-error/10 text-error" : "bg-surface-container text-on-surface"
        )}
    >
        <div className={clsx("p-2 rounded-full", destructive ? "bg-error/20" : "bg-primary/10 text-primary")}>
            <Icon size={20} />
        </div>
        <span className="font-semibold text-base">{label}</span>
    </button>
);
