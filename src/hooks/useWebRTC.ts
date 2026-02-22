import { useEffect, useRef, useState, useCallback } from 'react';
import { signalingService } from '../services/signalingService';
import type { SignalingPayload, SignalingEvent } from '../services/signalingService';
import { useAuth } from '../context/AuthContext';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

export const useWebRTC = (callId: string | undefined, isCaller: boolean, receiverId: string | undefined) => {
    const { user } = useAuth();
    const pc = useRef<RTCPeerConnection | null>(null);
    const localStream = useRef<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');

    const cleanup = useCallback(() => {
        if (pc.current) {
            pc.current.close();
            pc.current = null;
        }
        if (localStream.current) {
            localStream.current.getTracks().forEach(track => track.stop());
            localStream.current = null;
        }
        setRemoteStream(null);
    }, []);

    const createPeerConnection = useCallback(() => {
        const peerConnection = new RTCPeerConnection(ICE_SERVERS);

        peerConnection.onicecandidate = (event) => {
            if (event.candidate && callId && user && receiverId) {
                signalingService.send('ICE_CANDIDATE', {
                    call_id: callId,
                    sender_id: user.id,
                    receiver_id: receiverId,
                    candidate: event.candidate.toJSON()
                });
            }
        };

        peerConnection.ontrack = (event) => {
            setRemoteStream(event.streams[0]);
        };

        peerConnection.onconnectionstatechange = () => {
            setConnectionState(peerConnection.connectionState);
            if (peerConnection.connectionState === 'disconnected') {
                // Potential network drop, try to restart ICE
                peerConnection.restartIce();
            }
        };

        pc.current = peerConnection;
        return peerConnection;
    }, [callId, user, receiverId]);

    const initiateOffer = useCallback(async () => {
        if (!pc.current) createPeerConnection();

        if (localStream.current) {
            localStream.current.getTracks().forEach(track => {
                pc.current!.addTrack(track, localStream.current!);
            });
        }

        const offer = await pc.current!.createOffer();
        await pc.current!.setLocalDescription(offer);

        if (callId && user && receiverId) {
            signalingService.send('OFFER', {
                call_id: callId,
                sender_id: user.id,
                receiver_id: receiverId,
                sdp: offer
            });
        }
    }, [callId, user, receiverId, createPeerConnection]);

    const handleOffer = useCallback(async (sdp: RTCSessionDescriptionInit) => {
        if (!pc.current) createPeerConnection();
        await pc.current!.setRemoteDescription(new RTCSessionDescription(sdp));

        // Add local tracks if not added yet
        if (localStream.current) {
            localStream.current.getTracks().forEach(track => {
                pc.current!.addTrack(track, localStream.current!);
            });
        }

        const answer = await pc.current!.createAnswer();
        await pc.current!.setLocalDescription(answer);

        if (callId && user && receiverId) {
            signalingService.send('ANSWER', {
                call_id: callId,
                sender_id: user.id,
                receiver_id: receiverId,
                sdp: answer
            });
        }
    }, [callId, user, receiverId, createPeerConnection]);

    const handleAnswer = useCallback(async (sdp: RTCSessionDescriptionInit) => {
        if (pc.current) {
            await pc.current.setRemoteDescription(new RTCSessionDescription(sdp));
        }
    }, []);

    const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
        if (pc.current) {
            await pc.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
    }, []);

    useEffect(() => {
        const listener = (event: SignalingEvent, payload: SignalingPayload) => {
            if (payload.call_id !== callId) return;

            switch (event) {
                case 'OFFER':
                    if (payload.sdp) handleOffer(payload.sdp);
                    break;
                case 'ANSWER':
                    if (payload.sdp) handleAnswer(payload.sdp);
                    break;
                case 'ICE_CANDIDATE':
                    if (payload.candidate) handleIceCandidate(payload.candidate);
                    break;
                case 'CALL_ACCEPT':
                    if (isCaller) initiateOffer();
                    break;
            }
        };

        signalingService.subscribe(user?.id || '', listener);
        return () => {
            signalingService.unsubscribe(listener);
        };
    }, [callId, user, handleOffer, handleAnswer, handleIceCandidate, isCaller, initiateOffer]);

    const startLocalStream = async (type: 'audio' | 'video' | 'screen') => {
        try {
            let stream;
            if (type === 'screen') {
                stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            } else {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: type === 'video'
                });
            }
            localStream.current = stream;
            return stream;
        } catch (error) {
            console.error('Error accessing media devices:', error);
            throw error;
        }
    };

    return {
        localStream,
        remoteStream,
        connectionState,
        startLocalStream,
        cleanup
    };
};
