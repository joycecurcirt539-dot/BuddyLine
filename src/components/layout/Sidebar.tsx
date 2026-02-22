import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Home, Users, MessageSquare, User, Settings as SettingsIcon, LogOut, Bell } from 'lucide-react';
import type { FC } from 'react';
import { Avatar } from '../ui/Avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { UserBadge } from '../ui/UserBadge';
import { useProfile } from '../../hooks/useProfile';
import { useState } from 'react';

const NAV_COLORS: Record<string, string> = {
    '/': '#6366F1',
    '/friends': '#10B981',
    '/chat': '#F59E0B',
    '/notifications': '#EF4444',
    '/profile': '#8B5CF6',
    '/settings': '#64748B',
};

interface NavItem {
    href: string;
    label: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon: FC<any>;
}

interface NavIconProps {
    item: NavItem;
    isActive: boolean;
    isHovered: boolean;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}

const NavIcon: FC<NavIconProps> = ({ item, isActive, isHovered, onMouseEnter, onMouseLeave }) => {
    const color = NAV_COLORS[item.href] ?? '#6366F1';
    const Icon = item.icon;

    return (
        <Link
            to={item.href}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            className="relative flex items-center justify-center"
            style={{ isolation: 'isolate' }}
        >
            {/* Active vertical bar */}
            <AnimatePresence>
                {isActive && (
                    <motion.div
                        layoutId="sidebar-active-bar"
                        initial={{ scaleY: 0, opacity: 0 }}
                        animate={{ scaleY: 1, opacity: 1 }}
                        exit={{ scaleY: 0, opacity: 0 }}
                        transition={{ type: 'spring' as const, stiffness: 400, damping: 30 }}
                        className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full z-20"
                        style={{ background: color, boxShadow: `0 0 12px 2px ${color}80` }}
                    />
                )}
            </AnimatePresence>

            {/* Icon button */}
            <motion.div
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                animate={isActive ? { scale: 1.08 } : { scale: 1 }}
                transition={{ type: 'spring' as const, stiffness: 400, damping: 20 }}
                className="relative w-12 h-12 flex items-center justify-center rounded-2xl transition-colors duration-300 cursor-pointer"
                style={{
                    background: isActive
                        ? `${color}22`
                        : isHovered
                            ? `${color}11`
                            : 'transparent',
                    boxShadow: isActive
                        ? `0 0 24px 4px ${color}33, inset 0 0 12px ${color}11`
                        : 'none',
                }}
            >
                <Icon
                    size={22}
                    className="transition-colors duration-300"
                    color={isActive ? color : isHovered ? color : 'var(--color-on-surface-variant)'}
                    style={{
                        filter: isActive ? `drop-shadow(0 0 8px ${color}90)` : 'none',
                    }}
                />

                {/* Pulse ring for active */}
                {isActive && (
                    <motion.div
                        className="absolute inset-0 rounded-2xl pointer-events-none"
                        animate={{ opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                        style={{ border: `1.5px solid ${color}60`, boxShadow: `0 0 20px ${color}30` }}
                    />
                )}
            </motion.div>

            {/* Floating tooltip label */}
            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ opacity: 0, x: -8, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -8, scale: 0.9 }}
                        transition={{ type: 'spring' as const, stiffness: 400, damping: 25 }}
                        className="absolute left-16 z-50 whitespace-nowrap pointer-events-none"
                    >
                        <div
                            className="px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest text-white select-none"
                            style={{
                                background: `linear-gradient(135deg, ${color}ee, ${color}99)`,
                                boxShadow: `0 4px 20px ${color}50`,
                            }}
                        >
                            {item.label}
                        </div>
                        <div
                            className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3 h-3 rotate-45"
                            style={{ background: color }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </Link>
    );
};

export const Sidebar = ({ onLogoClick }: { onLogoClick: () => void }) => {
    const { t } = useTranslation();
    const { user, signOut } = useAuth();
    const { profile } = useProfile();
    const location = useLocation();
    const [hoveredHref, setHoveredHref] = useState<string | null>(null);

    const displayAvatar = profile?.avatar_url || user?.user_metadata?.avatar_url;
    const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0];
    const displayUsername = profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0];
    const isVerified = profile?.is_verified || user?.user_metadata?.is_verified;

    const navItems: NavItem[] = [
        { href: '/', label: t('common.home'), icon: Home },
        { href: '/friends', label: t('common.friends'), icon: Users },
        { href: '/chat', label: t('common.messages'), icon: MessageSquare },
        { href: '/notifications', label: t('common.notifications'), icon: Bell },
    ];
    const bottomItems: NavItem[] = [
        { href: '/profile', label: t('common.profile'), icon: User },
        { href: '/settings', label: t('common.settings'), icon: SettingsIcon },
    ];

    return (
        <motion.aside
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: 'spring' as const, stiffness: 200, damping: 30 }}
            className="hidden lg:flex w-20 h-screen flex-col fixed top-0 left-0 z-40 items-center py-6 gap-4 select-none border-r border-white/10"
        >
            {/* Logo orb */}
            <motion.div
                whileHover={{ scale: 1.12 }}
                whileTap={{ scale: 0.9 }}
                onClick={onLogoClick}
                className="sidebar-logo-orb w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer relative mb-2 shrink-0"
            >
                <img src="/logo.png" alt="Logo" className="w-7 h-7 object-contain relative z-10" />
                <motion.div
                    className="absolute inset-0 rounded-2xl"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ border: '1.5px solid rgba(255,255,255,0.4)', boxShadow: '0 0 30px rgba(99,102,241,0.4)' }}
                />
            </motion.div>

            {/* Divider */}
            <div className="sidebar-divider w-8 h-px shrink-0" />

            {/* Main nav */}
            <div className="flex flex-col gap-2 flex-1">
                {navItems.map((item) => (
                    <NavIcon
                        key={item.href}
                        item={item}
                        isActive={location.pathname === item.href}
                        isHovered={hoveredHref === item.href}
                        onMouseEnter={() => setHoveredHref(item.href)}
                        onMouseLeave={() => setHoveredHref(null)}
                    />
                ))}
            </div>

            {/* Divider */}
            <div className="sidebar-divider w-8 h-px shrink-0" />

            {/* Bottom nav */}
            <div className="flex flex-col gap-2">
                {bottomItems.map((item) => (
                    <NavIcon
                        key={item.href}
                        item={item}
                        isActive={location.pathname === item.href}
                        isHovered={hoveredHref === item.href}
                        onMouseEnter={() => setHoveredHref(item.href)}
                        onMouseLeave={() => setHoveredHref(null)}
                    />
                ))}
            </div>

            {/* Divider */}
            <div className="sidebar-divider w-8 h-px shrink-0" />

            {/* User + Logout */}
            <div className="flex flex-col items-center gap-3 shrink-0">
                <div className="relative group cursor-pointer" title={displayName}>
                    <Avatar
                        src={displayAvatar}
                        alt={displayUsername}
                        size="sm"
                        status="online"
                        className="border-2 border-primary/20"
                    />
                    {/* Name tooltip */}
                    <div className="absolute left-14 top-0 z-50 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="px-3 py-1.5 rounded-xl text-xs font-black text-white bg-slate-800/90 backdrop-blur-xl border border-white/10 flex items-center gap-1">
                            {displayName}
                            {isVerified && <UserBadge username={displayUsername} isVerified={isVerified} />}
                        </div>
                    </div>
                </div>

                <motion.button
                    onClick={() => signOut()}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-error/10 text-error transition-all hover:bg-error/20 hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                    title={t('common.logout')}
                >
                    <LogOut size={18} />
                </motion.button>
            </div>
        </motion.aside>
    );
};
