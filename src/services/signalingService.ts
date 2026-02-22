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

type SignalingCallback = (event: SignalingEvent, payload: SignalingPayload) => void;
class SignalingService {
    private channel: RealtimeChannel | null = null;
    private listeners: Set<SignalingCallback> = new Set();
    private currentUserId: string | null = null;

    async subscribe(userId: string, onMessage: SignalingCallback) {
        this.listeners.add(onMessage);

        if (this.currentUserId === userId && this.channel) {
            return;
        }

        if (this.channel) {
            await this.unsubscribeAll();
        }

        this.currentUserId = userId;
        this.channel = supabase.channel(`signaling:${userId}`, {
            config: {
                broadcast: { self: false }
            }
        });

        this.channel
            .on('broadcast', { event: 'signaling' }, ({ payload }: { payload: { event: SignalingEvent; data: SignalingPayload } }) => {
                this.listeners.forEach(callback => callback(payload.event, payload.data));
            })
            .subscribe();
    }

    async send(event: SignalingEvent, payload: SignalingPayload) {
        const targetChannel = supabase.channel(`signaling:${payload.receiver_id}`);
        // We need to subscribe to the channel before we can send to it reliably
        targetChannel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await targetChannel.send({
                    type: 'broadcast',
                    event: 'signaling',
                    payload: { event, data: payload }
                });
                // Clean up the temporary channel
                supabase.removeChannel(targetChannel);
            }
        });
    }

    async unsubscribe(onMessage: SignalingCallback) {
        this.listeners.delete(onMessage);
        if (this.listeners.size === 0 && this.channel) {
            await this.unsubscribeAll();
        }
    }

    private async unsubscribeAll() {
        if (this.channel) {
            await this.channel.unsubscribe();
            this.channel = null;
        }
        this.currentUserId = null;
    }
}

export const signalingService = new SignalingService();
