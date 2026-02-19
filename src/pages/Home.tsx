import { Feed } from '../components/feed/Feed';
import { UserListPanel } from '../components/discover/UserListPanel';
import { motion } from 'framer-motion';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
import { notificationService } from '../services/notificationService';

interface LayoutContext {
    onLogoClick: () => void;
}

export const Home = () => {
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
                <div className="flex flex-col lg:flex-row items-center gap-4 mb-6 lg:mb-0">
                    {/* Mobile Brand Bubble & Notification Toggle in a row */}
                    <div className="flex lg:hidden items-center gap-4 w-full">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onLogoClick}
                            className="relative z-10 w-12 h-12 rounded-2xl bg-surface-container-high/60 backdrop-blur-xl border border-outline/10 p-2.5 flex items-center justify-center shadow-2xl cursor-pointer"
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

                        <div className="flex-1" />

                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate('/notifications')}
                            className="relative w-12 h-12 rounded-2xl bg-surface-container-high/60 backdrop-blur-xl border border-outline/10 p-2.5 flex items-center justify-center shadow-2xl cursor-pointer text-on-surface"
                        >
                            <Bell className="w-6 h-6" />
                            {unreadCount > 0 && (
                                <span className="absolute top-2 right-2 w-5 h-5 bg-primary text-on-primary text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-surface shadow-sm">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </motion.button>
                    </div>
                </div>
                <div className="max-w-3xl mx-auto w-full">
                    <Feed />
                </div>
            </div>

            <UserListPanel />
        </div>
    );
};
