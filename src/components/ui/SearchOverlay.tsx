import { motion, AnimatePresence } from 'framer-motion';
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

    return (
        <AnimatePresence initial={!reduceMotion}>
            {isOpen && (
                <>
                    <motion.div
                        initial={reduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={reduceMotion ? undefined : { opacity: 0 }}
                        onClick={onClose}
                        className={reduceEffects ? "fixed inset-0 bg-black/40 z-[100]" : "fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"}
                    />
                    <motion.div
                        initial={reduceMotion ? false : { opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={reduceMotion ? undefined : { opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed top-24 left-1/2 -translate-x-1/2 w-full max-w-lg bg-surface border border-outline-variant/20 rounded-[32px] shadow-2xl z-[101] overflow-hidden glass"
                    >
                        <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Search size={20} className="text-primary" />
                                <h3 className="text-sm font-black uppercase tracking-widest text-on-surface">
                                    {t('friends_page.search_results', 'Search Results')}
                                </h3>
                            </div>
                            <button
                                onClick={onClose}
                                aria-label="Close"
                                className="p-2 hover:bg-surface-container rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto p-4 custom-scrollbar">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-3">
                                    <Loader2 className="animate-spin text-primary" size={32} />
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                                        {t('common.searching', 'Searching...')}
                                    </p>
                                </div>
                            ) : results.length > 0 ? (
                                <div className="space-y-2">
                                    {results.map((profile) => (
                                        <div
                                            key={profile.id}
                                            className="p-4 bg-surface-container-low/40 rounded-2xl border border-outline-variant/10 flex items-center justify-between hover:bg-surface-container-low transition-colors group"
                                        >
                                            <Link
                                                to={`/profile/${profile.id}`}
                                                onClick={onClose}
                                                className="flex items-center gap-4 flex-1"
                                            >
                                                <Avatar src={profile.avatar_url} alt={profile.username} size="md" />
                                                <div>
                                                    <h4 className="text-sm font-black text-on-surface flex items-center gap-2">
                                                        {profile.full_name || profile.username}
                                                        <UserBadge username={profile.username} isVerified={profile.is_verified} />
                                                    </h4>
                                                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest opacity-80">
                                                        @{profile.username}
                                                    </p>
                                                </div>
                                            </Link>
                                            <button
                                                onClick={() => onSendRequest(profile.username)}
                                                disabled={actionLoading === profile.username}
                                                className="p-3 bg-primary/10 text-primary hover:bg-primary hover:text-on-primary rounded-xl transition-all active:scale-90"
                                            >
                                                {actionLoading === profile.username ? (
                                                    <Loader2 size={18} className="animate-spin" />
                                                ) : (
                                                    <UserPlus size={18} />
                                                )}
                                            </button>
                                        </div>
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
        </AnimatePresence>
    );
};
