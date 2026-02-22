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
        <motion.div
            className="w-full flex gap-8"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 28, mass: 0.9 }}
        >
            <div className="flex-1">
                <div className="flex flex-col lg:flex-row items-center gap-4 mb-6 lg:mb-0">
                    {/* Mobile Brand Bubble & Notification Toggle in a row */}
                    <div className="flex lg:hidden items-center gap-4 w-full">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onLogoClick}
                            className="relative z-10 w-14 h-14 rounded-[1.5rem] liquid-glass p-3 flex items-center justify-center shadow-2xl cursor-pointer border-white/20 active:scale-90 transition-all duration-300"
                        >
                            <motion.div
                                animate={{
                                    y: [0, -4, 0],
                                    rotate: [0, 10, -10, 0],
                                    scale: [1, 1.1, 1]
                                }}
                                transition={{
                                    duration: 6,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                                className="w-full h-full rounded-xl bg-gradient-to-br from-primary/30 to-tertiary/30 flex items-center justify-center shadow-lg shadow-primary/10 border border-white/10"
                            >
                                <img src="/logo.png" alt="Logo" className="w-7 h-7 object-contain" />
                            </motion.div>
                        </motion.div>

                        <div className="flex-1" />

                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.1, rotate: -5 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate('/notifications')}
                            className="relative w-14 h-14 rounded-[1.5rem] liquid-glass p-3 flex items-center justify-center shadow-2xl cursor-pointer text-on-surface border-white/20 active:scale-90 transition-all duration-300"
                        >
                            <Bell className="w-7 h-7" />
                            {unreadCount > 0 && (
                                <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-[11px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-lg shadow-red-500/40"
                                >
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </motion.span>
                            )}
                        </motion.button>
                    </div>
                </div>
                <div className="max-w-4xl mx-auto w-full">
                    <Feed />
                </div>
            </div>

            <UserListPanel />
        </motion.div>
    );
};
