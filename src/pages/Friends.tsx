import { useState } from 'react';
import { useFriends } from '../hooks/useFriends';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { UserPlus, Check, X, Search, Users, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../hooks/useChat';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';

export const Friends = () => {
    const { t } = useTranslation();
    const { friends, requests, loading, sendRequest, acceptRequest, rejectRequest, refresh } = useFriends();
    const [searchUsername, setSearchUsername] = useState('');
    const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const navigate = useNavigate();
    const { createDirectChat } = useChat();

    const handleSendRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchUsername.trim()) return;

        setActionLoading('send');
        const result = await sendRequest(searchUsername);
        setActionLoading(null);

        if (result.error) {
            alert(result.error);
        } else {
            alert(t('friends_page.request_sent'));
            setSearchUsername('');
            refresh();
        }
    };

    const handleAccept = async (id: string) => {
        setActionLoading(id);
        await acceptRequest(id);
        setActionLoading(null);
    };

    const handleReject = async (id: string) => {
        setActionLoading(id);
        await rejectRequest(id);
        setActionLoading(null);
    };

    const handleStartChat = async (friendId: string) => {
        setActionLoading(friendId);
        const result = await createDirectChat(friendId);
        setActionLoading(null);
        if (result.success) {
            navigate(`/chat?id=${result.chatId}`);
        } else if (result.error) {
            alert(result.error);
        }
    };

    if (loading) return (
        <div className="p-20 text-center flex flex-col items-center animate-pulse">
            <div className="w-16 h-16 surface-1 rounded-full mb-4"></div>
            <div className="w-48 h-5 surface-1 rounded-xl"></div>
        </div>
    );

    return (
        <div className="w-full space-y-4">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ willChange: "transform, opacity" }}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
                <h1 className="text-lg lg:text-xl font-black text-on-surface uppercase tracking-tight">{t('friends_page.title')}</h1>
                <div className="flex w-full sm:w-auto bg-surface-container-high/50 backdrop-blur-2xl rounded-[16px] p-1 border border-outline-variant/20 shadow-md">
                    <button
                        onClick={() => setActiveTab('friends')}
                        className={clsx(
                            "flex-1 px-4 py-1.5 rounded-[12px] text-[10px] font-black transition-all uppercase tracking-widest",
                            activeTab === 'friends'
                                ? "bg-primary text-on-primary shadow-sm"
                                : "text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
                        )}
                    >
                        {t('friends_page.tabs.buds')} ({friends.length})
                    </button>
                    <div className="w-[1px] h-4 bg-outline-variant/20 self-center mx-1" />
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={clsx(
                            "flex-1 px-4 py-1.5 rounded-[12px] text-[10px] font-black transition-all uppercase tracking-widest",
                            activeTab === 'requests'
                                ? "bg-primary text-on-primary shadow-sm"
                                : "text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
                        )}
                    >
                        {t('friends_page.tabs.invites')} ({requests.length})
                    </button>
                </div>
            </motion.div>

            {activeTab === 'friends' && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.99 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{ willChange: "transform, opacity" }}
                    className="bg-surface-container-low rounded-[24px] shadow-lg shadow-primary/5 border border-outline-variant/10 overflow-hidden glass"
                >
                    <div className="px-5 py-3 border-b border-outline-variant/10 bg-surface-container/30">
                        <h2 className="text-base font-black text-on-surface uppercase tracking-[0.2em] italic">{t('friends_page.expand.title')}</h2>
                    </div>
                    <div className="p-3">
                        <form onSubmit={handleSendRequest} className="flex flex-col sm:flex-row gap-2">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-4 top-2.5 text-on-surface-variant/40 group-focus-within:text-primary transition-colors" size={16} />
                                <input
                                    type="text"
                                    placeholder={t('friends_page.expand.placeholder')}
                                    value={searchUsername}
                                    onChange={(e) => setSearchUsername(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-surface-container rounded-xl border border-outline-variant/20 focus:ring-2 focus:ring-primary/10 focus:border-primary focus:bg-surface-container-lowest outline-none transition-all text-on-surface font-bold text-sm placeholder:text-on-surface-variant/30"
                                />
                            </div>
                            <Button type="submit" loading={actionLoading === 'send'} disabled={!searchUsername} className="px-4 py-2 rounded-xl shadow-md text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">
                                <UserPlus size={16} className="mr-2" />
                                {t('friends_page.expand.invoke')}
                            </Button>
                        </form>
                    </div>
                </motion.div>
            )}

            <div className="grid gap-4">
                <AnimatePresence mode="popLayout">
                    {activeTab === 'friends' ? (
                        friends.length === 0 ? (
                            <motion.div
                                key="empty-friends"
                                initial={{ opacity: 0, scale: 0.99 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.99 }}
                                style={{ willChange: "transform, opacity" }}
                                className="text-center py-20 bg-surface/50 backdrop-blur-sm rounded-3xl border-2 border-dashed border-outline-variant/20"
                            >
                                <div className="mx-auto w-20 h-20 bg-surface-container-low rounded-full flex items-center justify-center mb-6">
                                    <Users className="text-on-surface-variant/50" size={32} />
                                </div>
                                <h3 className="text-xl font-black text-on-surface mb-1">{t('friends_page.empty.title')}</h3>
                                <p className="text-on-surface-variant font-medium">{t('friends_page.empty.desc')}</p>
                            </motion.div>
                        ) : (
                            friends.map((friend, index) => (
                                <motion.div
                                    key={friend.id}
                                    initial={{ opacity: 0, x: -5 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 5 }}
                                    transition={{
                                        delay: Math.min(index * 0.02, 0.2),
                                        duration: 0.2
                                    }}
                                    style={{ willChange: "transform, opacity" }}
                                    className="bg-surface-container-low p-6 rounded-[32px] shadow-sm border border-outline-variant/10 flex items-center justify-between hover:shadow-xl hover:bg-surface-container transition-all group"
                                >
                                    <div className="flex items-center gap-5">
                                        <Avatar src={friend.avatar_url} alt={friend.username} status={friend.status} size="md" className="ring-4 ring-surface shadow-xl group-hover:ring-primary transition-all duration-500 group-hover:scale-110" />
                                        <div>
                                            <h3 className="font-black text-on-surface text-base tracking-tight group-hover:text-primary transition-colors uppercase italic">{friend.full_name || friend.username}</h3>
                                            <p className="text-[10px] text-primary font-black uppercase tracking-widest opacity-80">@{friend.username}</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="secondary"
                                        size="md"
                                        loading={actionLoading === friend.id}
                                        onClick={() => handleStartChat(friend.id)}
                                        className="rounded-2xl font-black uppercase tracking-[0.1em] text-xs px-8 py-3 shadow-md border-outline-variant/20 hover:scale-105 active:scale-95 transition-all bg-surface-container-high text-on-surface-variant"
                                    >
                                        <MessageCircle size={18} className="mr-2" />
                                        {t('friends_page.actions.direct_chat')}
                                    </Button>
                                </motion.div>
                            ))
                        )
                    ) : (
                        requests.length === 0 ? (
                            <motion.div
                                key="empty-requests"
                                initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                                exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                                className="text-center py-20 bg-surface/50 backdrop-blur-sm rounded-3xl border-2 border-dashed border-outline/20"
                            >
                                <p className="text-on-surface-variant font-bold uppercase tracking-widest text-sm">{t('friends_page.no_requests')}</p>
                            </motion.div>
                        ) : (
                            requests.map((req, index) => (
                                <motion.div
                                    key={req.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="bg-surface/80 backdrop-blur-md p-5 rounded-3xl shadow-lg border border-outline/10 flex flex-col sm:flex-row items-center justify-between gap-4"
                                >
                                    <div className="flex items-center gap-4">
                                        <Avatar src={req.sender.avatar_url} alt={req.sender.username} size="md" />
                                        <div>
                                            <h3 className="text-sm font-black text-on-surface uppercase tracking-tight">{req.sender.full_name || req.sender.username}</h3>
                                            <p className="text-[10px] text-on-surface-variant font-medium">@{req.sender.username} {t('friends_page.actions.knocking')}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        <Button
                                            size="md"
                                            onClick={() => handleAccept(req.id)}
                                            loading={actionLoading === req.id}
                                            className="flex-1 sm:flex-initial shadow-lg shadow-primary/20"
                                        >
                                            <Check size={18} className="mr-2" /> {t('friends_page.actions.admit')}
                                        </Button>
                                        <Button
                                            variant="danger"
                                            size="md"
                                            onClick={() => handleReject(req.id)}
                                            loading={actionLoading === req.id}
                                            className="flex-1 sm:flex-initial"
                                        >
                                            <X size={18} className="mr-2" /> {t('friends_page.actions.deny')}
                                        </Button>
                                    </div>
                                </motion.div>
                            ))
                        )
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
