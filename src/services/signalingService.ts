import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type CallType = 'audio' | 'video' | 'screen' | 'mixed';
export type CallStatus = 'ringing' | 'active' | 'ended' | 'failed' | 'declined';

export type SignalingEvent =
    | 'CALL_INIT'
    | 'CALL_ACCEPT'
    | 'CALL_DECLINE'
    | 'OFFER'
    | 'ANSWER'
    | 'ICE_CANDIDATE'
    | 'CALL_END';

export interface SignalingPayload {
    call_id: string;
    sender_id: string;
    receiver_id: string;
    type?: CallType;
    sdp?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit;
    reason?: string;
}

class SignalingService {
    private channel: RealtimeChannel | null = null;
    private onMessageCallback: ((event: SignalingEvent, payload: SignalingPayload) => void) | null = null;

    async subscribe(userId: string, onMessage: (event: SignalingEvent, payload: SignalingPayload) => void) {
        this.onMessageCallback = onMessage;

        // Subscribe to a private channel for the user
        this.channel = supabase.channel(`signaling:${userId}`, {
            config: {
                broadcast: { self: false }
            }
        });

        this.channel
            .on('broadcast', { event: 'signaling' }, ({ payload }: { payload: { event: SignalingEvent; data: SignalingPayload } }) => {
                if (this.onMessageCallback) {
                    this.onMessageCallback(payload.event, payload.data);
                }
            })
            .subscribe();
    }

    async send(event: SignalingEvent, payload: SignalingPayload) {
        // Send to the receiver's private channel
        await supabase.channel(`signaling:${payload.receiver_id}`).send({
            type: 'broadcast',
            event: 'signaling',
            payload: { event, data: payload }
        });
    }

    async unsubscribe() {
        if (this.channel) {
            await this.channel.unsubscribe();
            this.channel = null;
        }
        this.onMessageCallback = null;
    }
}

export const signalingService = new SignalingService();
