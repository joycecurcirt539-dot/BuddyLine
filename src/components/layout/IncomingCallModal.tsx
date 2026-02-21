import React from 'react';
import { createPortal } from 'react-dom';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { useCall } from '../../context/CallContext';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

export const IncomingCallModal: React.FC = () => {
    const { incomingCall, acceptCall, declineCall, isRinging } = useCall();
    const { t } = useTranslation();

    if (!isRinging || !incomingCall) return null;

    return createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
                <div className="bg-surface-elevated w-full max-w-sm rounded-3xl p-8 shadow-2xl border border-white/10 flex flex-col items-center">
                    <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-6 animate-pulse">
                        {incomingCall.type === 'video' ? (
                            <Video className="w-10 h-10 text-primary" />
                        ) : (
                            <Phone className="w-10 h-10 text-primary" />
                        )}
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-2 text-center">
                        {t('calls.incoming')}
                    </h2>
                    <p className="text-white/60 mb-8 text-center italic">
                        {incomingCall.type === 'video' ? t('calls.video_call') : t('calls.audio_call')}
                    </p>

                    <div className="flex gap-6 w-full">
                        <button
                            onClick={declineCall}
                            title={t('common.cancel')}
                            className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-2xl py-4 flex items-center justify-center transition-colors shadow-lg shadow-red-500/20"
                        >
                            <PhoneOff className="w-6 h-6" />
                            <span className="sr-only">{t('common.cancel')}</span>
                        </button>
                        <button
                            onClick={acceptCall}
                            title={t('common.accept')}
                            className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-2xl py-4 flex items-center justify-center transition-colors shadow-lg shadow-green-500/20"
                        >
                            <Phone className="w-6 h-6" />
                            <span className="sr-only">{t('common.accept')}</span>
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
};
