import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Home, Users, MessageSquare, User, Settings as SettingsIcon, LogOut } from 'lucide-react';
import { clsx } from 'clsx';
import { Avatar } from '../ui/Avatar';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { UserBadge } from '../ui/UserBadge';
import { useProfile } from '../../hooks/useProfile';

export const Sidebar = () => {
    const { t } = useTranslation();
    const { user, signOut } = useAuth();
    const { profile } = useProfile();
    const location = useLocation();

    // Helper to get display data
    const displayAvatar = profile?.avatar_url || user?.user_metadata?.avatar_url;
    const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0];
    const displayUsername = profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0];
    const isVerified = profile?.is_verified || user?.user_metadata?.is_verified;

    const navGroups = [
        {
            items: [
                { href: '/', label: t('common.home'), icon: Home },
                { href: '/friends', label: t('common.friends'), icon: Users },
                { href: '/chat', label: t('common.messages'), icon: MessageSquare },
            ]
        },
        {
            items: [
                { href: '/profile', label: t('common.profile'), icon: User },
                { href: '/settings', label: t('common.settings'), icon: SettingsIcon },
            ]
        }
    ];

    const bubbleVariants: Variants = {
        initial: { opacity: 0, scale: 0.9, y: 20 },
        animate: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: { type: "spring", damping: 20, stiffness: 100 }
        }
    };

    return (
        <aside className="hidden lg:flex w-72 h-screen flex-col bg-surface fixed top-0 left-0 z-40 px-4 py-8 gap-4 select-none overflow-hidden">
            {/* 1. Logo & Brand Bubble */}
            <motion.div
                variants={bubbleVariants}
                initial="initial"
                animate="animate"
                whileHover={{ scale: 1.02 }}
                className="bg-surface-container-high/40 backdrop-blur-2xl border border-outline/10 p-5 rounded-[2.5rem] shadow-2xl flex items-center gap-4 group cursor-default"
            >
                <motion.div
                    animate={{
                        y: [0, -5, 0],
                        rotate: [0, 5, -5, 0]
                    }}
                    transition={{
                        duration: 6,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center shadow-lg shadow-primary/10"
                >
                    <img src="/logo.svg" alt="Logo" className="w-7 h-7 brightness-0 dark:invert" />
                </motion.div>
                <div className="flex flex-col">
                    <span className="text-2xl font-black text-primary tracking-tighter italic uppercase">
                        BuddyLine
                    </span>
                    <span className="text-[9px] font-black text-on-surface-variant/60 uppercase tracking-[0.3em]">
                        {t('sidebar.private_circle')}
                    </span>
                </div>
            </motion.div>

            {/* 2 & 3. Navigation Bubbles */}
            <div className="flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                {navGroups.map((group, groupIdx) => (
                    <motion.div
                        key={groupIdx}
                        variants={bubbleVariants}
                        initial="initial"
                        animate="animate"
                        className="bg-surface-container-high/30 backdrop-blur-3xl border border-outline/5 p-3 rounded-[2.5rem] shadow-xl flex flex-col gap-1 shrink-0"
                    >
                        {group.items.map((item) => {
                            const isActive = location.pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    to={item.href}
                                    className={clsx(
                                        "relative flex items-center gap-4 px-5 py-3.5 rounded-3xl transition-all duration-500 overflow-hidden group",
                                        isActive
                                            ? "bg-primary text-on-primary shadow-lg shadow-primary/25"
                                            : "text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
                                    )}
                                >
                                    <item.icon
                                        size={22}
                                        className={clsx(
                                            "z-10 transition-transform duration-500",
                                            isActive ? "scale-110" : "group-hover:scale-110"
                                        )}
                                    />
                                    <span className={clsx(
                                        "z-10 font-bold tracking-tight transition-all duration-300",
                                        isActive ? "opacity-100" : "opacity-60 group-hover:opacity-100"
                                    )}>
                                        {item.label}
                                    </span>

                                    {isActive && (
                                        <motion.div
                                            layoutId="active-indicator"
                                            className="absolute inset-0 bg-primary blur-sm scale-110 opacity-50"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                </Link>
                            );
                        })}
                    </motion.div>
                ))}
            </div>

            {/* 4. User Profile Bubble (Static) */}
            <div className="bg-surface-container-high/60 backdrop-blur-2xl border border-primary/10 p-4 rounded-[2.5rem] shadow-2xl flex items-center gap-4 relative mt-auto">
                <div className="relative">
                    <Avatar
                        src={displayAvatar}
                        alt={displayUsername}
                        size="md"
                        className="border-2 border-primary/20"
                    />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-surface flex items-center justify-center shadow-lg">
                        <div className="w-1.5 h-1.5 bg-on-primary rounded-full shadow-sm" />
                    </div>
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-on-surface truncate flex items-center gap-1.5">
                        {displayName}
                        <UserBadge username={displayUsername} isVerified={isVerified} />
                    </p>
                    <div className="text-[10px] text-on-surface-variant/70 truncate font-mono flex items-center">
                        <span>{user?.email?.substring(0, 5)}</span>
                        <span className="blur-[2px] select-none opacity-50">
                            {user?.email?.substring(5)}
                        </span>
                    </div>
                </div>

                <motion.button
                    onClick={() => signOut()}
                    variants={bubbleVariants}
                    whileHover={{
                        scale: 1.1,
                        boxShadow: "0 0 25px 5px rgba(239, 68, 68, 0.4)",
                        backgroundColor: "rgb(239, 68, 68)",
                        color: "white"
                    }}
                    className="p-2.5 rounded-2xl bg-error/10 text-error transition-all duration-300 shadow-sm relative group"
                    title={t('common.logout')}
                >
                    <LogOut size={18} className="relative z-10" />
                    {/* Inner wrapping glow */}
                    <div className="absolute inset-0 rounded-2xl bg-error/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </motion.button>
            </div>
        </aside>
    );
};
