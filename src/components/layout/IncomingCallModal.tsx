import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { useCall } from '../../context/CallContext';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '../ui/Avatar';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../hooks/useFriends';

export const IncomingCallModal: React.FC = () => {
    const { incomingCall, acceptCall, declineCall, isRinging } = useCall();
    const { t } = useTranslation();
    const [callerProfile, setCallerProfile] = useState<Profile | null>(null);

    useEffect(() => {
        if (incomingCall?.caller_id) {
            supabase
                .from('profiles')
                .select('*')
                .eq('id', incomingCall.caller_id)
                .single()
                .then(({ data }) => setCallerProfile(data));
        }
    }, [incomingCall?.caller_id]);

    if (!isRinging || !incomingCall) return null;

    return createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[10000] flex items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-md"
            >
                <motion.div
                    initial={{ scale: 0.9, y: 100, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.9, y: 100, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="liquid-glass w-full h-full md:h-auto md:max-w-md md:rounded-[3rem] p-8 md:p-12 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)] border-white/10 flex flex-col items-center justify-center md:justify-start relative overflow-hidden"
                >
                    {/* Atmospheric Glow */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-gradient-to-b from-primary/20 to-transparent pointer-events-none" />
                    <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/10 blur-[100px] rounded-full animate-pulse" />
                    <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-tertiary/10 blur-[100px] rounded-full animate-pulse delay-700" />

                    <div className="relative mb-10 pt-4">
                        <div className="absolute inset-0 bg-primary/40 rounded-full blur-3xl animate-pulse scale-150" />
                        <div className="relative z-10 p-1.5 rounded-full bg-gradient-to-br from-white/20 to-white/5 border border-white/30 shadow-2xl">
                            <Avatar
                                src={callerProfile?.avatar_url}
                                alt={callerProfile?.full_name || 'Caller'}
                                size="xl"
                                className="ring-4 ring-white/10"
                            />
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/40 ring-4 ring-black/20">
                            {incomingCall.type === 'video' ? <Video size={20} /> : <Phone size={20} />}
                        </div>
                    </div>

                    <div className="text-center relative z-10 mb-12">
                        <h2 className="text-4xl font-black text-white mb-3 uppercase italic tracking-tighter leading-none">
                            {callerProfile?.full_name || t('calls.incoming')}
                        </h2>
                        {callerProfile?.username && (
                            <p className="text-primary/60 font-black uppercase tracking-[0.3em] text-[10px] italic mb-4">
                                @{callerProfile.username}
                            </p>
                        )}
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                            <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                            <span className="text-[10px] font-black text-white/60 uppercase tracking-widest italic">
                                {incomingCall.type === 'video' ? t('calls.video_call') : t('calls.audio_call')}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-6 w-full max-w-sm relative z-10">
                        <motion.button
                            whileHover={{ scale: 1.05, y: -5 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={declineCall}
                            className="flex-1 group flex flex-col items-center gap-3"
                        >
                            <div className="w-16 h-16 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-[2rem] flex items-center justify-center transition-all duration-300 shadow-xl hover:shadow-red-500/40 border border-red-500/20">
                                <PhoneOff className="w-7 h-7" />
                            </div>
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest italic group-hover:text-red-400 transition-colors">
                                {t('common.cancel')}
                            </span>
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.05, y: -5 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={acceptCall}
                            className="flex-1 group flex flex-col items-center gap-3"
                        >
                            <div className="w-16 h-16 bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white rounded-[2rem] flex items-center justify-center transition-all duration-300 shadow-xl hover:shadow-green-500/40 border border-green-500/20">
                                <Phone className="w-7 h-7" />
                            </div>
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest italic group-hover:text-green-400 transition-colors">
                                {t('common.accept')}
                            </span>
                        </motion.button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
};
