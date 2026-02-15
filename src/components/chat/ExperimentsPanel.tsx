import { FlaskConical, Sparkles, Bot, Zap } from 'lucide-react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

export const ExperimentsPanel = () => {
    const { t } = useTranslation();
    const experiments = [
        { icon: Bot, name: t('chat.experiments.ai_assistant.name'), desc: t('chat.experiments.ai_assistant.desc'), active: false },
        { icon: Sparkles, name: t('chat.experiments.magic_themes.name'), desc: t('chat.experiments.magic_themes.desc'), active: true, status: t('chat.experiments.status_soon') },
        { icon: Zap, name: t('chat.experiments.quick_replies.name'), desc: t('chat.experiments.quick_replies.desc'), active: false },
    ];

    return (
        <div className="relative bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/10 p-6 h-full transition-colors">
            {/* "In Development" Corner Badge (Smooth chaotic loop + 3D pop-out) */}
            <motion.div
                animate={{
                    rotate: [36, 38, 34, 37, 35, 36],
                    scale: [1, 1.05, 0.98, 1.03, 0.97, 1],
                    x: [0, 2, -1, 1.5, -0.5, 0],
                    y: [0, -1, 1, -1.5, 0.5, 0],
                }}
                transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "linear", // Using linear for a more "haotic but steady" movement
                }}
                className="absolute -top-1 -right-6 bg-tertiary opacity-100 text-on-tertiary text-[10px] font-black uppercase tracking-widest px-10 py-1.5 shadow-[0_10px_20px_rgba(0,0,0,0.3)] z-30 pointer-events-none ring-2 ring-tertiary/20"
                style={{ transformOrigin: 'center' }}
            >
                {t('chat.experiments.in_development')}
            </motion.div>

            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-tertiary/10 rounded-lg">
                    <FlaskConical size={20} className="text-tertiary" />
                </div>
                <h3 className="font-bold text-on-surface">{t('chat.experiments.title')}</h3>
            </div>

            <div className="space-y-4">
                {experiments.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                        <div key={idx} className="group p-4 rounded-xl border border-outline-variant/10 hover:border-primary/20 hover:bg-surface-container-low transition-all cursor-pointer">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div className={clsx(
                                        "p-1.5 rounded-lg transition-colors",
                                        item.active ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant group-hover:bg-surface-container-lowest group-hover:text-primary"
                                    )}>
                                        <Icon size={16} />
                                    </div>
                                    <span className="font-medium text-on-surface">{item.name}</span>
                                </div>
                                {item.active && (
                                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold tracking-wider">
                                        {item.status || t('chat.experiments.live')}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-on-surface-variant pl-10">
                                {item.desc}
                            </p>
                        </div>
                    );
                })}

                <div className="mt-8 p-4 bg-surface-container rounded-xl text-center border border-outline-variant/5">
                    <p className="text-xs text-on-surface-variant/60 font-medium">{t('chat.experiments.coming_soon')}</p>
                    <p className="text-sm font-semibold text-on-surface-variant">{t('chat.experiments.voice_rooms')}</p>
                </div>
            </div>
        </div>
    );
};
