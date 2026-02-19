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
        <div className="bubble p-6 h-full relative group/experiments transition-all duration-700 hover:shadow-primary/5 border border-outline-variant/10">
            {/* Atmosphere */}
            <div className="absolute inset-0 bg-gradient-to-br from-tertiary/5 via-transparent to-transparent opacity-50" />

            {/* Overflowing Beta Badge with Loop Animation - Fixed z-index and clipping */}
            <div className="absolute -top-3 -right-4 z-50 pointer-events-none rotate-6">
                <div className="bg-tertiary text-on-tertiary text-[9px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-2xl shadow-[0_8px_20px_rgba(var(--tertiary),0.4)] border-2 border-white/10 italic overflow-hidden flex whitespace-nowrap">
                    <div className="flex items-center">
                        <span>{t('chat.experiments.in_development')}</span>
                    </div>
                </div>
            </div>

            <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-2.5 bg-tertiary/10 rounded-2xl border border-tertiary/20 shadow-inner group-hover/experiments:scale-110 transition-transform duration-500">
                        <FlaskConical size={20} className="text-tertiary" />
                    </div>
                    <div>
                        <h3 className="font-black text-lg text-on-surface uppercase tracking-tight italic">{t('chat.experiments.title')}</h3>
                        <p className="text-[9px] font-black text-tertiary uppercase tracking-widest opacity-60">Uplink Beta</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {experiments.map((item, idx) => {
                        const Icon = item.icon;
                        return (
                            <motion.div
                                key={idx}
                                whileHover={{ x: 8 }}
                                className="group p-4 rounded-[24px] bg-white/5 border border-white/5 hover:border-primary/20 hover:bg-primary/5 transition-all cursor-pointer relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                <div className="relative z-10 flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-4">
                                        <div className={clsx(
                                            "p-2.5 rounded-xl transition-all shadow-lg",
                                            item.active ? "bg-primary text-on-primary shadow-primary/20" : "bg-white/5 text-on-surface-variant group-hover:bg-primary/10 group-hover:text-primary"
                                        )}>
                                            <Icon size={18} />
                                        </div>
                                        <span className="font-black text-xs uppercase tracking-widest text-on-surface group-hover:text-primary transition-colors">{item.name}</span>
                                    </div>
                                    {item.active && (
                                        <span className="text-[8px] font-black bg-primary/10 text-primary px-2.5 py-1 rounded-full tracking-[0.2em] uppercase border border-primary/20">
                                            {item.status || t('chat.experiments.live')}
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] text-on-surface-variant pl-12 font-bold italic opacity-60 group-hover:opacity-100 transition-opacity">
                                    {item.desc}
                                </p>
                            </motion.div>
                        );
                    })}

                    <div className="mt-8 p-6 bg-white/2 rounded-[32px] text-center border border-dashed border-outline-variant/10 group/soon hover:border-primary/20 transition-all">
                        <p className="text-[9px] text-primary font-black uppercase tracking-[0.3em] mb-1">{t('chat.experiments.coming_soon')}</p>
                        <p className="text-sm font-black text-on-surface uppercase italic tracking-tight group-hover/soon:scale-105 transition-transform">{t('chat.experiments.voice_rooms')}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
