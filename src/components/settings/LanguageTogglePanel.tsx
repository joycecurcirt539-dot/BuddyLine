import { Globe, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

export const LanguageTogglePanel = () => {
    const { t, i18n } = useTranslation();

    const languages = [
        { id: 'en', label: t('settings.language.en'), flag: '🇺🇸' },
        { id: 'ru', label: t('settings.language.ru'), flag: '🇷🇺' },
    ];

    const currentLanguage = i18n.language || 'en';

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    return (
        <div className="liquid-glass p-8 relative overflow-hidden group bg-surface-container-low/40 backdrop-blur-xl rounded-[3.5rem] border border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.1)] h-full">
            {/* Background Atmosphere */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 animate-pulse" />

            <div className="flex items-center gap-4 mb-2 relative z-10">
                <div className="p-3 bg-surface-container-low rounded-2xl shadow-lg ring-1 ring-primary/20 group-hover:rotate-12 transition-transform duration-500">
                    <Globe size={20} className="text-primary animate-pulse" />
                </div>
                <div>
                    <h3 className="text-lg font-black text-on-surface uppercase tracking-tight italic">{t('settings.system.title')}</h3>
                    <p className="text-primary font-black text-[10px] uppercase tracking-widest opacity-80">{t('settings.system.subtitle')}</p>
                </div>
            </div>

            <p className="text-on-surface-variant font-medium text-sm mb-8 relative z-10 opacity-70">
                {t('settings.language.desc')}
            </p>

            <div className="grid grid-cols-2 gap-6 relative z-10">
                {languages.map((lng) => {
                    const isActive = currentLanguage.startsWith(lng.id);
                    return (
                        <button
                            key={lng.id}
                            onClick={() => !isActive && changeLanguage(lng.id)}
                            className={clsx(
                                "relative flex flex-col items-center gap-4 p-6 rounded-[2.5rem] border transition-all duration-500 group/btn",
                                isActive
                                    ? "bg-gradient-to-br from-primary/20 to-primary/5 border-primary shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)] ring-4 ring-primary/20"
                                    : "liquid-glass bg-white/5 border-white/10 hover:border-primary/50 hover:bg-white/10 hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)] hover:scale-[1.02]"
                            )}
                        >
                            <div className="text-4xl mb-1 transition-transform group-hover/btn:scale-110 duration-500">
                                {lng.flag}
                            </div>

                            <span className={clsx(
                                "font-black uppercase tracking-tighter italic text-sm transition-colors",
                                isActive ? "text-primary" : "text-on-surface-variant group-hover/btn:text-on-surface"
                            )}>
                                {lng.label}
                            </span>

                            {isActive && (
                                <motion.div
                                    layoutId="active-language"
                                    className="absolute -top-3 -right-3 w-8 h-8 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-xl border-4 border-surface"
                                    initial={{ scale: 0, rotate: -45 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                >
                                    <Check size={18} strokeWidth={4} />
                                </motion.div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
