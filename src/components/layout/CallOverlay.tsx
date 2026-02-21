import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    Mic, MicOff, Video as VideoIcon, VideoOff,
    Monitor, PhoneOff, Maximize,
    Camera, Settings
} from 'lucide-react';
import { useCall } from '../../context/CallContext';
import { useWebRTC } from '../../hooks/useWebRTC';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

export const CallOverlay: React.FC = () => {
    const { activeCall, endCall } = useCall();
    const { user } = useAuth();
    const { t } = useTranslation();

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

    useEffect(() => {
        if (activeCall) {
            // No need to setMediaError(null) here if we do it conditionally or let it be
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

    return createPortal(
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-4"
        >
            {mediaError && (
                <div className="absolute inset-0 z-[10000] bg-black/90 flex items-center justify-center p-6 text-center">
                    <div className="max-w-xs">
                        <Camera className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <p className="text-white text-lg font-bold mb-4">{mediaError}</p>
                        <button
                            onClick={endCall}
                            className="w-full bg-primary text-white py-3 rounded-2xl font-bold"
                        >
                            {t('common.close')}
                        </button>
                    </div>
                </div>
            )}
            <div className="absolute inset-0 bg-surface flex items-center justify-center overflow-hidden">
                {activeCall.type === 'video' || remoteStream?.getVideoTracks().length ? (
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="flex flex-col items-center">
                        <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                            <PhoneOff className="w-16 h-16 text-primary" />
                        </div>
                        <p className="text-white text-xl font-medium">{t('calls.audio_call_active')}</p>
                    </div>
                )}

                <div className="absolute top-6 left-6 flex flex-col gap-2">
                    <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white text-sm flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${connectionState === 'connected' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                        {connectionState === 'connected' ? formatDuration(duration) : t(`calls.status.${connectionState}`)}
                    </div>
                    <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-white/80 text-xs flex items-center gap-2">
                        <Maximize className="w-3 h-3" />
                        {t('calls.p2p_secure')}
                    </div>
                </div>
            </div>

            <motion.div
                drag
                dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
                className="absolute top-6 right-6 w-32 h-44 sm:w-48 sm:h-64 rounded-2xl overflow-hidden bg-surface-elevated border-2 border-white/20 shadow-2xl z-10"
            >
                <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover scale-x-[-1]"
                />
                {!videoEnabled && (
                    <div className="absolute inset-0 bg-surface-elevated flex items-center justify-center">
                        <VideoOff className="w-8 h-8 text-white/20" />
                    </div>
                )}
            </motion.div>

            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/40 backdrop-blur-xl px-8 py-5 rounded-[2.5rem] border border-white/10 shadow-2xl">
                <button
                    onClick={toggleMic}
                    title={micEnabled ? t('chat.actions.mute') : t('chat.actions.unmute')}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${micEnabled ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500 text-white'}`}
                >
                    {micEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                    <span className="sr-only">{micEnabled ? t('chat.actions.mute') : t('chat.actions.unmute')}</span>
                </button>

                <button
                    onClick={toggleVideo}
                    title={videoEnabled ? t('chat.actions.video_call') : t('chat.actions.video_call')}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${videoEnabled ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500 text-white'}`}
                >
                    {videoEnabled ? <VideoIcon className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                    <span className="sr-only">{videoEnabled ? t('chat.actions.video_call') : t('chat.actions.video_call')}</span>
                </button>

                <button
                    onClick={toggleScreenShare}
                    title={t('calls.toggle_screen_share')}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isScreenSharing ? 'bg-primary text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                    <Monitor className="w-6 h-6" />
                    <span className="sr-only">{t('calls.toggle_screen_share')}</span>
                </button>

                <button
                    onClick={endCall}
                    title={t('common.close')}
                    className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all shadow-lg shadow-red-500/20"
                >
                    <PhoneOff className="w-7 h-7" />
                    <span className="sr-only">{t('common.close')}</span>
                </button>

                <div className="w-px h-8 bg-white/10 mx-2" />

                <button title={t('calls.camera_settings')} className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all">
                    <Camera className="w-6 h-6" />
                    <span className="sr-only">{t('calls.camera_settings')}</span>
                </button>

                <button title={t('common.settings')} className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all">
                    <Settings className="w-6 h-6" />
                    <span className="sr-only">{t('common.settings')}</span>
                </button>
            </div>

            {connectionState === 'failed' && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="text-center">
                        <p className="text-white text-xl mb-4">{t('calls.failed')}</p>
                        <button onClick={endCall} className="bg-primary px-6 py-2 rounded-full text-white">
                            {t('common.close')}
                        </button>
                    </div>
                </div>
            )}
        </motion.div>,
        document.body
    );
};
