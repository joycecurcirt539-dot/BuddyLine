import { useState } from 'react';
import { useFriends } from '../hooks/useFriends';
import { usePresence } from '../hooks/usePresence';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../hooks/useChat';
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
    const [searchResults, setSearchResults] = useState<any[]>([]);
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
        <div className="max-w-none flex gap-8 pb-20 px-4 sm:px-0">
            <div className="flex-1 min-w-0 space-y-6">
                {/* Dual Search Header */}
                <div className="bubble p-4 sm:p-6 lg:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-on-surface tracking-tight leading-none mb-1 sm:mb-2">
                                {t('common.friends')}
                            </h1>
                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] opacity-80">
                                {t('friends_page.active_friends', { count: friends.length })}
                            </p>
                        </div>

                        <div className="flex bg-surface-container rounded-2xl p-1 border border-outline-variant/5 self-start sm:self-auto w-full sm:w-auto">
                            <button
                                onClick={() => setActiveTab('friends')}
                                className={clsx(
                                    "flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all text-center",
                                    activeTab === 'friends'
                                        ? "bg-primary text-on-primary shadow-lg shadow-primary/20"
                                        : "text-on-surface-variant hover:text-on-surface"
                                )}
                            >
                                {t('friends_page.tabs.buds', 'Buds')}
                            </button>
                            <button
                                onClick={() => setActiveTab('requests')}
                                className={clsx(
                                    "flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all relative text-center",
                                    activeTab === 'requests'
                                        ? "bg-primary text-on-primary shadow-lg shadow-primary/20"
                                        : "text-on-surface-variant hover:text-on-surface"
                                )}
                            >
                                {t('friends_page.tabs.invites', 'Invites')}
                                {requests.length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-tertiary text-on-tertiary rounded-full text-[9px] sm:text-[10px] flex items-center justify-center border-2 border-surface animate-bounce">
                                        {requests.length}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleSearch} className="relative max-w-3xl mx-auto">
                        <div className="flex flex-col sm:flex-row items-stretch gap-3">
                            <div className="flex-1 relative group">
                                <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                                    {searchType === 'username' ? (
                                        <AtSign size={20} className="text-primary transition-transform group-focus-within:scale-110" />
                                    ) : (
                                        <UserIcon size={20} className="text-primary transition-transform group-focus-within:scale-110" />
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
                                    className="w-full h-[64px] pl-14 pr-6 bg-surface-container-high rounded-[28px] border border-outline-variant/10 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold text-on-surface text-base placeholder:opacity-40"
                                />
                            </div>

                            <div className="flex gap-2 h-[64px]">
                                {/* Custom Search Type Selector */}
                                <div className="relative h-full">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const nextType = searchType === 'username' ? 'name' : 'username';
                                            setSearchType(nextType);
                                            setSearchQuery('');
                                        }}
                                        className="h-full px-6 bg-surface-container-high rounded-[28px] border border-outline-variant/10 flex items-center gap-3 hover:bg-surface-container transition-all active:scale-95 group"
                                    >
                                        <span className="font-black text-[10px] uppercase tracking-[0.15em] text-primary whitespace-nowrap">
                                            {searchType === 'username' ? t('friends_page.type_username') : t('friends_page.type_name')}
                                        </span>
                                        <div className="w-5 h-5 flex items-center justify-center bg-primary/10 text-primary rounded-full group-hover:bg-primary group-hover:text-on-primary transition-colors">
                                            <motion.div
                                                animate={{ rotate: searchType === 'username' ? 0 : 180 }}
                                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                            >
                                                <AtSign size={10} />
                                            </motion.div>
                                        </div>
                                    </button>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={!searchQuery.trim() || isSearching}
                                    className="h-full px-10 rounded-[28px] flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-sm font-black uppercase tracking-widest"
                                >
                                    {isSearching ? <Loader2 className="animate-spin" size={22} /> : <Search size={22} />}
                                    <span className="hidden md:inline">{t('common.search')}</span>
                                </Button>
                            </div>
                        </div>
                    </form>
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
                <motion.div
                    layout
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
                                        className="bubble p-5 flex items-center justify-between hover:bg-surface-container-high/60 group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <Avatar
                                                src={friend.avatar_url}
                                                alt={friend.username}
                                                size="md"
                                                status={onlineUsers.has(friend.id) ? 'online' : 'offline'}
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
                                            onClick={() => handleChat(friend.id)}
                                            className="p-3 bg-primary/10 text-primary hover:bg-primary hover:text-on-primary rounded-xl transition-all active:scale-90"
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
                                        <div className="py-20 text-center bg-surface-container-low/40 rounded-[40px] border border-dashed border-outline-variant/20">
                                            <AlertCircle size={48} className="mx-auto text-primary/20 mb-4" />
                                            <p className="text-on-surface-variant font-bold uppercase tracking-widest text-xs opacity-40">
                                                {t('friends_page.no_requests')}
                                            </p>
                                        </div>
                                    ) : (
                                        requests.map((req) => (
                                            <motion.div
                                                key={req.id}
                                                layout
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="p-4 bg-surface-container-low/80 rounded-[24px] border border-outline-variant/10 flex items-center justify-between"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <Avatar src={req.sender?.avatar_url} alt={req.sender?.username} size="sm" />
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
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => acceptRequest(req.id)}
                                                        className="p-3 bg-primary text-on-primary rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                                                        title={t('common.accept')}
                                                    >
                                                        <Check size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => rejectRequest(req.id)}
                                                        className="p-3 bg-view-container text-on-surface rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-95"
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
                                        <div className="py-20 text-center bg-surface-container-low/40 rounded-[40px] border border-dashed border-outline-variant/20">
                                            <Search size={48} className="mx-auto text-primary/20 mb-4" />
                                            <p className="text-on-surface-variant font-bold uppercase tracking-widest text-xs opacity-40">
                                                {t('friends_page.no_sent_requests', 'No pending requests')}
                                            </p>
                                        </div>
                                    ) : (
                                        sentRequests.map((req) => (
                                            <motion.div
                                                key={req.id}
                                                layout
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="p-4 bg-surface-container-low/80 rounded-[24px] border border-outline-variant/10 flex items-center justify-between"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <Avatar src={req.receiver?.avatar_url} alt={req.receiver?.username} size="sm" />
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
                                                    className="px-4 py-2 bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                                                >
                                                    {actionLoading === req.receiver?.username ? (
                                                        <Loader2 size={14} className="animate-spin" />
                                                    ) : (
                                                        t('common.cancel', 'Cancel')
                                                    )}
                                                </button>
                                            </motion.div>
                                        ))
                                    )
                                )}
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>

            <FriendsSidebar />
        </div>
    );
};
