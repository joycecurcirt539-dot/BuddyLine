import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Avatar } from './Avatar';
import { UserBadge } from './UserBadge';
import { Search, UserPlus, Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { usePerformanceMode } from '../../hooks/usePerformanceMode';

interface SearchResult {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
    is_verified?: boolean;
}

interface SearchOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    results: SearchResult[];
    loading: boolean;
    onSendRequest: (username: string) => void;
    actionLoading: string | null;
}

export const SearchOverlay = ({ isOpen, onClose, results, loading, onSendRequest, actionLoading }: SearchOverlayProps) => {
    const { t } = useTranslation();
    const { reduceMotion, reduceEffects } = usePerformanceMode();

    return createPortal(
        <AnimatePresence initial={!reduceMotion}>
            {isOpen && (
                <>
                    <motion.div
                        initial={reduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={reduceMotion ? undefined : { opacity: 0 }}
                        onClick={onClose}
                        className={reduceEffects ? "fixed inset-0 bg-black/60 z-[100]" : "fixed inset-0 bg-black/60 backdrop-blur-md z-[100] cursor-pointer"}
                    />
                    <motion.div
                        initial={reduceMotion ? false : { opacity: 0, scale: 0.9, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={reduceMotion ? undefined : { opacity: 0, scale: 0.9, y: 30 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="fixed top-24 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-lg liquid-glass rounded-[2.5rem] shadow-2xl z-[101] overflow-hidden border-white/20"
                    >
                        <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/5 dark:bg-black/20">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/20 rounded-2xl">
                                    <Search size={22} className="text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tight italic text-white leading-none">
                                        {t('friends_page.search_results', 'Search Results')}
                                    </h3>
                                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mt-1.5 opacity-60">Global Directory</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                aria-label="Close"
                                className="p-3 hover:bg-white/10 rounded-full transition-all group relative z-10"
                            >
                                <X size={20} className="group-hover:rotate-90 transition-transform text-white/70 group-hover:text-white" />
                            </button>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto p-4 custom-scrollbar relative z-10">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-16 gap-4">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                                        <Loader2 className="animate-spin text-primary relative z-10" size={40} />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 animate-pulse">
                                        {t('common.searching', 'Searching...')}
                                    </p>
                                </div>
                            ) : results.length > 0 ? (
                                <div className="space-y-2">
                                    {results.map((profile) => (
                                        <motion.div
                                            key={profile.id}
                                            whileHover={{ x: 6, scale: 1.02 }}
                                            className="p-5 bg-white/20 dark:bg-white/5 rounded-[2rem] border border-white/20 flex items-center justify-between hover:bg-white/30 dark:hover:bg-white/10 transition-all duration-300 group shadow-lg"
                                        >
                                            <Link
                                                to={"/profile/" + profile.id}
                                                onClick={onClose}
                                                className="flex items-center gap-5 flex-1"
                                            >
                                                <Avatar src={profile.avatar_url} alt={profile.username} size="lg" className="ring-4 ring-white shadow-xl" />
                                                <div>
                                                    <h4 className="text-base font-black text-on-surface flex items-center gap-2 uppercase italic tracking-tight group-hover:text-primary transition-colors">
                                                        {profile.full_name || profile.username}
                                                        <UserBadge username={profile.username} isVerified={profile.is_verified} />
                                                    </h4>
                                                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] opacity-70 mt-1">
                                                        @{profile.username}
                                                    </p>
                                                </div>
                                            </Link>
                                            <button
                                                onClick={() => onSendRequest(profile.username)}
                                                disabled={actionLoading === profile.username}
                                                className="p-4 bg-primary text-on-primary hover:scale-110 active:scale-95 rounded-2xl transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                                            >
                                                {actionLoading === profile.username ? (
                                                    <Loader2 size={18} className="animate-spin" />
                                                ) : (
                                                    <UserPlus size={20} />
                                                )}
                                            </button>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-12 text-center">
                                    <p className="text-on-surface-variant font-bold uppercase tracking-widest text-xs opacity-40">
                                        {t('friends_page.no_results', 'No users found')}
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
};
