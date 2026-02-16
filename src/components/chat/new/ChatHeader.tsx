import React from 'react';
import { ArrowLeft, MoreVertical, Phone, Video } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../../ui/Avatar';
import { UserBadge } from '../../ui/UserBadge';
import type { Chat } from '../../../hooks/useChat';

interface ChatHeaderProps {
    chat: Chat | null;
    onBack?: () => void;
    currentUserId?: string;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ chat, onBack, currentUserId }) => {
    const { t } = useTranslation();

    if (!chat) return null;

    // Type assertion or check actual type. Assuming Chat might have these optional for now or need update.
    // Use 'any' cast temporarily to bypass if types are missing in definition but present in data
    const chatData = chat as any;

    const otherMember = chatData.is_group
        ? null
        : chat.participants.find((p: any) => p.id !== currentUserId);

    const displayName = chatData.is_group ? chatData.name : (otherMember?.full_name || otherMember?.username);
    const displayAvatar = chatData.is_group ? chatData.image_url : otherMember?.avatar_url;
    const isOnline = !chatData.is_group && otherMember?.is_online; // Ideally we have this info

    return (
        <div className="h-16 px-4 md:px-6 flex items-center justify-between border-b border-outline-variant/10 bg-surface/80 backdrop-blur-md sticky top-0 z-30">
            <div className="flex items-center gap-3">
                {/* Back Button (Mobile) */}
                <button
                    onClick={onBack}
                    className="md:hidden p-2 -ml-2 text-on-surface-variant hover:text-on-surface rounded-full hover:bg-surface-container-high transition-colors"
                    aria-label={t('common.back')}
                >
                    <ArrowLeft size={20} />
                </button>

                {/* Avatar & Info */}
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Avatar
                            src={displayAvatar}
                            alt={displayName || 'Chat'}
                            size="sm"
                            className="bg-surface-container-high ring-2 ring-surface"
                        />
                        {isOnline && (
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-surface rounded-full" />
                        )}
                    </div>

                    <div className="flex flex-col">
                        <h2 className="text-sm md:text-base font-bold text-on-surface flex items-center gap-1.5">
                            {displayName}
                            {!chatData.is_group && otherMember && (
                                <UserBadge username={otherMember.username} isVerified={otherMember.is_verified} />
                            )}
                        </h2>
                        {/* Status or Last Seen could go here */}
                        {!chatData.is_group && (
                            <span className="text-xs text-on-surface-variant/60 font-medium">
                                {isOnline ? t('chat.online', 'Online') : t('chat.offline', 'Offline')}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 md:gap-2">
                <button aria-label={t('chat.call')} className="p-2 text-on-surface-variant hover:text-primary rounded-full hover:bg-surface-container-high transition-colors" title={t('chat.call')}>
                    <Phone size={20} />
                </button>
                <button aria-label={t('chat.video_call')} className="p-2 text-on-surface-variant hover:text-primary rounded-full hover:bg-surface-container-high transition-colors" title={t('chat.video_call')}>
                    <Video size={20} />
                </button>
                <button aria-label={t('common.more')} className="p-2 text-on-surface-variant hover:text-on-surface rounded-full hover:bg-surface-container-high transition-colors">
                    <MoreVertical size={20} />
                </button>
            </div>
        </div>
    );
};
