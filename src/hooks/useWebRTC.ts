import { useEffect, useRef, useState, useCallback } from 'react';
import { signalingService } from '../services/signalingService';
import type { SignalingPayload, SignalingEvent } from '../services/signalingService';
import { useAuth } from '../context/AuthContext';

const FALLBACK_ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
];

async function getIceServers() {
    try {
        const res = await fetch("/api/turn", { method: "POST" });
        if (!res.ok) throw new Error("Failed to fetch TURN credentials");
        const data = await res.json();
        return data.iceServers;
    } catch (error) {
        console.warn("Falling back to STUN servers:", error);
        return FALLBACK_ICE_SERVERS;
    }
}

export const useWebRTC = (callId: string | undefined, isCaller: boolean, receiverId: string | undefined) => {
    const { user } = useAuth();
    const pc = useRef<RTCPeerConnection | null>(null);
    const localStream = useRef<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
    const isNegotiating = useRef(false);
    const senders = useRef<{ [key: string]: RTCRtpSender }>({});

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
        senders.current = {};
    }, []);

    const createPeerConnection = useCallback(async () => {
        if (pc.current) return pc.current;

        const iceServers = await getIceServers();
        const peerConnection = new RTCPeerConnection({ iceServers });

        peerConnection.oniceconnectionstatechange = () => {
            console.log("ICE Connection State:", peerConnection.iceConnectionState);
        };
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
            if (peerConnection.connectionState === 'disconnected' || peerConnection.connectionState === 'failed') {
                cleanup();
            }
        };

        peerConnection.onnegotiationneeded = async () => {
            if (isNegotiating.current) return;
            isNegotiating.current = true;
            try {
                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);
                if (callId && user && receiverId) {
                    signalingService.send('OFFER', {
                        call_id: callId,
                        sender_id: user.id,
                        receiver_id: receiverId,
                        sdp: offer
                    });
                }
            } catch (err) {
                console.error('Negotiation failed:', err);
            } finally {
                isNegotiating.current = false;
            }
        };

        pc.current = peerConnection;
        return peerConnection;
    }, [callId, user, receiverId, cleanup]);

    const initiateOffer = useCallback(async () => {
        // Ensure PeerConnection exists for the caller
        const peerConnection = pc.current || await createPeerConnection();

        // Add tracks if they are available (from startLocalStream)
        if (localStream.current) {
            localStream.current.getTracks().forEach(track => {
                // Only add if not already added to avoid errors
                if (!senders.current[track.kind]) {
                    const sender = peerConnection.addTrack(track, localStream.current!);
                    senders.current[track.kind] = sender;
                }
            });
        }
    }, [createPeerConnection]);


    const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);

    const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
        if (pc.current && pc.current.remoteDescription && pc.current.remoteDescription.type) {
            try {
                await pc.current.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
                console.error('Error adding ICE candidate:', e);
            }
        } else {
            iceCandidateQueue.current.push(candidate);
        }
    }, []);

    const processIceCandidateQueue = useCallback(async () => {
        if (!pc.current || !pc.current.remoteDescription) return;
        while (iceCandidateQueue.current.length > 0) {
            const candidate = iceCandidateQueue.current.shift();
            if (candidate) {
                try {
                    await pc.current.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                    console.error('Error adding queued ICE candidate:', e);
                }
            }
        }
    }, []);

    const handleOffer = useCallback(async (sdp: RTCSessionDescriptionInit) => {
        if (!pc.current) await createPeerConnection();

        // Avoid setting remote description if already in have-remote-offer (duplicate signal)
        if (pc.current!.signalingState === 'have-remote-offer') return;

        try {
            await pc.current!.setRemoteDescription(new RTCSessionDescription(sdp));
            await processIceCandidateQueue();

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
        } catch (err) {
            console.error('Error handling offer:', err);
        }
    }, [callId, user, receiverId, createPeerConnection, processIceCandidateQueue]);

    const handleAnswer = useCallback(async (sdp: RTCSessionDescriptionInit) => {
        if (pc.current && pc.current.signalingState === 'have-local-offer') {
            try {
                await pc.current.setRemoteDescription(new RTCSessionDescription(sdp));
                await processIceCandidateQueue();
            } catch (err) {
                console.error('Error handling answer:', err);
            }
        }
    }, [processIceCandidateQueue]);

    useEffect(() => {
        const listener = (event: SignalingEvent, payload: SignalingPayload) => {
            if (payload.call_id !== callId) return;

            console.log(`WebRTC Hook received ${event} signal`);

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
                case 'CALL_END':
                case 'CALL_DECLINE':
                    cleanup();
                    break;
            }
        };

        signalingService.subscribe(user?.id || '', listener);
        return () => {
            signalingService.unsubscribe(listener);
        };
    }, [callId, user, handleOffer, handleAnswer, handleIceCandidate, isCaller, initiateOffer, cleanup]);

    const startLocalStream = async (type: 'audio' | 'video' | 'screen') => {
        try {
            let stream: MediaStream;
            if (type === 'screen') {
                stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            } else {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: type === 'video'
                });
            }

            if (pc.current) {
                stream.getTracks().forEach(track => {
                    if (senders.current[track.kind]) {
                        senders.current[track.kind].replaceTrack(track);
                    } else {
                        const sender = pc.current!.addTrack(track, stream);
                        senders.current[track.kind] = sender;
                    }
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
