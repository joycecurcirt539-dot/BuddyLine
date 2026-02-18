import { Avatar } from '../ui/Avatar';
import { UserBadge } from '../ui/UserBadge';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';
import {
    ImageIcon,
    Link as LinkIcon,
    ChevronRight,
    X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import type { Profile } from '../../hooks/useFriends';

import { usePresence } from '../../hooks/usePresence';

interface CompanionInfoProps {
    participant: Profile;
    onClose?: () => void;
}

export const CompanionInfo = ({ participant, onClose }: CompanionInfoProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { onlineUsers } = usePresence();
    const isOnline = onlineUsers.has(participant.id);

    return (
        <div className="h-full flex flex-col gap-6 p-6 overflow-y-auto custom-scrollbar relative">
            {onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-8 right-8 p-2.5 bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-on-surface rounded-2xl transition-all z-20"
                    title={t('common.cancel')}
                >
                    <X size={20} />
                </button>
            )}

            {/* Unified Premium Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bubble flex flex-col items-center relative overflow-hidden group/profile divide-y divide-white/5"
            >
                <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent opacity-50 pointer-events-none" />

                {/* Header Section (Avatar, Name, Bio) */}
                <div className="p-8 md:p-10 flex flex-col items-center w-full relative">
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 300, damping: 15 }}
                        className="relative z-10"
                    >
                        <div className="absolute -inset-4 bg-primary/20 blur-3xl opacity-0 group-hover/profile:opacity-100 transition-opacity duration-700 rounded-full" />
                        <Avatar
                            src={participant.avatar_url}
                            alt={participant.username}
                            size="xl"
                            status={isOnline ? 'online' : 'offline'}
                            className="ring-8 ring-white/5 shadow-2xl mb-8 scale-110"
                        />
                    </motion.div>

                    <div className="relative z-10 text-center w-full">
                        <div className="space-y-2 mb-8">
                            <h3 className="text-2xl md:text-3xl font-black text-on-surface uppercase tracking-tight italic flex items-center justify-center gap-3 break-words">
                                {participant.full_name || participant.username}
                                <UserBadge username={participant.username} isVerified={participant.is_verified} />
                            </h3>
                            <p className="text-primary font-black text-xs md:text-sm uppercase tracking-[0.4em] opacity-80 italic">
                                @{participant.username}
                            </p>
                        </div>

                        {participant.bio && (
                            <div className="pt-8 border-t border-white/10 text-left w-full">
                                <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                                    {t('profile_page.bio')}
                                </h4>
                                <p className="text-sm md:text-base text-on-surface font-bold leading-relaxed italic opacity-80 break-words">
                                    {participant.bio}
                                </p>
                            </div>
                        )}

                        <div className="mt-10">
                            <Button
                                variant="primary"
                                size="md"
                                className="w-full rounded-[24px] px-8 py-4 shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all font-black uppercase tracking-widest text-[11px]"
                                onClick={() => navigate(`/profile/${participant.id}`)}
                            >
                                {t('profile_page.view_profile')}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Shared Content Section */}
                <div className="p-8 w-full space-y-6 relative bg-white/[0.02]">
                    <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                        {t('chat.shared_content')}
                    </h4>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="aspect-square bg-white/5 rounded-[28px] border border-white/5 flex flex-col items-center justify-center group/media cursor-pointer hover:bg-primary/10 hover:border-primary/20 transition-all duration-500">
                            <ImageIcon size={28} className="text-on-surface-variant/20 group-hover/media:text-primary group-hover/media:scale-110 transition-all" />
                            <span className="text-[9px] font-black uppercase tracking-widest mt-2 opacity-0 group-hover/media:opacity-100 transition-opacity">Photos</span>
                        </div>
                        <div className="aspect-square bg-white/5 rounded-[28px] border border-white/5 flex flex-col items-center justify-center group/link cursor-pointer hover:bg-primary/10 hover:border-primary/20 transition-all duration-500">
                            <LinkIcon size={28} className="text-on-surface-variant/20 group-hover/link:text-primary group-hover/link:scale-110 transition-all" />
                            <span className="text-[9px] font-black uppercase tracking-widest mt-2 opacity-0 group-hover/link:opacity-100 transition-opacity">Links</span>
                        </div>
                    </div>

                    <button className="w-full flex items-center justify-between p-5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-[24px] transition-all group/view-all">
                        <span className="text-[10px] font-black text-on-surface uppercase tracking-widest">{t('chat.view_all_shared')}</span>
                        <ChevronRight size={18} className="text-primary group-hover/view-all:translate-x-1 transition-transform" />
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
