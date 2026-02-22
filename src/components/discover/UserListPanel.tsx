import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Avatar } from '../ui/Avatar';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Search, UserPlus, Check, Clock, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFriends } from '../../hooks/useFriends';
import { usePresence } from '../../hooks/usePresence';
import { useChat } from '../../hooks/useChat';
import { MessageSquare } from 'lucide-react';

interface Profile {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
    status: 'online' | 'offline' | 'away';
}

export const UserListPanel = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { friends, sendRequest, refresh: refreshFriends } = useFriends();
    const { onlineUsers } = usePresence();
    const { createDirectChat } = useChat();
    const navigate = useNavigate();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sendingTo, setSendingTo] = useState<string | null>(null);
    const [sentTo, setSentTo] = useState<Set<string>>(new Set());

    useEffect(() => {
        const fetchProfiles = async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, full_name, avatar_url, status')
                .order('created_at', { ascending: false })
                .limit(6);

            if (error) {
                console.error('Error fetching profiles:', error);
            } else {
                setProfiles(data as Profile[]);
            }
            setLoading(false);
        };

        fetchProfiles();
    }, []);

    const friendIds = new Set(friends.map(f => f.id));

    const filteredProfiles = profiles.filter(p => {
        // Hide self
        if (p.id === user?.id) return false;
        // Search filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            return p.username.toLowerCase().includes(q) ||
                (p.full_name && p.full_name.toLowerCase().includes(q));
        }
        return true;
    });

    const handleAddFriend = async (profile: Profile) => {
        setSendingTo(profile.id);
        const result = await sendRequest(profile.username);
        setSendingTo(null);

        if (result.error) {
            if (result.error === 'already_exists') {
                // Already friends or pending — mark as sent
                setSentTo(prev => new Set(prev).add(profile.id));
            } else {
                alert(result.error);
            }
        } else {
            setSentTo(prev => new Set(prev).add(profile.id));
            refreshFriends();
        }
    };

    const handleMessage = async (profileId: string) => {
        const result = await createDirectChat(profileId);
        if (result.success) {
            navigate(`/chat?id=${result.chatId}`);
        }
    };

    const getButtonState = (profile: Profile): 'friend' | 'sent' | 'available' | 'sending' => {
        if (sendingTo === profile.id) return 'sending';
        if (friendIds.has(profile.id)) return 'friend';
        if (sentTo.has(profile.id)) return 'sent';
        return 'available';
    };

    return (
        <div className="w-80 hidden xl:flex flex-col gap-4 sticky top-0 h-fit">
            <div className="liquid-glass p-5 rounded-[2.5rem] border border-white/20 shadow-[0_0_40px_rgba(0,0,0,0.1)] dark:shadow-[0_0_40px_rgba(255,255,255,0.03)] hover:border-primary/30 transition-all duration-500 overflow-hidden relative flex flex-col h-full max-h-[calc(100vh-120px)]">
                {/* Accent glow */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-[60px] pointer-events-none" />
                <div className="flex items-center justify-between mb-4 relative z-10 shrink-0">
                    <h2 className="text-lg font-black branding-text-highlight uppercase tracking-tight">
                        {t('discovery_panel.title')}
                    </h2>
                </div>

                <div className="relative mb-4 shrink-0">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={16} />
                    <input
                        type="text"
                        placeholder={t('common.search')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-white/10 transition-all duration-300 text-xs font-black placeholder:text-on-surface-variant/30 shadow-inner"
                    />
                </div>

                <div className="flex flex-col gap-2 overflow-y-auto overflow-x-hidden scrollbar-hide pb-2">
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
                    ) : filteredProfiles.length === 0 ? (
                        <p className="text-center text-on-surface-variant/40 text-xs font-bold py-6 uppercase tracking-widest">
                            {t('friends_page.empty.title')}
                        </p>
                    ) : (
                        filteredProfiles.map((profile) => {
                            const state = getButtonState(profile);
                            return (
                                <motion.div
                                    key={profile.id}
                                    whileHover={{ x: 6, scale: 1.02 }}
                                    className="flex items-center justify-between p-2 rounded-[1.25rem] hover:bg-white/10 border border-transparent hover:border-white/10 hover:shadow-lg transition-all duration-300 group z-10 overflow-hidden"
                                >
                                    <Link to={`/profile/${profile.id}`} className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                                        <Avatar
                                            src={profile.avatar_url}
                                            alt={profile.username}
                                            size="md"
                                            status={onlineUsers.has(profile.id) ? 'online' : 'offline'}
                                        />
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-xs font-bold text-on-surface truncate">
                                                {profile.full_name || profile.username}
                                            </span>
                                            <span className="text-[9px] font-medium text-on-surface-variant/60 truncate">
                                                @{profile.username}
                                            </span>
                                        </div>
                                    </Link>

                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleMessage(profile.id)}
                                            className="p-2 text-primary opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/10 rounded-full hover:scale-110 active:scale-90"
                                            title={t('friends_page.actions.direct_chat')}
                                        >
                                            <MessageSquare size={16} />
                                        </button>

                                        {state === 'friend' ? (
                                            <div className="p-2 text-primary/60" title={t('friends_page.tabs.buds')}>
                                                <Check size={16} />
                                            </div>
                                        ) : state === 'sent' ? (
                                            <div className="p-2 text-tertiary/60" title={t('friends_page.request_sent')}>
                                                <Clock size={16} />
                                            </div>
                                        ) : state === 'sending' ? (
                                            <div className="p-2 text-primary">
                                                <Loader2 size={16} className="animate-spin" />
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleAddFriend(profile)}
                                                className="p-2 text-primary opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/10 rounded-full hover:scale-110 active:scale-90"
                                                title={t('discovery_panel.add_friend')}
                                            >
                                                <UserPlus size={18} />
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </div>

                {/* View All Button */}
                {!loading && filteredProfiles.length > 0 && (
                    <div className="mt-4 shrink-0 pt-4 border-t border-white/5 relative z-10">
                        <Link
                            to="/directory"
                            className="w-full py-3 px-4 rounded-2xl liquid-glass bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-300 flex items-center justify-center gap-2 group/btn shadow-inner active:scale-95"
                        >
                            <span className="text-xs font-black uppercase tracking-widest text-on-surface group-hover/btn:text-primary transition-colors">
                                Все пользователи
                            </span>
                        </Link>
                    </div>
                )}
            </div>

            <div className="liquid-glass p-5 rounded-[2rem] border border-white/10 shadow-lg relative overflow-hidden group/footer hover:border-white/20 transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-tertiary/5 opacity-0 group-hover/footer:opacity-100 transition-opacity duration-700 pointer-events-none" />
                <p className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em] leading-relaxed italic relative z-10">
                    © 2026 BuddyLine Labs. <br />
                    {t('footer.slogan')}
                </p>
            </div>
        </div>
    );
};
