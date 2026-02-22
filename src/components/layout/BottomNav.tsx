import { Link, useLocation } from 'react-router-dom';
import { Home, Users, MessageSquare, User, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_COLORS: Record<string, string> = {
    '/': '#6366F1',
    '/friends': '#10B981',
    '/chat': '#F59E0B',
    '/profile': '#8B5CF6',
    '/settings': '#64748B',
};

export const BottomNav = () => {
    const { t } = useTranslation();
    const location = useLocation();

    const links = [
        { href: '/', label: t('common.home'), icon: Home },
        { href: '/friends', label: t('common.friends'), icon: Users },
        { href: '/chat', label: t('common.messages'), icon: MessageSquare },
        { href: '/profile', label: t('common.profile'), icon: User },
        { href: '/settings', label: t('common.settings'), icon: Settings },
    ];

    const isChatOpen = location.pathname.startsWith('/chat') && new URLSearchParams(location.search).get('id');

    if (isChatOpen) return null;

    return (
        <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-[420px] lg:hidden">
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.1 }}
                className="relative flex items-center justify-around px-2 py-2 rounded-[2rem] border border-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.1)] backdrop-blur-md"
            >
                {/* Sliding shimmer background for active tab */}
                {links.map((link) => {
                    const isActive = location.pathname === link.href;
                    const color = NAV_COLORS[link.href] ?? '#6366F1';
                    if (!isActive) return null;
                    return (
                        <motion.div
                            key={`shimmer-${link.href}`}
                            layoutId="bottom-nav-shimmer"
                            className="absolute rounded-full pointer-events-none"
                            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                            style={{
                                width: '56px',
                                height: '56px',
                                background: `radial-gradient(circle, ${color}40, ${color}15)`,
                                boxShadow: `0 0 24px 8px ${color}30`,
                                left: `${links.findIndex(l => l.href === link.href) * (100 / links.length)}%`,
                                transform: 'translateX(-50%)',
                                marginLeft: `${(100 / links.length) / 2}%`,
                            }}
                        />
                    );
                })}

                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = location.pathname === link.href;
                    const color = NAV_COLORS[link.href] ?? '#6366F1';

                    return (
                        <Link
                            key={link.href}
                            to={link.href}
                            className="flex flex-col items-center justify-center flex-1 relative z-10"
                        >
                            <motion.div
                                animate={isActive ? { y: -6, scale: 1.1 } : { y: 0, scale: 1 }}
                                whileTap={{ scale: 0.85, y: 0 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                                className="flex flex-col items-center gap-1"
                            >
                                <div
                                    className="w-11 h-11 flex items-center justify-center rounded-full transition-all duration-300"
                                    style={{
                                        background: isActive ? `${color}22` : 'transparent',
                                    }}
                                >
                                    <Icon
                                        size={22}
                                        strokeWidth={isActive ? 2.5 : 1.8}
                                        style={{
                                            color: isActive ? color : 'rgba(148,163,184,0.7)',
                                            filter: isActive ? `drop-shadow(0 0 6px ${color}90)` : 'none',
                                            transition: 'all 0.3s ease',
                                        }}
                                    />
                                </div>

                                <AnimatePresence>
                                    {isActive && (
                                        <motion.span
                                            initial={{ opacity: 0, y: 4, scale: 0.8 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 4, scale: 0.8 }}
                                            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                            className="text-[8px] font-black uppercase tracking-[0.2em] leading-none"
                                            style={{ color }}
                                        >
                                            {link.label}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        </Link>
                    );
                })}
            </motion.div>
        </nav>
    );
};
