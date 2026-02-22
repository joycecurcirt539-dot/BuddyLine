import { useState } from 'react';
import { useFriends } from '../hooks/useFriends';
import { usePresence } from '../hooks/usePresence';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../hooks/useChat';
import type { Profile } from '../hooks/useFriends';
import {
    Users,
    Search,
    MessageCircle,
    Check,
    X,
    Loader2,
    AtSign,
    User as UserIcon,
    AlertCircle
} from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { UserBadge } from '../components/ui/UserBadge';
import { SearchOverlay } from '../components/ui/SearchOverlay';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { FriendsSidebar } from '../components/friends/FriendsSidebar';
import { useAuth } from '../context/AuthContext';

export const Friends = () => {
    const { t } = useTranslation();
    const { isGuest } = useAuth();
    const {
        friends,
        requests,
        sentRequests,
        loading,
        sendRequest,
        acceptRequest,
        rejectRequest,
        cancelRequest,
        searchUsers,
        refresh
    } = useFriends();
    const { onlineUsers } = usePresence();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchType, setSearchType] = useState<'username' | 'name'>('username');
    const [searchResults, setSearchResults] = useState<Profile[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showOverlay, setShowOverlay] = useState(false);
    const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
    const [requestSubTab, setRequestSubTab] = useState<'incoming' | 'sent'>('incoming');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const navigate = useNavigate();
    const { createDirectChat } = useChat();

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (isGuest) {
            alert(t('login_page.login_to_interact'));
            return;
        }
        const q = searchQuery.trim();
        if (!q) return;

        setIsSearching(true);
        setShowOverlay(true);
        const { data, error } = await searchUsers(q, searchType);
        setIsSearching(false);

        if (error) {
            console.error('Search error:', error);
        } else {
            setSearchResults(data || []);
        }
    };

    const handleSendRequest = async (username: string) => {
        if (isGuest) {
            alert(t('login_page.login_to_interact'));
            return;
        }
        setActionLoading(username);
        const result = await sendRequest(username);
        setActionLoading(null);

        if (result.error) {
            if (result.error === 'already_exists') {
                alert(result.details || t('friends_page.already_friends'));
            } else {
                alert(result.error);
            }
        } else {
            alert(t('friends_page.request_sent'));
            refresh();
        }
    };

    const handleCancelRequest = async (id: string, username: string) => {
        if (isGuest) {
            alert(t('login_page.login_to_interact'));
            return;
        }
        setActionLoading(username);
        await cancelRequest(id);
        setActionLoading(null);
    };

    const handleChat = async (userId: string) => {
        if (isGuest) {
            alert(t('login_page.login_to_interact'));
            return;
        }
        const result = await createDirectChat(userId);
        if (result.success) {
            navigate(`/chat?id=${result.chatId}`);
        }
    };

    return (
        <motion.div
            className="max-w-none flex gap-8 pb-24 lg:pb-10 px-4"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        >
            <div className="flex-1 min-w-0 space-y-6">
                {/* Dual Search Header */}
                <div className="liquid-glass p-4 sm:p-6 lg:p-8 space-y-6 rounded-[3rem] border border-white/20 shadow-[0_0_40px_rgba(0,0,0,0.1)] dark:shadow-[0_0_40px_rgba(255,255,255,0.03)] relative overflow-hidden">
                    <div className="absolute -top-20 -left-20 w-40 h-40 bg-emerald-500/20 rounded-full blur-[60px] pointer-events-none" />
                    <div className="flex flex-col md:flex-row items-center gap-4 relative z-10">
                        {/* Tabs on the Left */}
                        <div className="flex bg-white/5 backdrop-blur-md rounded-[2rem] p-1.5 border border-white/10 w-full md:w-auto shrink-0 shadow-inner">
                            <button
                                onClick={() => setActiveTab('friends')}
                                className={clsx(
                                    "flex-1 md:flex-none px-5 md:px-7 py-2.5 md:py-3.5 rounded-[1.5rem] text-[10px] md:text-sm font-black uppercase tracking-widest transition-all duration-300 text-center",
                                    activeTab === 'friends'
                                        ? "bg-primary text-white shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] scale-100"
                                        : "text-on-surface-variant hover:text-on-surface hover:bg-white/10 scale-95 hover:scale-100"
                                )}
                            >
                                {t('friends_page.tabs.buds')}
                            </button>
                            <button
                                onClick={() => setActiveTab('requests')}
                                className={clsx(
                                    "flex-1 md:flex-none px-5 md:px-7 py-2.5 md:py-3.5 rounded-[1.5rem] text-[10px] md:text-sm font-black uppercase tracking-widest transition-all duration-300 relative text-center",
                                    activeTab === 'requests'
                                        ? "bg-primary text-white shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] scale-100"
                                        : "text-on-surface-variant hover:text-on-surface hover:bg-white/10 scale-95 hover:scale-100"
                                )}
                            >
                                {t('friends_page.tabs.invites')}
                                {requests.length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-tertiary text-on-tertiary rounded-full text-[9px] sm:text-[10px] flex items-center justify-center border-2 border-surface animate-bounce">
                                        {requests.length}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Search on the Right */}
                        <form onSubmit={handleSearch} className="relative flex-1 w-full">
                            <div className="flex items-stretch gap-3">
                                <div className="flex-1 relative group">
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                                        {searchType === 'username' ? (
                                            <AtSign size={18} className="text-primary transition-transform group-focus-within:scale-110" />
                                        ) : (
                                            <UserIcon size={18} className="text-primary transition-transform group-focus-within:scale-110" />
                                        )}
                                    </div>
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (searchType === 'username' && val && !val.startsWith('@') && !searchQuery.startsWith('@')) {
                                                setSearchQuery('@' + val);
                                            } else {
                                                setSearchQuery(val);
                                            }
                                        }}
                                        placeholder={searchType === 'username' ? t('friends_page.search_username_placeholder') : t('friends_page.search_name_placeholder')}
                                        className="w-full h-[56px] pl-14 pr-6 bg-white/5 backdrop-blur-md rounded-[1.5rem] border border-white/10 focus:ring-2 focus:ring-primary/40 focus:border-primary/50 focus:bg-white/10 outline-none transition-all font-black text-on-surface text-sm placeholder:opacity-30 shadow-inner"
                                    />
                                </div>

                                <div className="flex gap-2 h-[56px]">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const nextType = searchType === 'username' ? 'name' : 'username';
                                            setSearchType(nextType);
                                            setSearchQuery('');
                                        }}
                                        className="h-full px-5 bg-white/5 backdrop-blur-md rounded-[1.5rem] border border-white/10 flex items-center gap-2 hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 group shadow-sm"
                                    >
                                        <span className="font-black text-[9px] uppercase tracking-[0.1em] text-primary whitespace-nowrap hidden sm:inline">
                                            {searchType === 'username' ? t('friends_page.type_username') : t('friends_page.type_name')}
                                        </span>
                                        <div className="w-6 h-6 flex items-center justify-center bg-primary/20 text-primary rounded-full group-hover:bg-primary group-hover:text-white group-hover:shadow-[0_0_10px_rgba(var(--primary-rgb),0.4)] transition-all duration-300">
                                            <motion.div
                                                animate={{ rotate: searchType === 'username' ? 0 : 180 }}
                                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                            >
                                                <AtSign size={12} />
                                            </motion.div>
                                        </div>
                                    </button>

                                    <Button
                                        type="submit"
                                        disabled={!searchQuery.trim() || isSearching}
                                        className="h-full px-8 rounded-[1.5rem] flex items-center gap-2 shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] bg-gradient-to-r from-primary to-primary-container hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.5)] hover:scale-[1.05] active:scale-95 transition-all duration-300 text-xs font-black uppercase tracking-widest border border-white/20"
                                    >
                                        {isSearching ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Results Overlay */}
                <SearchOverlay
                    isOpen={showOverlay}
                    onClose={() => setShowOverlay(false)}
                    results={searchResults}
                    loading={isSearching}
                    onSendRequest={handleSendRequest}
                    actionLoading={actionLoading}
                />

                {/* Content Tabs */}
                <div
                    className="space-y-4"
                >
                    {activeTab === 'friends' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {loading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="h-24 bg-surface-container-low rounded-3xl animate-pulse border border-outline-variant/10" />
                                ))
                            ) : friends.length === 0 ? (
                                <div className="col-span-full py-20 text-center bubble border-dashed">
                                    <Users size={48} className="mx-auto text-primary/20 mb-4" />
                                    <p className="text-on-surface-variant font-bold uppercase tracking-widest text-xs opacity-40">
                                        {t('friends_page.no_friends')}
                                    </p>
                                </div>
                            ) : (
                                friends.map((friend) => (
                                    <motion.div
                                        key={friend.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        onClick={() => navigate(`/profile/${friend.id}`)}
                                        className="liquid-glass p-5 rounded-[2rem] border border-white/10 shadow-lg hover:border-primary/30 hover:shadow-[0_0_25px_rgba(16,185,129,0.15)] flex items-center justify-between group cursor-pointer transition-all duration-500 hover:scale-[1.02]"
                                    >
                                        <div className="flex items-center gap-4">
                                            <Avatar
                                                src={friend.avatar_url}
                                                alt={friend.username}
                                                size="md"
                                                status={onlineUsers.has(friend.id) ? 'online' : 'offline'}
                                                className="ring-2 ring-primary/20 shadow-lg"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <h3 className="text-sm font-black text-on-surface flex items-center gap-2 truncate">
                                                    <span className="truncate">{friend.full_name || friend.username}</span>
                                                    <UserBadge username={friend.username} isVerified={friend.is_verified} className="shrink-0" />
                                                </h3>
                                                <p className="text-[10px] font-bold text-primary uppercase tracking-widest opacity-80 truncate">
                                                    @{friend.username}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleChat(friend.id);
                                            }}
                                            className="p-3.5 bg-primary/20 text-primary border border-primary/30 hover:bg-primary hover:text-white rounded-[1.25rem] transition-all duration-300 active:scale-90 hover:shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)] shadow-sm"
                                            title={t('chat.send_message')}
                                        >
                                            <MessageCircle size={18} />
                                        </button>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Custom Sub-navigation for Requests */}
                            <div className="flex gap-4 border-b border-outline-variant/10 pb-2">
                                <button
                                    onClick={() => setRequestSubTab('incoming')}
                                    className={clsx(
                                        "text-[10px] font-black uppercase tracking-[0.2em] transition-all relative pb-2",
                                        requestSubTab === 'incoming' ? "text-primary" : "text-on-surface-variant opacity-40 hover:opacity-100"
                                    )}
                                >
                                    {t('friends_page.incoming_requests')}
                                    {requestSubTab === 'incoming' && <motion.div layoutId="subtab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                                </button>
                                <button
                                    onClick={() => setRequestSubTab('sent')}
                                    className={clsx(
                                        "text-[10px] font-black uppercase tracking-[0.2em] transition-all relative pb-2",
                                        requestSubTab === 'sent' ? "text-primary" : "text-on-surface-variant opacity-40 hover:opacity-100"
                                    )}
                                >
                                    {t('friends_page.sent_requests')}
                                    {requestSubTab === 'sent' && <motion.div layoutId="subtab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                                </button>
                            </div>

                            <div className="space-y-3">
                                {requestSubTab === 'incoming' ? (
                                    requests.length === 0 ? (
                                        <div className="py-20 text-center liquid-glass rounded-[3rem] border border-dashed border-white/20 shadow-inner">
                                            <AlertCircle size={48} className="mx-auto text-primary/30 mb-4 drop-shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]" />
                                            <p className="text-on-surface-variant font-black uppercase tracking-[0.2em] text-xs opacity-50">
                                                {t('friends_page.no_requests')}
                                            </p>
                                        </div>
                                    ) : (
                                        requests.map((req) => (
                                            <motion.div
                                                key={req.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="liquid-glass p-5 rounded-[2rem] border border-white/10 shadow-lg hover:border-primary/30 hover:shadow-[0_0_25px_rgba(var(--primary-rgb),0.15)] flex items-center justify-between group transition-all duration-500 hover:scale-[1.02]"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <Avatar src={req.sender?.avatar_url} alt={req.sender?.username} size="sm" className="ring-2 ring-primary/20 shadow-lg" />
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="text-sm font-black text-on-surface flex items-center gap-2 truncate">
                                                            <span className="truncate">{(req.sender?.full_name || req.sender?.username) || 'Unknown User'}</span>
                                                            {req.sender && <UserBadge username={req.sender.username} isVerified={req.sender.is_verified} className="shrink-0" />}
                                                        </h3>
                                                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest opacity-80 truncate">
                                                            @{req.sender?.username}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => acceptRequest(req.id)}
                                                        className="p-3 md:p-3.5 bg-primary/20 text-primary border border-primary/30 hover:bg-primary hover:text-white rounded-[1.25rem] transition-all duration-300 active:scale-90 shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)] hover:shadow-[0_0_25px_rgba(var(--primary-rgb),0.4)]"
                                                        title={t('common.accept')}
                                                    >
                                                        <Check size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => rejectRequest(req.id)}
                                                        className="p-3 md:p-3.5 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white rounded-[1.25rem] transition-all duration-300 active:scale-90 hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                                                        title={t('common.reject')}
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))
                                    )
                                ) : (
                                    sentRequests.length === 0 ? (
                                        <div className="py-20 text-center liquid-glass rounded-[3rem] border border-dashed border-white/20 shadow-inner">
                                            <Search size={48} className="mx-auto text-primary/30 mb-4 drop-shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]" />
                                            <p className="text-on-surface-variant font-black uppercase tracking-[0.2em] text-xs opacity-50">
                                                {t('friends_page.no_sent_requests')}
                                            </p>
                                        </div>
                                    ) : (
                                        sentRequests.map((req) => (
                                            <motion.div
                                                key={req.id}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="liquid-glass p-5 rounded-[2rem] border border-white/10 shadow-lg hover:border-white/20 flex items-center justify-between group transition-all duration-500 hover:scale-[1.02]"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <Avatar src={req.receiver?.avatar_url} alt={req.receiver?.username} size="sm" className="ring-2 ring-primary/20 shadow-lg" />
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="text-sm font-black text-on-surface flex items-center gap-2 truncate">
                                                            <span className="truncate">{(req.receiver?.full_name || req.receiver?.username) || 'Unknown User'}</span>
                                                            {req.receiver && <UserBadge username={req.receiver.username} isVerified={req.receiver.is_verified} className="shrink-0" />}
                                                        </h3>
                                                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest opacity-80 truncate">
                                                            @{req.receiver?.username}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleCancelRequest(req.id, req.receiver?.username || '')}
                                                    disabled={actionLoading === req.receiver?.username}
                                                    className="px-5 py-2.5 bg-red-500/10 text-red-500 text-[10px] sm:text-xs font-black uppercase tracking-[0.15em] border border-red-500/20 rounded-[1.25rem] hover:bg-red-500 hover:text-white hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all duration-300 active:scale-95 disabled:opacity-50"
                                                >
                                                    {actionLoading === req.receiver?.username ? (
                                                        <Loader2 size={16} className="animate-spin mx-auto" />
                                                    ) : (
                                                        t('common.cancel')
                                                    )}
                                                </button>
                                            </motion.div>
                                        ))
                                    )
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <FriendsSidebar />
        </motion.div>
    );
};
