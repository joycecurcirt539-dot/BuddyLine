import { Avatar } from '../ui/Avatar';
import { UserBadge } from '../ui/UserBadge';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';
import {
    ImageIcon,
    Link as LinkIcon,
    BellOff,
    Trash2,
    Slash,
    ChevronRight,
    X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import type { Profile } from '../../hooks/useFriends';

interface CompanionInfoProps {
    participant: Profile;
    isMuted?: boolean;
    onMuteToggle?: () => void;
    onDeleteChat?: () => void;
    onBlockUser?: () => void;
    onClose?: () => void;
}

export const CompanionInfo = ({ participant, isMuted, onMuteToggle, onDeleteChat, onBlockUser, onClose }: CompanionInfoProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <div className="h-full flex flex-col bg-surface/30 backdrop-blur-xl border-l border-outline-variant/10 overflow-y-auto scrollbar-hide relative">
            {onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 hover:bg-surface-container rounded-full transition-all z-20"
                    title={t('common.cancel')}
                >
                    <X size={20} />
                </button>
            )}
            {/* Profile Header */}
            <div className="p-8 flex flex-col items-center border-b border-outline-variant/5">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", damping: 15 }}
                >
                    <Avatar
                        src={participant.avatar_url}
                        alt={participant.username}
                        size="xl"
                        status={participant.status as 'online' | 'offline' | 'away'}
                        className="ring-8 ring-primary/5 shadow-2xl mb-4"
                    />
                </motion.div>
                <h3 className="text-xl font-black text-on-surface text-center uppercase tracking-tight italic flex items-center justify-center gap-2">
                    {participant.full_name || participant.username}
                    <UserBadge username={participant.username} isVerified={participant.is_verified} />
                </h3>
                <p className="text-primary font-bold text-xs uppercase tracking-widest mt-1">
                    @{participant.username}
                </p>
                <div className="mt-4 flex gap-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        className="rounded-xl px-4 py-2 border-outline-variant/20"
                        onClick={() => navigate(`/profile/${participant.id}`)}
                    >
                        {t('profile_page.view_profile')}
                    </Button>
                </div>
            </div>

            {/* Bio & Details */}
            <div className="p-6 space-y-6">
                {participant.bio && (
                    <div className="space-y-2">
                        <h4 className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em]">
                            {t('profile_page.bio')}
                        </h4>
                        <p className="text-sm text-on-surface font-medium leading-relaxed">
                            {participant.bio}
                        </p>
                    </div>
                )}

                <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em]">
                        {t('chat.shared_content')}
                    </h4>

                    <div className="grid grid-cols-2 gap-2">
                        {/* Placeholder for shared media */}
                        <div className="aspect-square bg-surface-container-high/40 rounded-2xl flex items-center justify-center group cursor-pointer hover:bg-primary/5 transition-colors">
                            <ImageIcon size={20} className="text-on-surface-variant/20 group-hover:text-primary transition-colors" />
                        </div>
                        <div className="aspect-square bg-surface-container-high/40 rounded-2xl flex items-center justify-center group cursor-pointer hover:bg-primary/5 transition-colors">
                            <LinkIcon size={20} className="text-on-surface-variant/20 group-hover:text-primary transition-colors" />
                        </div>
                    </div>

                    <button className="w-full flex items-center justify-between p-3 bg-surface-container-low/50 rounded-2xl hover:bg-surface-container transition-colors group">
                        <span className="text-xs font-bold text-on-surface-variant">{t('chat.view_all_shared')}</span>
                        <ChevronRight size={16} className="text-on-surface-variant/40 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                {/* Actions */}
                <div className="space-y-4 pt-4">
                    <h4 className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em]">
                        {t('chat.actions.title')}
                    </h4>

                    <div className="space-y-2">
                        <button
                            onClick={onMuteToggle}
                            className="w-full flex items-center gap-3 p-3 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-2xl transition-all group"
                        >
                            <div className={clsx(
                                "p-2 bg-surface rounded-lg group-hover:bg-primary/10 transition-colors",
                                isMuted && "text-primary bg-primary/10"
                            )}>
                                <BellOff size={18} />
                            </div>
                            <span className="text-xs font-bold">
                                {isMuted ? t('chat.actions.unmute') : t('chat.actions.mute')}
                            </span>
                        </button>

                        <button
                            onClick={onDeleteChat}
                            className="w-full flex items-center gap-3 p-3 text-on-surface-variant hover:text-red-500 hover:bg-red-500/5 rounded-2xl transition-all group"
                        >
                            <div className="p-2 bg-surface rounded-lg group-hover:bg-red-500/10 transition-colors">
                                <Trash2 size={18} />
                            </div>
                            <span className="text-xs font-bold">{t('chat.actions.delete_chat')}</span>
                        </button>

                        <button
                            onClick={onBlockUser}
                            className="w-full flex items-center gap-3 p-3 text-red-500 hover:bg-red-500/10 rounded-2xl transition-all group"
                        >
                            <div className="p-2 bg-red-500/5 rounded-lg group-hover:bg-red-500/10 transition-colors">
                                <Slash size={18} />
                            </div>
                            <span className="text-xs font-bold">{t('chat.actions.block')}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
