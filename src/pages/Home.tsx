import { Feed } from '../components/feed/Feed';
import { UserListPanel } from '../components/discover/UserListPanel';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
import { notificationService } from '../services/notificationService';

interface LayoutContext {
    onLogoClick: () => void;
}

export const Home = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { onLogoClick } = useOutletContext<LayoutContext>();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const fetchUnreadCount = async () => {
            try {
                const notifications = await notificationService.getNotifications();
                setUnreadCount(notifications.filter(n => !n.is_read).length);
            } catch (error) {
                console.error('Failed to fetch unread count:', error);
            }
        };

        fetchUnreadCount();

        const subscription = notificationService.subscribeToNotifications(() => {
            fetchUnreadCount();
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return (
        <div className="w-full flex gap-8">
            <div className="flex-1">
                <div className="mb-6 flex items-center gap-4">
                    {/* Mobile Brand Bubble */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onLogoClick}
                        className="lg:hidden relative z-10 w-12 h-12 rounded-2xl bg-surface-container-high/60 backdrop-blur-xl border border-outline/10 p-2.5 flex items-center justify-center shadow-2xl cursor-pointer"
                    >
                        <motion.div
                            animate={{
                                y: [0, -2, 0],
                                rotate: [0, 5, -5, 0]
                            }}
                            transition={{
                                duration: 5,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            className="w-full h-full rounded-xl bg-primary/20 flex items-center justify-center shadow-lg shadow-primary/10"
                        >
                            <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain" />
                        </motion.div>
                    </motion.div>

                    <div className="flex flex-col flex-1">
                        <h1 className="text-2xl lg:text-3xl page-title-highlight leading-tight">{t('common.home')}</h1>
                        <p className="text-on-surface-variant font-medium text-sm lg:text-base">{t('home.feed_subtitle')}</p>
                    </div>

                    {/* Mobile Notification entry */}
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate('/notifications')}
                        className="lg:hidden relative w-12 h-12 rounded-2xl bg-surface-container-high/60 backdrop-blur-xl border border-outline/10 p-2.5 flex items-center justify-center shadow-2xl cursor-pointer text-on-surface"
                    >
                        <Bell className="w-6 h-6" />
                        {unreadCount > 0 && (
                            <span className="absolute top-2 right-2 w-5 h-5 bg-primary text-on-primary text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-surface shadow-sm">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </motion.button>
                </div>
                <Feed />
            </div>

            <UserListPanel />
        </div>
    );
};
