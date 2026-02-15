import { Lock, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const SecretPanel = () => {
    const { t } = useTranslation();
    return (
        <div className="relative overflow-hidden rounded-3xl p-6 mb-6 group border border-outline-variant/10 shadow-xl transition-all duration-500 hover:shadow-primary/5 bg-transparent">
            {/* Background Layers */}
            <div className="absolute inset-0 secret-panel-bg shadow-inner transition-colors" />
            <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.1] group-hover:opacity-[0.15] transition-opacity duration-700 primary-gradient" />

            {/* Large Backdrop Icon */}
            <div className="absolute -top-4 -right-4 opacity-[0.05] dark:opacity-[0.15] group-hover:opacity-[0.25] transition-all duration-700 rotate-12 group-hover:rotate-6 text-primary scale-110">
                <Lock size={120} strokeWidth={1} />
            </div>

            <div className="relative z-10">
                <div className="flex items-center gap-4 mb-3">
                    <div className="p-2.5 bg-primary/10 rounded-2xl backdrop-blur-md border border-primary/20 shadow-inner group-hover:scale-110 transition-transform duration-500">
                        <EyeOff size={22} className="text-primary" />
                    </div>
                    <h3 className="font-black text-xl text-on-surface uppercase tracking-tight italic">{t('chat.secrets.title')}</h3>
                </div>

                <p className="text-on-surface-variant text-sm mb-5 leading-relaxed font-medium">
                    {t('chat.secrets.subtitle')} <br />
                    <span className="text-primary/70">{t('chat.secrets.desc')}</span>
                </p>

                <button className="relative w-full overflow-hidden bg-primary hover:bg-primary-container hover:text-on-primary-container text-on-primary px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-[0.2em] transition-all duration-300 shadow-lg shadow-primary/20 active:scale-95 group/btn">
                    <span className="relative z-10 flex items-center justify-center gap-2">
                        {t('chat.secrets.button')}
                    </span>
                </button>
            </div>
        </div>
    );
};
