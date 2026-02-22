import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
    Sparkles,
    Zap,
    Shield,
    LayoutGrid,
    Users2
} from 'lucide-react';

export const FriendsSidebar = () => {
    const { t } = useTranslation();

    const futureFeatures = [
        {
            icon: <Sparkles className="text-secondary" size={18} />,
            title: t('friends_page.sidebar.circles.name'),
            desc: t('friends_page.sidebar.circles.desc')
        },
        {
            icon: <Zap className="text-primary" size={18} />,
            title: t('friends_page.sidebar.activity.name'),
            desc: t('friends_page.sidebar.activity.desc')
        },
        {
            icon: <Shield className="text-tertiary" size={18} />,
            title: t('friends_page.sidebar.nodes.name'),
            desc: t('friends_page.sidebar.nodes.desc')
        }
    ];

    return (
        <div className="w-80 hidden xl:flex flex-col gap-6 sticky top-0 h-fit">
            {/* Future Features / Concepts */}
            <div className="liquid-glass p-6 rounded-[3rem] border border-white/20 shadow-[0_0_40px_rgba(0,0,0,0.1)] dark:shadow-[0_0_40px_rgba(255,255,255,0.03)] relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/20 rounded-full blur-[60px] -mr-16 -mt-16 animate-pulse pointer-events-none opacity-50" />

                <div className="flex items-center gap-3 mb-6 relative z-10">
                    <motion.div
                        whileHover={{ rotate: 12, scale: 1.1 }}
                        className="p-2.5 bg-surface-container-low rounded-xl shadow-lg ring-1 ring-secondary/20 relative"
                    >
                        <div className="absolute inset-0 pointer-events-none opacity-50">
                            <Sparkles size={6} className="absolute top-0.5 left-0.5 text-secondary animate-pulse" />
                            <Sparkles size={4} className="absolute bottom-1 right-0.5 text-secondary animate-pulse delay-700" />
                        </div>
                        <LayoutGrid size={20} className="text-secondary relative z-10" />
                    </motion.div>
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-tighter italic text-on-surface">
                            {t('friends_page.sidebar.title')}
                        </h2>
                        <p className="text-secondary font-black text-[9px] uppercase tracking-widest opacity-80">
                            {t('friends_page.sidebar.subtitle')}
                        </p>
                    </div>
                </div>

                <div className="space-y-4 relative z-10">
                    {futureFeatures.map((feature, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            whileHover={{ x: 4, backgroundColor: "rgba(255,255,255, 0.05)" }}
                            transition={{ delay: i * 0.1 }}
                            className="p-4 bg-white/5 backdrop-blur-md rounded-[1.5rem] border border-white/10 hover:border-secondary/30 transition-all cursor-default group/item shadow-inner"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <motion.div whileHover={{ scale: 1.2, rotate: 5 }}>
                                    {feature.icon}
                                </motion.div>
                                <h3 className="text-xs font-black text-on-surface group-hover/item:text-secondary transition-colors">
                                    {feature.title}
                                </h3>
                            </div>
                            <p className="text-[10px] font-medium text-on-surface-variant leading-relaxed">
                                {feature.desc}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Quick Stats Concept */}
            <div className="liquid-glass p-6 rounded-[2.5rem] border border-white/10 shadow-lg relative overflow-hidden group/footer hover:border-white/20 transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover/footer:opacity-100 transition-opacity duration-700 pointer-events-none" />
                <div className="flex items-center gap-3 mb-4 relative z-10">
                    <div className="p-2.5 bg-primary/20 text-primary rounded-[1.25rem] shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]">
                        <Users2 size={18} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface opacity-60">
                        {t('friends_page.sidebar.network_strength')}
                    </span>
                </div>
                <div className="h-2.5 w-full bg-white/5 backdrop-blur-sm rounded-full overflow-hidden border border-white/5 relative z-10 shadow-inner">
                    <div className="h-full bg-gradient-to-r from-primary to-secondary w-[65%] rounded-full shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]" />
                </div>
                <p className="mt-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 relative z-10">
                    {t('friends_page.sidebar.connection_density')}
                </p>
            </div>
        </div>
    );
};
