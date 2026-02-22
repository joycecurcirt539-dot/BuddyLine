import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { Avatar } from '../components/ui/Avatar';
import { Link, useNavigate } from 'react-router-dom';
import { Search, UserPlus, Check, Clock, MessageSquare, Loader2, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFriends } from '../hooks/useFriends';
import { usePresence } from '../hooks/usePresence';
import { useChat } from '../hooks/useChat';

interface Profile {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
    status: 'online' | 'offline' | 'away';
}

export const Directory = () => {
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
                .order('created_at', { ascending: false });

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
        if (p.id === user?.id) return false;
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
        <motion.div
            className="w-full max-w-5xl mx-auto pb-20 lg:pb-0"
            initial={{ opacity: 0, y: -28, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        >
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl lg:text-4xl page-title-highlight leading-tight flex items-center gap-4 font-black uppercase italic tracking-tighter">
                        <Users className="w-10 h-10 text-primary drop-shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]" />
                        {t('discovery_panel.title')}
                        <span className="text-sm font-bold bg-primary/20 text-primary px-3 py-1 rounded-full border border-primary/30 shadow-inner not-italic">
                            {filteredProfiles.length}
                        </span>
                    </h1>
                </div>

                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={20} />
                    <input
                        type="text"
                        placeholder={t('common.search')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-white/10 transition-all duration-300 text-sm font-black placeholder:text-on-surface-variant/30 shadow-inner"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AnimatePresence mode="popLayout">
                    {loading ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-20">
                            <Loader2 size={40} className="animate-spin text-primary opacity-50" />
                        </div>
                    ) : filteredProfiles.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="col-span-full flex flex-col items-center justify-center py-20 text-on-surface-variant/50 liquid-glass rounded-[3rem] border border-white/10 shadow-inner bg-white/5"
                        >
                            <Users size={64} className="mb-6 opacity-20 drop-shadow-xl" />
                            <p className="text-lg font-black uppercase tracking-widest">{t('friends_page.empty.title')}</p>
                        </motion.div>
                    ) : (
                        filteredProfiles.map((profile) => {
                            const state = getButtonState(profile);
                            const isOnline = onlineUsers.has(profile.id);
                            return (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    key={profile.id}
                                    className="liquid-glass p-6 rounded-[2.5rem] border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.1)] hover:-translate-y-2 hover:shadow-[0_10px_40px_rgba(var(--primary-rgb),0.15)] hover:border-primary/30 transition-all duration-500 group flex flex-col items-center relative overflow-hidden"
                                >
                                    <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                    <Link to={`/profile/${profile.id}`} className="relative mb-4 z-10 w-full flex justify-center">
                                        <div className="relative group/avatar">
                                            <div className="absolute -inset-4 bg-primary/20 blur-xl opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-500 rounded-full" />
                                            <Avatar
                                                src={profile.avatar_url}
                                                alt={profile.username}
                                                size="xl"
                                                status={isOnline ? 'online' : 'offline'}
                                                className="ring-4 ring-surface-container-high/40 shadow-xl transition-transform duration-500 group-hover/avatar:scale-105"
                                            />
                                        </div>
                                    </Link>

                                    <div className="text-center mb-6 z-10 w-full min-w-0">
                                        <h3 className="text-base font-black text-on-surface truncate px-2" title={profile.full_name || profile.username}>
                                            {profile.full_name || profile.username}
                                        </h3>
                                        <p className="text-[11px] font-bold text-on-surface-variant/60 uppercase tracking-widest truncate mt-1">
                                            @{profile.username}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3 w-full z-10 mt-auto">
                                        <button
                                            onClick={() => handleMessage(profile.id)}
                                            className="flex-1 flex justify-center items-center py-3 liquid-glass bg-white/5 text-on-surface hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-inner border border-white/5 hover:border-white/20 active:scale-95 gap-2"
                                            title={t('friends_page.actions.direct_chat')}
                                        >
                                            <MessageSquare size={16} />
                                        </button>

                                        {state === 'friend' ? (
                                            <div className="flex-1 flex justify-center items-center py-3 bg-surface-container/50 text-on-surface-variant/60 rounded-2xl border border-outline/10" title={t('friends_page.tabs.buds')}>
                                                <Check size={16} />
                                            </div>
                                        ) : state === 'sent' ? (
                                            <div className="flex-1 flex justify-center items-center py-3 bg-tertiary/10 text-tertiary rounded-2xl border border-tertiary/20 shadow-[0_0_15px_rgba(var(--tertiary-rgb),0.2)]" title={t('friends_page.request_sent')}>
                                                <Clock size={16} />
                                            </div>
                                        ) : state === 'sending' ? (
                                            <div className="flex-1 flex justify-center items-center py-3 bg-primary/10 text-primary rounded-2xl border border-primary/20">
                                                <Loader2 size={16} className="animate-spin" />
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleAddFriend(profile)}
                                                className="flex-1 flex justify-center items-center py-3 bg-gradient-to-br from-primary to-primary-container text-white rounded-2xl shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_0_25px_rgba(var(--primary-rgb),0.5)] active:scale-95 transition-all gap-2 border border-white/20"
                                                title={t('discovery_panel.add_friend')}
                                            >
                                                <UserPlus size={16} />
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};
