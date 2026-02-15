import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Avatar } from '../ui/Avatar';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Search, UserPlus } from 'lucide-react';

interface Profile {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
    status: 'online' | 'offline' | 'away';
}

export const UserListPanel = () => {
    const { t } = useTranslation();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfiles = async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, full_name, avatar_url, status')
                .limit(10); // Limit to 10 for discovery

            if (error) {
                console.error('Error fetching profiles:', error);
            } else {
                setProfiles(data as Profile[]);
            }
            setLoading(false);
        };

        fetchProfiles();
    }, []);

    return (
        <div className="w-80 hidden xl:flex flex-col gap-6 sticky top-8 h-fit">
            <div className="glass rounded-[32px] p-6 border border-outline-variant/5 shadow-xl shadow-primary/5">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black branding-text-highlight uppercase tracking-tight">
                        {t('discovery_panel.title')}
                    </h2>
                </div>

                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={18} />
                    <input
                        type="text"
                        placeholder={t('common.search')}
                        className="w-full pl-12 pr-4 py-3 bg-surface-container-low border border-outline-variant/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
                    />
                </div>

                <div className="flex flex-col gap-4">
                    {loading ? (
                        <div className="flex flex-col gap-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex gap-3 animate-pulse">
                                    <div className="w-10 h-10 bg-surface-container-high rounded-full" />
                                    <div className="flex-1 space-y-2 py-1">
                                        <div className="h-2 bg-surface-container-high rounded w-3/4" />
                                        <div className="h-2 bg-surface-container-high rounded w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        profiles.map((profile) => (
                            <motion.div
                                key={profile.id}
                                whileHover={{ x: 4 }}
                                className="flex items-center justify-between p-2 rounded-2xl hover:bg-surface-container-high transition-colors group"
                            >
                                <Link to={`/profile/${profile.id}`} className="flex items-center gap-3 overflow-hidden">
                                    <Avatar src={profile.avatar_url} alt={profile.username} size="md" status={profile.status} />
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-xs font-bold text-on-surface truncate">
                                            {profile.full_name || profile.username}
                                        </span>
                                        <span className="text-[9px] font-medium text-on-surface-variant/60 truncate">
                                            @{profile.username}
                                        </span>
                                    </div>
                                </Link>
                                <button
                                    className="p-2 text-primary opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10 rounded-full"
                                    title={t('friends_page.actions.admit')} // Using admit as a placeholder for "add/follow"
                                >
                                    <UserPlus size={18} />
                                </button>
                            </motion.div>
                        ))
                    )}
                </div>

            </div>

            <div className="glass rounded-[32px] p-6 border border-outline-variant/5">
                <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-[0.2em] leading-relaxed">
                    © 2026 BuddyLine Labs. <br />
                    Premium Social Experience.
                </p>
            </div>
        </div>
    );
};
