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
                <div className="liquid-glass w-full max-w-sm rounded-[3rem] p-10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)] border-white/20 flex flex-col items-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-40 animate-pulse" />

                    <div className="relative mb-8 pt-4">
                        <div className="absolute inset-0 bg-primary/30 rounded-full blur-2xl animate-pulse scale-150" />
                        <div className="w-28 h-28 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center shadow-2xl relative z-10 border border-white/20 animate-bounce">
                            {incomingCall.type === 'video' ? (
                                <Video className="w-12 h-12 text-primary drop-shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]" />
                            ) : (
                                <Phone className="w-12 h-12 text-primary drop-shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]" />
                            )}
                        </div>
                    </div>

                    <h2 className="text-3xl font-black text-white mb-2 text-center uppercase italic tracking-tight">
                        {t('calls.incoming')}
                    </h2>
                    <p className="text-primary font-black uppercase tracking-[0.4em] text-[10px] mb-10 text-center opacity-80 animate-pulse italic">
                        {incomingCall.type === 'video' ? t('calls.video_call') : t('calls.audio_call')}
                    </p>

                    <div className="flex gap-6 w-full">
                        <motion.button
                            whileHover={{ scale: 1.1, rotate: -15 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={declineCall}
                            title={t('common.cancel')}
                            className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-[2rem] py-5 flex items-center justify-center transition-all shadow-2xl shadow-red-500/40 border border-red-400/20"
                        >
                            <PhoneOff className="w-8 h-8" />
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.1, rotate: 15 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={acceptCall}
                            title={t('common.accept')}
                            className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-[2rem] py-5 flex items-center justify-center transition-all shadow-2xl shadow-green-500/40 border border-green-400/20"
                        >
                            <Phone className="w-8 h-8" />
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
};
