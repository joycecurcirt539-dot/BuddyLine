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
        <div className="bubble p-8 relative overflow-hidden group">
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
                                "relative flex flex-col items-center gap-4 p-6 rounded-[32px] border-2 transition-all duration-500 group/btn",
                                isActive
                                    ? "border-primary bg-primary/10 ring-8 ring-primary/5 shadow-2xl shadow-primary/20"
                                    : "border-outline-variant/10 hover:border-primary/30 hover:bg-surface-container-low hover:scale-[1.02]"
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
