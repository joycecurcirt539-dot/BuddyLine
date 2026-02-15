import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Home, Users, MessageSquare, User, Settings as SettingsIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { Avatar } from '../ui/Avatar';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { BotBadge } from '../ui/BotBadge';

export const Sidebar = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const location = useLocation();

    const links = [
        { href: '/', label: t('common.home'), icon: Home },
        { href: '/friends', label: t('common.friends'), icon: Users },
        { href: '/chat', label: t('common.messages'), icon: MessageSquare },
        { href: '/profile', label: t('common.profile'), icon: User },
        { href: '/settings', label: t('common.settings'), icon: SettingsIcon },
    ];

    return (
        <aside className="hidden lg:flex w-72 h-screen flex-col bg-surface border-r border-outline-variant/10 fixed top-0 left-0 z-40 transition-all duration-300 px-4 py-6 glass">
            {/* Logo Section */}
            <div className="flex items-center gap-4 px-3 mb-10 group cursor-pointer">
                <div className="w-12 h-12 rounded-2xl logo-container-highlight flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                    <img src="/logo.svg" alt="Logo" className="w-7 h-7 brightness-0 dark:invert transition-all" />
                </div>
                <div className="flex flex-col">
                    <span className="text-2xl branding-text-highlight uppercase italic">
                        BuddyLine
                    </span>
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] -mt-1 opacity-80">
                        {t('sidebar.private_circle')}
                    </span>
                </div>
            </div>

            <nav className="flex-1 space-y-2">
                {links.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            to={item.href}
                            className={clsx(
                                "relative flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group overflow-hidden",
                                isActive
                                    ? "bg-primary/10 text-on-surface shadow-sm"
                                    : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                            )}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="active-nav"
                                    className="absolute left-0 w-1.5 h-6 bg-primary rounded-full"
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                            <item.icon
                                size={22}
                                className={clsx(
                                    "transition-transform duration-300",
                                    isActive ? "text-primary scale-110" : "group-hover:scale-110"
                                )}
                            />
                            <span className={clsx(
                                "font-bold tracking-tight transition-colors",
                                isActive ? "opacity-100" : "opacity-70 group-hover:opacity-100"
                            )}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </nav>

            {/* User Profile / Logout */}
            <div className="mt-auto space-y-2">
                <div className="p-2 rounded-2xl bg-surface-variant/10 flex items-center gap-3 transition-colors hover:bg-surface-variant/20 cursor-pointer">
                    <Avatar
                        src={user?.user_metadata?.avatar_url}
                        alt={user?.email}
                        size="sm"
                    />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-on-surface truncate flex items-center gap-1.5">
                            {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                            <BotBadge username={user?.user_metadata?.username || user?.email?.split('@')[0]} />
                        </p>
                        <p className="text-[9px] text-on-surface-variant truncate">
                            {user?.email}
                        </p>
                    </div>
                </div>
            </div>
        </aside >
    );
};
