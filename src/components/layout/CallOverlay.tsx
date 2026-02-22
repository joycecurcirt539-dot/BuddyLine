import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    Mic, MicOff, Video as VideoIcon, VideoOff,
    Monitor, PhoneOff, Maximize,
    Camera, Settings, Minimize2,
    Volume2, VolumeX
} from 'lucide-react';
import { useCall } from '../../context/CallContext';
import { useWebRTC } from '../../hooks/useWebRTC';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../hooks/useFriends';
import { clsx } from 'clsx';

export const CallOverlay: React.FC = () => {
    const { activeCall, endCall } = useCall();
    const { user } = useAuth();
    const { t } = useTranslation();
    const [remoteProfile, setRemoteProfile] = useState<Profile | null>(null);

    const isCaller = activeCall?.caller_id === user?.id;
    const receiverId = isCaller ? activeCall?.callee_id : activeCall?.caller_id;

    const {
        localStream,
        remoteStream,
        connectionState,
        startLocalStream,
        cleanup
    } = useWebRTC(activeCall?.id, isCaller, receiverId);

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    const [micEnabled, setMicEnabled] = useState(true);
    const [videoEnabled, setVideoEnabled] = useState(activeCall?.type === 'video');
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [duration, setDuration] = useState(0);
    const [mediaError, setMediaError] = useState<string | null>(null);
    const [isMuted, setIsMuted] = useState(false);

    useEffect(() => {
        if (receiverId) {
            supabase
                .from('profiles')
                .select('*')
                .eq('id', receiverId)
                .single()
                .then(({ data }) => setRemoteProfile(data));
        }
    }, [receiverId]);

    useEffect(() => {
        if (activeCall) {
            startLocalStream(activeCall.type === 'video' ? 'video' : 'audio')
                .then(stream => {
                    setMediaError(null);
                    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
                    setVideoEnabled(activeCall.type === 'video');
                })
                .catch(err => {
                    console.error('Media access failed:', err);
                    setMediaError(t('settings.devices_error', 'Could not access camera or microphone. Please check permissions.'));
                });
        }
        return () => cleanup();
    }, [activeCall, startLocalStream, cleanup, t]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (connectionState === 'connected') {
            interval = setInterval(() => setDuration(d => d + 1), 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [connectionState]);

    const formatDuration = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const toggleMic = () => {
        if (localStream.current) {
            const audioTrack = localStream.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !micEnabled;
                setMicEnabled(!micEnabled);
            }
        }
    };

    const toggleVideo = async () => {
        if (localStream.current) {
            const videoTrack = localStream.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoEnabled;
                setVideoEnabled(!videoEnabled);
            } else if (!videoEnabled) {
                try {
                    const stream = await startLocalStream('video');
                    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
                    setVideoEnabled(true);
                    setMediaError(null);
                } catch {
                    setMediaError(t('settings.devices_error'));
                }
            }
        }
    };

    const toggleScreenShare = async () => {
        if (isScreenSharing) {
            const stream = await startLocalStream('video');
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;
            setIsScreenSharing(false);
        } else {
            try {
                const stream = await startLocalStream('screen');
                if (localVideoRef.current) localVideoRef.current.srcObject = stream;
                setIsScreenSharing(true);
            } catch (e) {
                console.error('Screen share failed', e);
            }
        }
    };

    if (!activeCall) return null;

    const isRemoteVideoActive = remoteStream && remoteStream.getVideoTracks().some(t => t.enabled);

    return createPortal(
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black selection:bg-primary/30"
        >
            {/* Dynamic Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-surface/5 to-tertiary/10 scale-110" />
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        rotate: [0, 90, 0],
                        opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-1/2 -left-1/2 w-full h-full bg-primary/20 blur-[120px] rounded-full"
                />
                <motion.div
                    animate={{
                        scale: [1.2, 1, 1.2],
                        rotate: [0, -90, 0],
                        opacity: [0.2, 0.4, 0.2],
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-tertiary/20 blur-[120px] rounded-full"
                />
            </div>

            {/* Error Overlay */}
            <AnimatePresence>
                {mediaError && (
                    <motion.div
                        initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                        animate={{ opacity: 1, backdropFilter: 'blur(24px)' }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[10000] bg-black/60 flex items-center justify-center p-6 text-center"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            className="max-w-sm liquid-glass p-10 rounded-[3rem] border-red-500/30"
                        >
                            <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 ring-1 ring-red-500/20">
                                <Camera className="w-10 h-10 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.4)]" />
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-4 leading-none">{t('common.error')}</h3>
                            <p className="text-white/60 text-sm font-medium mb-10 leading-relaxed">{mediaError}</p>
                            <Button
                                variant="primary"
                                onClick={endCall}
                                className="w-full h-14 rounded-2xl font-black uppercase italic tracking-widest text-xs"
                            >
                                {t('common.close')}
                            </Button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content Area */}
            <div className="relative w-full h-full flex items-center justify-center">
                {/* Remote Video / Audio View */}
                <div className="w-full h-full relative">
                    {isRemoteVideoActive ? (
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-black/40 backdrop-blur-3xl">
                            <div className="relative mb-8">
                                <motion.div
                                    animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
                                    transition={{ duration: 3, repeat: Infinity }}
                                    className="absolute inset-0 bg-primary/30 rounded-full blur-3xl scale-150"
                                />
                                <div className="relative z-10 p-2 rounded-full bg-gradient-to-br from-white/20 to-white/5 border border-white/20 shadow-2xl">
                                    <Avatar
                                        src={remoteProfile?.avatar_url}
                                        alt={remoteProfile?.full_name || 'User'}
                                        size="xl"
                                        className="ring-4 ring-white/10"
                                    />
                                </div>
                            </div>
                            <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-2">
                                {remoteProfile?.full_name || t('calls.connecting')}
                            </h2>
                            <div className="px-5 py-2 rounded-2xl bg-white/5 border border-white/10 text-primary text-[10px] font-black uppercase tracking-[0.3em] italic animate-pulse">
                                {connectionState === 'connected' ? t('calls.audio_call_active') : t(`calls.status.${connectionState}`)}
                            </div>
                        </div>
                    )}

                    {/* Header Info Overlay */}
                    <div className="absolute top-8 left-8 right-8 flex items-start justify-between pointer-events-none">
                        <div className="flex flex-col gap-3">
                            <motion.div
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                className="liquid-glass px-5 py-2.5 rounded-2xl border-white/10 text-white text-xs font-black uppercase tracking-widest flex items-center gap-3 pointer-events-auto shadow-2xl"
                            >
                                <div className={clsx(
                                    "w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] animate-pulse",
                                    connectionState === 'connected' ? 'bg-green-500 text-green-500/50' : 'bg-yellow-500 text-yellow-500/50'
                                )} />
                                {connectionState === 'connected' ? formatDuration(duration) : t(`calls.status.${connectionState}`)}
                            </motion.div>

                            <motion.div
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.1 }}
                                className="bg-primary/20 backdrop-blur-xl px-4 py-2 rounded-2xl border border-primary/20 text-primary text-[9px] font-black uppercase tracking-[0.3em] flex items-center gap-2 shadow-xl italic"
                            >
                                <Maximize className="w-3.5 h-3.5" />
                                {t('calls.p2p_secure')}
                            </motion.div>
                        </div>

                        <div className="flex items-center gap-3 pointer-events-auto">
                            <button
                                title={t('common.minimize', 'Minimize')}
                                className="w-12 h-12 rounded-2xl liquid-glass border-white/10 text-white flex items-center justify-center hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
                            >
                                <Minimize2 size={20} />
                            </button>
                            <button
                                title={t('common.settings', 'Settings')}
                                className="w-12 h-12 rounded-2xl liquid-glass border-white/10 text-white flex items-center justify-center hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
                            >
                                <Settings size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Local Preview PIP */}
                <motion.div
                    drag
                    dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
                    whileHover={{ scale: 1.02 }}
                    className="absolute top-28 md:top-8 right-8 w-28 h-40 md:w-44 md:h-60 rounded-3xl overflow-hidden bg-black/60 border-2 border-white/20 shadow-2xl z-20 group cursor-grab active:cursor-grabbing"
                >
                    <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover scale-x-[-1]"
                    />
                    {!videoEnabled && (
                        <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center">
                            <VideoOff className="w-8 h-8 text-white/10" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-3 left-3 text-[8px] font-black text-white/60 uppercase tracking-widest italic opacity-0 group-hover:opacity-100 transition-opacity">
                        {t('common.you')}
                    </div>
                </motion.div>

                {/* Main Controls - Floating Pill */}
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 md:px-0">
                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="liquid-glass px-4 md:px-8 py-4 md:py-6 rounded-[3rem] border-white/10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)] flex items-center justify-between gap-2 md:gap-4 relative overflow-hidden"
                    >
                        {/* Background subtle pulse */}
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-tertiary/5 pointer-events-none" />

                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={toggleMic}
                            className={clsx(
                                "w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all duration-300",
                                micEnabled ? 'liquid-glass border-white/10 text-white hover:bg-white/10' : 'bg-red-500 text-white shadow-lg shadow-red-500/30 border-red-400/20'
                            )}
                        >
                            {micEnabled ? <Mic size={22} className="md:w-7 md:h-7" /> : <MicOff size={22} className="md:w-7 md:h-7" />}
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={toggleVideo}
                            className={clsx(
                                "w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all duration-300",
                                videoEnabled ? 'liquid-glass border-white/10 text-white hover:bg-white/10' : 'bg-red-500 text-white shadow-lg shadow-red-500/30 border-red-400/20'
                            )}
                        >
                            {videoEnabled ? <VideoIcon size={22} className="md:w-7 md:h-7" /> : <VideoOff size={22} className="md:w-7 md:h-7" />}
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.15, rotate: -90 }}
                            whileTap={{ scale: 0.85 }}
                            onClick={endCall}
                            className="w-14 h-14 md:w-16 md:h-16 rounded-[1.75rem] bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all duration-500 shadow-2xl shadow-red-500/60 border border-red-400/30 group"
                        >
                            <PhoneOff size={26} className="group-hover:scale-110 transition-transform md:w-8 md:h-8" />
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={toggleScreenShare}
                            title={t('calls.toggle_screen_share')}
                            className={clsx(
                                "w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all duration-300",
                                isScreenSharing ? 'bg-primary text-on-primary shadow-lg shadow-primary/30' : 'liquid-glass border-white/10 text-white hover:bg-white/10'
                            )}
                        >
                            <Monitor size={22} className="md:w-7 md:h-7" />
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setIsMuted(!isMuted)}
                            className={clsx(
                                "w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all duration-300",
                                isMuted ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'liquid-glass border-white/10 text-white hover:bg-white/10'
                            )}
                        >
                            {isMuted ? <VolumeX size={22} className="md:w-7 md:h-7" /> : <Volume2 size={22} className="md:w-7 md:h-7" />}
                        </motion.button>
                    </motion.div>
                </div>
            </div>

            {/* Connection State Fallback */}
            <AnimatePresence>
                {connectionState === 'failed' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/90 backdrop-blur-2xl flex items-center justify-center z-[11000]"
                    >
                        <div className="text-center max-w-sm px-8">
                            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8 ring-1 ring-red-500/20">
                                <PhoneOff className="w-10 h-10 text-red-500" />
                            </div>
                            <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4">{t('calls.failed')}</h3>
                            <button
                                onClick={endCall}
                                className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest text-xs shadow-xl shadow-primary/20"
                            >
                                {t('common.close')}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>,
        document.body
    );
};
