import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ThemeTogglePanel } from '../components/settings/ThemeTogglePanel';
import { LanguageTogglePanel } from '../components/settings/LanguageTogglePanel';
import { LogOut, Shield, Bell, Cpu, ArrowLeft, Palette, Globe, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { clsx } from 'clsx';

type SettingCategory = 'profile' | 'appearance' | 'system' | 'notifications' | 'privacy' | 'account' | null;

import { useProfile } from '../hooks/useProfile';

export const Settings = () => {
    const { t } = useTranslation();
    const { user, isGuest, signOut } = useAuth();
    const { profile } = useProfile();
    const [activeCategory, setActiveCategory] = useState<SettingCategory>(null);
    const navigate = useNavigate();

    // Helper to get display data
    const displayAvatar = profile?.avatar_url || user?.user_metadata?.avatar_url;
    const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.username || 'User';
    const displayUsername = profile?.username || user?.user_metadata?.username || 'username';

    const categories = [
        { id: 'appearance', title: t('settings.visual.title'), desc: t('settings.visual.subtitle'), icon: Palette, color: 'text-tertiary', guestHidden: false },
        { id: 'system', title: t('settings.system.title'), desc: t('settings.system.subtitle'), icon: Globe, color: 'text-blue-500', guestHidden: false },
        { id: 'notifications', title: t('settings.sections.notifications'), desc: t('settings.sections.notifications_desc'), icon: Bell, color: 'text-primary', guestHidden: true },
        { id: 'privacy', title: t('settings.sections.privacy'), desc: t('settings.sections.privacy_desc'), icon: Shield, color: 'text-tertiary', guestHidden: true },
        { id: 'account', title: t('settings.sections.account'), desc: t('settings.sections.account_desc'), icon: Cpu, color: 'text-amber-500', guestHidden: true },
    ];

    const filteredCategories = isGuest ? categories.filter(c => !c.guestHidden) : categories;

    return (
        <div className="w-full pb-20 lg:pb-10 relative min-h-screen">
            {/* Desktop Header / Global Header */}
            <header className={clsx("mb-8 lg:mb-12", activeCategory && "hidden lg:block")}>
                <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-1 bg-primary rounded-full shadow-[0_0_12px_currentColor]" />
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em]"
                    >
                        {t('settings.system_access')}
                    </motion.div>
                </div>
                <h1 className="text-4xl lg:text-6xl font-black text-on-surface mb-2 uppercase italic tracking-tighter">
                    {t('settings.title')}
                </h1>
                <p className="text-on-surface-variant font-bold uppercase tracking-widest text-xs opacity-60">
                    {t('settings.subtitle')}
                </p>
            </header>

            {/* Mobile Back Button */}
            {activeCategory && (
                <button
                    onClick={() => setActiveCategory(null)}
                    className="lg:hidden flex items-center gap-3 mb-6 text-primary font-black uppercase tracking-widest text-xs py-2 group"
                >
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    {t('common.back')}
                </button>
            )}

            <div className="relative">
                {/* Mobile Category List */}
                <AnimatePresence mode="wait">
                    {!activeCategory ? (
                        <motion.div
                            key="categories"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="grid grid-cols-1 gap-4 lg:hidden"
                        >
                            {filteredCategories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => {
                                        if (cat.id === 'account') {
                                            navigate('/profile');
                                        } else {
                                            setActiveCategory(cat.id as SettingCategory);
                                        }
                                    }}
                                    className="bg-surface/40 backdrop-blur-xl border border-outline-variant/10 rounded-[32px] p-5 flex items-center justify-between group active:scale-95 transition-all text-left"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={clsx("p-3 rounded-2xl bg-surface shadow-md group-hover:scale-110 transition-transform", cat.color)}>
                                            <cat.icon size={22} />
                                        </div>
                                        <div>
                                            <h4 className="font-black uppercase tracking-tight italic text-on-surface text-sm">{cat.title}</h4>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 leading-tight">{cat.desc}</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={20} className="text-on-surface-variant/30 group-hover:text-primary transition-colors" />
                                </button>
                            ))}

                            <div className="mt-8 border-t border-outline-variant/10 pt-8">
                                <button
                                    onClick={() => signOut()}
                                    className="w-full bg-red-500/10 border border-red-500/20 rounded-[32px] p-5 flex items-center gap-4 group active:scale-95 transition-all text-left"
                                >
                                    <div className="p-3 rounded-2xl bg-red-500/20 text-red-500 shadow-md">
                                        <LogOut size={22} />
                                    </div>
                                    <div>
                                        <h4 className="font-black uppercase tracking-tight italic text-red-600 text-sm">{t('settings.danger_zone.sign_out')}</h4>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-red-500/60 leading-tight italic">TERMINATE SESSION</p>
                                    </div>
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="category-content"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="lg:hidden"
                        >

                            {activeCategory === 'appearance' && <ThemeTogglePanel />}
                            {activeCategory === 'system' && <LanguageTogglePanel />}
                            {(activeCategory === 'notifications' || activeCategory === 'privacy') && (
                                <div className="bubble p-10 flex flex-col items-center justify-center text-center py-20">
                                    <Cpu size={48} className="text-on-surface-variant/20 mb-6" />
                                    <h4 className="text-on-surface font-black uppercase tracking-tight italic mb-2">{t(`settings.sections.${activeCategory}`)}</h4>
                                    <p className="text-on-surface-variant/60 font-medium text-sm">{t(`settings.sections.${activeCategory}_desc`)}</p>
                                    <p className="mt-4 text-primary font-black text-[10px] uppercase tracking-widest bg-primary/10 px-4 py-1.5 rounded-full">Coming Soon</p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Desktop Grid Layout (Hidden on Mobile) */}
                <div className="hidden lg:grid grid-cols-1 gap-12 mt-8">
                    {/* Identity Section (Read Only / Redirect) */}
                    {!isGuest && (
                        <motion.section
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bubble p-8 md:p-12 relative overflow-hidden flex flex-col md:flex-row items-center gap-8 md:gap-12"
                        >
                            <div className="relative">
                                <div className="absolute -inset-4 bg-gradient-to-tr from-primary to-tertiary rounded-full opacity-20 blur-xl animate-pulse" />
                                <Avatar src={displayAvatar} alt={displayUsername} size="xl" className="ring-4 ring-surface shadow-2xl relative z-10" />
                            </div>

                            <div className="flex-1 text-center md:text-left space-y-4">
                                <div>
                                    <h3 className="font-black text-on-surface uppercase italic tracking-tight text-3xl">
                                        {displayName}
                                    </h3>
                                    <p className="text-primary font-black text-xs uppercase tracking-[0.2em] opacity-80">
                                        @{displayUsername}
                                    </p>
                                </div>
                                <p className="text-on-surface-variant font-medium max-w-lg mx-auto md:mx-0">
                                    {t('settings.sections.account_desc')}
                                </p>
                            </div>

                            <Button
                                onClick={() => window.location.href = '/profile'} // Force navigation or use navigate
                                className="px-8 py-4 rounded-[24px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-sm shrink-0"
                            >
                                {t('profile_page.edit_profile')} <ArrowLeft className="rotate-180 ml-2" size={18} />
                            </Button>
                        </motion.section>
                    )}

                    {/* Desktop Panels */}
                    <div className="grid grid-cols-2 gap-8">
                        <ThemeTogglePanel />
                        <LanguageTogglePanel />
                    </div>

                    {!isGuest && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {filteredCategories.slice(2).map((item) => (
                                <button key={item.id} className="bg-surface/30 backdrop-blur-xl border border-outline-variant/10 rounded-[32px] p-6 flex items-center gap-5 hover:bg-surface/50 transition-all text-left group">
                                    <div className={clsx("p-4 rounded-2xl bg-surface shadow-lg group-hover:rotate-12 duration-500", item.color)}>
                                        <item.icon size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-black uppercase tracking-tight italic text-on-surface">{item.title}</h4>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 leading-tight">{item.desc}</p>
                                    </div>
                                </button>
                            ))}

                            {/* Logout Card integrated into grid */}
                            <button
                                onClick={() => signOut()}
                                className="bg-red-500/5 backdrop-blur-xl border border-red-500/10 rounded-[32px] p-6 flex items-center gap-5 hover:bg-red-500/10 transition-all text-left group"
                            >
                                <div className="p-4 rounded-2xl bg-red-500/10 text-red-500 shadow-lg group-hover:scale-110 duration-500">
                                    <LogOut size={24} />
                                </div>
                                <div>
                                    <h4 className="font-black uppercase tracking-tight italic text-red-600">{t('settings.danger_zone.sign_out')}</h4>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-red-500/60 leading-tight italic">TERMINATE SESSION</p>
                                </div>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
