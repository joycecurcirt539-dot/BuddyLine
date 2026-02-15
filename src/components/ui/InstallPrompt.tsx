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
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 50, scale: 0.9 }}
                    className="fixed bottom-24 left-4 right-4 lg:left-auto lg:right-8 lg:w-96 z-[100]"
                >
                    <div className="bg-surface-container-high/90 backdrop-blur-2xl border border-primary/20 rounded-[32px] p-5 shadow-2xl shadow-primary/20 flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
                                    <Smartphone className="text-on-primary" size={24} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-black text-on-surface uppercase tracking-tight leading-none mb-1">
                                        BuddyLine App
                                    </h3>
                                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest opacity-80">
                                        {t('common.install_prompt_desc', 'Install for the best experience')}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleDismiss}
                                className="p-2 hover:bg-on-surface/5 rounded-full transition-colors"
                                aria-label={t('common.close', 'Close')}
                                title={t('common.close', 'Close')}
                            >
                                <X size={20} className="text-on-surface-variant" />
                            </button>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                onClick={handleInstall}
                                title={t('common.install', 'Install Now')}
                                aria-label={t('common.install', 'Install Now')}
                                className="flex-1 py-3 font-black uppercase tracking-widest text-xs rounded-2xl"
                            >
                                <Download size={16} className="mr-2" />
                                {t('common.install', 'Install Now')}
                            </Button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
