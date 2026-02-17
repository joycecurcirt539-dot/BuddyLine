import { Feed } from '../components/feed/Feed';
import { UserListPanel } from '../components/discover/UserListPanel';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';

interface LayoutContext {
    onLogoClick: () => void;
}

export const Home = () => {
    const { t } = useTranslation();
    const { onLogoClick } = useOutletContext<LayoutContext>();

    return (
        <div className="w-full flex gap-8">
            <div className="flex-1">
                <div className="mb-6 flex items-center gap-4">
                    {/* Mobile Brand Bubble */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onLogoClick}
                        className="lg:hidden relative z-10 w-12 h-12 rounded-2xl bg-surface-container-high/60 backdrop-blur-xl border border-outline/10 p-2.5 flex items-center justify-center shadow-2xl cursor-pointer"
                    >
                        <motion.div
                            animate={{
                                y: [0, -2, 0],
                                rotate: [0, 5, -5, 0]
                            }}
                            transition={{
                                duration: 5,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            className="w-full h-full rounded-xl bg-primary/20 flex items-center justify-center shadow-lg shadow-primary/10"
                        >
                            <img src="/logo.svg" alt="Logo" className="w-5 h-5 brightness-0 dark:invert" />
                        </motion.div>
                    </motion.div>

                    <div className="flex flex-col">
                        <h1 className="text-2xl lg:text-3xl page-title-highlight leading-tight">{t('common.home')}</h1>
                        <p className="text-on-surface-variant font-medium text-sm lg:text-base">{t('home.feed_subtitle')}</p>
                    </div>
                </div>
                <Feed />
            </div>

            <UserListPanel />
        </div>
    );
};
