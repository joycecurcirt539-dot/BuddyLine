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
    private tableChannel: RealtimeChannel | null = null;
    private targetChannels: Map<string, RealtimeChannel> = new Map();
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

        // 1. Subscribe to Broadcast for low-latency signals (ICE, etc.)
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

        // 2. Subscribe to Table for critical signals (OFFER, ANSWER)
        this.tableChannel = supabase.channel('reliable_signaling')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'call_signals',
                filter: `receiver_id=eq.${userId}`
            }, (payload: { new: { signal_type: SignalingEvent; payload: any; sender_id: string; call_id: string; receiver_id: string } }) => {
                const signal = payload.new as { signal_type: SignalingEvent; payload: any; sender_id: string; call_id: string; receiver_id: string };
                this.listeners.forEach(callback => callback(signal.signal_type, {
                    ...signal.payload,
                    event: signal.signal_type,
                    sender_id: signal.sender_id,
                    call_id: signal.call_id,
                    receiver_id: signal.receiver_id
                }));
            })
            .subscribe();
    }

    async send(event: SignalingEvent, payload: SignalingPayload) {
        // Use table for SDP exchange to ensure delivery
        if (event === 'OFFER' || event === 'ANSWER') {
            const { error } = await supabase.from('call_signals').insert({
                call_id: payload.call_id,
                sender_id: payload.sender_id,
                receiver_id: payload.receiver_id,
                signal_type: event,
                payload: { sdp: payload.sdp }
            });
            if (error) console.error(`Error sending ${event} via table:`, error);
        }

        // Always send via broadcast for speed and as a primary/fallback path
        let targetChannel = this.targetChannels.get(payload.receiver_id);

        if (!targetChannel) {
            targetChannel = supabase.channel(`signaling:${payload.receiver_id}`);
            this.targetChannels.set(payload.receiver_id, targetChannel);

            targetChannel.subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    this.broadcastSignal(targetChannel!, event, payload);
                }
            });
        } else {
            this.broadcastSignal(targetChannel, event, payload);
        }
    }

    private async broadcastSignal(channel: RealtimeChannel, event: SignalingEvent, payload: SignalingPayload) {
        await channel.send({
            type: 'broadcast',
            event: 'signaling',
            payload: { event, data: payload }
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
        if (this.tableChannel) {
            await this.tableChannel.unsubscribe();
            this.tableChannel = null;
        }
        // Clean up target channels
        for (const channel of this.targetChannels.values()) {
            await channel.unsubscribe();
        }
        this.targetChannels.clear();
        this.currentUserId = null;
    }
}

export const signalingService = new SignalingService();
