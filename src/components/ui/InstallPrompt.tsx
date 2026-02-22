import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}

export const InstallPrompt = () => {
    const { t } = useTranslation();
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handler = (e: Event) => {
            const event = e as BeforeInstallPromptEvent;
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            event.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(event);
            // Check if we've already dismissed it in this session or if already installed
            const dismissed = sessionStorage.getItem('pwa_prompt_dismissed');
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

            if (!dismissed && !isStandalone) {
                setIsVisible(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setIsVisible(false);
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        sessionStorage.setItem('pwa_prompt_dismissed', 'true');
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 100, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 100, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="fixed bottom-24 left-4 right-4 lg:left-auto lg:right-8 lg:w-96 z-[100]"
                >
                    <div className="liquid-glass border-white/20 p-6 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.4)] flex flex-col gap-6 rounded-[2.5rem]">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-5">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-lg animate-pulse" />
                                    <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/30 relative z-10 border border-white/20">
                                        <Smartphone className="text-on-primary" size={28} />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-black text-on-surface uppercase italic tracking-tight leading-none mb-1.5 text-lg">
                                        {t('sidebar.buddyline')}
                                    </h3>
                                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] opacity-60 italic">
                                        {t('common.install_prompt_desc')}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleDismiss}
                                className="p-2 hover:bg-on-surface/5 rounded-full transition-colors"
                                aria-label={t('common.close')}
                                title={t('common.close')}
                            >
                                <X size={20} className="text-on-surface-variant" />
                            </button>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                onClick={handleInstall}
                                variant="primary"
                                className="flex-1 rounded-2xl"
                            >
                                <Download size={18} />
                                {t('common.install')}
                            </Button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
