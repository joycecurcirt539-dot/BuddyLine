import { Link, useLocation } from 'react-router-dom';
import { Home, Users, MessageSquare, User, Settings } from 'lucide-react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';

// Mobile-optimized navigation bar
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
        <nav className={clsx(
            'fixed bottom-0 left-0 right-0 bg-surface/80 backdrop-blur-md border-t border-outline-variant/10 z-50 transition-colors duration-300',
            'lg:hidden'
        )}>
            <div className="flex items-center justify-around h-16 px-2">
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = location.pathname === link.href;

                    return (
                        <Link
                            key={link.href}
                            to={link.href}
                            className={clsx(
                                'flex flex-col items-center justify-center flex-1 h-full transition-all',
                                isActive
                                    ? 'text-primary'
                                    : 'text-on-surface-variant/60'
                            )}
                        >
                            <div className={clsx(
                                'flex items-center justify-center w-14 h-8 transition-all rounded-full',
                                isActive && 'bg-primary/10'
                            )}>
                                <Icon size={24} className={isActive ? 'text-primary' : 'text-on-surface-variant/60'} />
                            </div>
                            <span className={clsx(
                                'text-[10px] mt-1 font-bold uppercase tracking-wider transition-colors',
                                isActive ? 'text-primary' : 'text-on-surface-variant/40'
                            )}>
                                {link.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
};
