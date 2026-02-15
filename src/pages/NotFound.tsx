import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Home, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const NotFound = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-surface text-on-surface overflow-hidden relative">
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-tertiary/20 rounded-full blur-[128px] animate-pulse delay-1000" />
            </div>

            <div className="relative z-10 text-center px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <h1 className="text-[12rem] md:text-[16rem] font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-primary via-tertiary to-primary opacity-20 select-none">
                        404
                    </h1>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="-mt-16 md:-mt-24"
                >
                    <h2 className="text-3xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-on-surface to-on-surface-variant bg-clip-text text-transparent">
                        {t('404.title', 'Lost in the void?')}
                    </h2>
                    <p className="text-on-surface-variant text-lg mb-8 max-w-md mx-auto">
                        {t('404.description', "The page you are looking for doesn't exist or has been moved to another dimension.")}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <button
                            onClick={() => window.location.href = 'https://buddy-line-7pg7.vercel.app'}
                            className="group relative px-8 py-4 bg-primary text-on-primary rounded-2xl font-bold text-lg shadow-xl shadow-primary/30 transition-all hover:scale-105 hover:shadow-primary/50 flex items-center gap-3 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            <span>{t('404.return_signal', 'Return to Signal')}</span>
                            <ExternalLink size={20} className="group-hover:translate-x-1 transition-transform" />
                        </button>

                        <button
                            onClick={() => navigate('/')}
                            className="px-8 py-4 bg-surface-container-high text-on-surface rounded-2xl font-bold text-lg hover:bg-surface-container-highest transition-all hover:scale-105 flex items-center gap-3"
                        >
                            <Home size={20} />
                            <span>{t('common.home', 'Go Home')}</span>
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default NotFound;
