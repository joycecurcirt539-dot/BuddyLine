import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell,
    UserPlus,
    MessageSquare,
    Heart,
    MessageCircle,
    Share2,
    Check,
    X,
    Reply,
    CheckCheck,
    Loader2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../components/ui/Avatar';
import { clsx } from 'clsx';
import { notificationService, type Notification } from '../services/notificationService';
import { supabase } from '../lib/supabase';

export const Notifications = () => {
    const { t } = useTranslation();
    const [filter, setFilter] = useState<'all' | 'requests' | 'messages' | 'activity'>('all');
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [autoMarked, setAutoMarked] = useState(false);

    useEffect(() => {
        fetchNotifications();

        // Subscribe to real-time updates
        const subscription = notificationService.subscribeToNotifications((payload) => {
            if (payload.new) {
                fetchNotifications(); // Simple refresh for now
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const fetchNotifications = async () => {
        try {
            const data = await notificationService.getNotifications();

            // Enrich notifications with actor profile (username/full_name/avatar)
            const actorIds = Array.from(
                new Set(
                    data
                        .map(n => n.actor_id)
                        .filter((id): id is string => Boolean(id))
                )
            );

            let profilesMap: Record<string, { username: string; full_name: string; avatar_url: string }> = {};

            if (actorIds.length > 0) {
                const { data: profiles, error: profilesError } = await supabase
                    .from('profiles')
                    .select('id, username, full_name, avatar_url')
                    .in('id', actorIds);

                if (!profilesError && profiles) {
                    profilesMap = profiles.reduce((acc, p) => {
                        acc[p.id] = {
                            username: p.username,
                            full_name: p.full_name,
                            avatar_url: p.avatar_url
                        };
                            return acc;
                    }, {} as Record<string, { username: string; full_name: string; avatar_url: string }>);
                }
            }

            const withActors: Notification[] = data.map(n => ({
                ...n,
                actor: n.actor_id && profilesMap[n.actor_id]
                    ? profilesMap[n.actor_id]
                    : n.actor
            }));

            setNotifications(withActors);

            // Auto-mark all as read when opening the notifications page
            if (!autoMarked && withActors.some(n => !n.is_read)) {
                try {
                    await notificationService.markAllAsRead();
                    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                    setAutoMarked(true);
                } catch (err) {
                    console.error('Failed to auto-mark notifications as read:', err);
                }
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredNotifications = notifications.filter(n => {
        if (filter === 'all') return true;
        if (filter === 'requests') return ['friend_request', 'friend_accept'].includes(n.type);
        if (filter === 'messages') return ['message_received', 'message_forwarded', 'message_reply'].includes(n.type);
        if (filter === 'activity') return ['post_like', 'post_comment', 'comment_reply'].includes(n.type);
        return true;
    });

    const markAsRead = async (id: string) => {
        try {
            await notificationService.markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const markAllRead = async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const deleteNotification = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await notificationService.deleteNotification(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (error) {
            console.error('Failed to delete notification:', error);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'friend_request':
            case 'friend_accept':
                return <UserPlus className="text-primary" size={20} />;
            case 'message_received':
            case 'message_reply':
                return <MessageSquare className="text-blue-500" size={20} />;
            case 'message_forwarded':
                return <Share2 className="text-purple-500" size={20} />;
            case 'post_like':
                return <Heart className="text-pink-500" size={20} />;
            case 'post_comment':
            case 'comment_reply':
                return <MessageCircle className="text-green-500" size={20} />;
            default:
                return <Bell className="text-on-surface" size={20} />;
        }
    };

    const getRelativeTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return t('chat.status.just_now');
        if (diffInSeconds < 3600) return t('chat.status.minutes_ago', { count: Math.floor(diffInSeconds / 60) });
        if (diffInSeconds < 86400) return t('chat.status.hours_ago', { count: Math.floor(diffInSeconds / 3600) });
        return date.toLocaleDateString();
    };

    return (
        <div className="w-full max-w-2xl mx-auto pb-20 lg:pb-0">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl lg:text-3xl page-title-highlight leading-tight flex items-center gap-3">
                        {t('notifications.title')}
                        <span className="text-sm font-bold bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
                            {notifications.filter(n => !n.is_read).length}
                        </span>
                    </h1>
                </div>
                {notifications.some(n => !n.is_read) && (
                    <button
                        onClick={markAllRead}
                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5"
                    >
                        <CheckCheck size={14} />
                        {t('notifications.mark_all_read')}
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                {[
                    { id: 'all', label: t('notifications.all') },
                    { id: 'requests', label: t('notifications.requests') },
                    { id: 'messages', label: t('notifications.messages') },
                    { id: 'activity', label: t('notifications.activity') }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setFilter(tab.id as any)}
                        className={clsx(
                            "px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap",
                            filter === tab.id
                                ? "bg-primary text-on-primary shadow-lg shadow-primary/20"
                                : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Notifications List */}
            <div className="flex flex-col gap-3">
                <AnimatePresence mode="popLayout">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 size={32} className="animate-spin text-primary opacity-50" />
                        </div>
                    ) : filteredNotifications.length > 0 ? (
                        filteredNotifications.map((notification) => (
                            <motion.div
                                key={notification.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                onClick={() => !notification.is_read && markAsRead(notification.id)}
                                className={clsx(
                                    "group relative p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md",
                                    notification.is_read
                                        ? "bg-surface border-outline/5"
                                        : "bg-surface-container-high/30 border-primary/20 shadow-sm"
                                )}
                            >
                                <div className="flex gap-4">
                                    <div className="relative shrink-0">
                                        <Avatar
                                            src={notification.actor?.avatar_url || ''}
                                            alt={notification.actor?.full_name || ''}
                                            size="md"
                                        />
                                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-surface shadow-sm flex items-center justify-center border border-outline/10">
                                            {getIcon(notification.type)}
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start gap-2">
                                            <p className="text-sm text-on-surface leading-snug">
                                                <span className="font-bold hover:underline">
                                                    {notification.actor?.full_name || notification.actor?.username || 'User'}
                                                </span>
                                                {' '}
                                                <span className="text-on-surface-variant">
                                                    {t(`notifications.${notification.type}`)}
                                                </span>
                                            </p>
                                            <span className="text-xs text-on-surface-variant/60 font-medium whitespace-nowrap">
                                                {getRelativeTime(notification.created_at)}
                                            </span>
                                        </div>

                                        {notification.content && (
                                            <p className="text-sm text-on-surface-variant mt-1 line-clamp-2 italic">
                                                "{notification.content}"
                                            </p>
                                        )}

                                        {notification.target_preview && (
                                            <div className="mt-2 p-2 rounded-lg bg-surface-container/50 border border-outline/5 text-xs text-on-surface-variant/80 italic truncate">
                                                <Reply size={12} className="inline mr-1 opacity-70" />
                                                {notification.target_preview}
                                            </div>
                                        )}

                                        {/* Actions for Friend Request */}
                                        {notification.type === 'friend_request' && !notification.is_read && (
                                            <div className="flex gap-2 mt-3">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        markAsRead(notification.id);
                                                    }}
                                                    className="flex-1 bg-primary text-on-primary py-1.5 rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all text-center flex items-center justify-center gap-2"
                                                >
                                                    <Check size={16} /> {t('notifications.accept')}
                                                </button>
                                                <button
                                                    onClick={(e) => deleteNotification(notification.id, e)}
                                                    className="flex-1 bg-surface-container-highest text-on-surface hover:bg-surface-container-highest/80 py-1.5 rounded-lg text-sm font-bold transition-all text-center flex items-center justify-center gap-2"
                                                >
                                                    <X size={16} /> {t('notifications.decline')}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {!notification.is_read && (
                                    <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary animate-pulse" />
                                )}
                            </motion.div>
                        ))
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center py-12 text-on-surface-variant/50"
                        >
                            <Bell size={48} className="mb-4 opacity-20" />
                            <p className="text-sm font-medium">{t('notifications.empty')}</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
