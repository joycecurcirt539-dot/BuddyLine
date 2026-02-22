import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { signalingService } from '../services/signalingService';
import { soundService } from '../services/soundService';
import type { SignalingPayload, SignalingEvent, CallType, CallStatus } from '../services/signalingService';
import { supabase } from '../lib/supabase';

interface CallContextType {
    activeCall: CallData | null;
    initiateCall: (receiverId: string, type: CallType) => Promise<void>;
    acceptCall: () => Promise<void>;
    declineCall: () => Promise<void>;
    endCall: () => Promise<void>;
    isRinging: boolean;
    incomingCall: CallData | null;
}

interface CallData {
    id: string;
    caller_id: string;
    callee_id: string;
    type: CallType;
    status: CallStatus;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [activeCall, setActiveCall] = useState<CallData | null>(null);
    const [incomingCall, setIncomingCall] = useState<CallData | null>(null);
    const [isRinging, setIsRinging] = useState(false);

    const handleSignaling = useCallback(async (event: SignalingEvent, payload: SignalingPayload) => {
        console.log('Call signaling received:', event, payload);
        switch (event) {
            case 'CALL_INIT':
                setIncomingCall({
                    id: payload.call_id,
                    caller_id: payload.sender_id,
                    callee_id: payload.receiver_id,
                    type: payload.type || 'audio',
                    status: 'ringing'
                });
                setIsRinging(true);
                soundService.play('ringing');
                break;
            case 'CALL_ACCEPT':
                soundService.stopAll();
                soundService.play('connected');
                break;
            case 'CALL_DECLINE':
            case 'CALL_END':
                soundService.stopAll();
                soundService.play('disconnected');
                setActiveCall(null);
                setIncomingCall(null);
                setIsRinging(false);
                break;
        }
    }, []); // Empty dependencies to keep it stable

    useEffect(() => {
        if (user) {
            console.log('Subscribing to signaling for user:', user.id);
            signalingService.subscribe(user.id, handleSignaling);
        }
        return () => {
            if (user) signalingService.unsubscribe(handleSignaling);
        };
    }, [user, handleSignaling]);

    const initiateCall = async (receiverId: string, type: CallType) => {
        if (!user) return;

        // 1. Create call in DB
        const { data: call, error } = await supabase
            .from('calls')
            .insert({
                caller_id: user.id,
                callee_id: receiverId,
                type,
                status: 'ringing'
            })
            .select()
            .single();

        if (error || !call) {
            console.error('Failed to create call:', error);
            return;
        }

        const callData: CallData = call;
        setActiveCall(callData);
        soundService.play('calling');

        // 2. Send CALL_INIT signal
        await signalingService.send('CALL_INIT', {
            call_id: callData.id,
            sender_id: user.id,
            receiver_id: receiverId,
            type
        });
    };

    const acceptCall = async () => {
        if (!incomingCall || !user) return;

        // 1. Update DB
        await supabase
            .from('calls')
            .update({ status: 'active', started_at: new Date().toISOString() })
            .eq('id', incomingCall.id);

        setActiveCall({ ...incomingCall, status: 'active' });
        setIncomingCall(null);
        setIsRinging(false);
        soundService.stopAll();
        soundService.play('connected');

        // 2. Send CALL_ACCEPT signal
        await signalingService.send('CALL_ACCEPT', {
            call_id: incomingCall.id,
            sender_id: user.id,
            receiver_id: incomingCall.caller_id
        });
    };

    const declineCall = async () => {
        if (!incomingCall || !user) return;

        await supabase
            .from('calls')
            .update({ status: 'declined', ended_at: new Date().toISOString() })
            .eq('id', incomingCall.id);

        await signalingService.send('CALL_DECLINE', {
            call_id: incomingCall.id,
            sender_id: user.id,
            receiver_id: incomingCall.caller_id
        });

        setIncomingCall(null);
        setIsRinging(false);
        soundService.stopAll();
        soundService.play('disconnected');
    };

    const endCall = async () => {
        const callToEnd = activeCall || incomingCall;
        if (!callToEnd || !user) return;

        const receiverId = user.id === callToEnd.caller_id ? callToEnd.callee_id : callToEnd.caller_id;

        // Calculate duration if started
        let duration = 0;
        const endTime = new Date();

        // Fetch the started_at time if not in state (though it should be for active calls)
        const { data: currentCall } = await supabase
            .from('calls')
            .select('started_at')
            .eq('id', callToEnd.id)
            .single();

        if (currentCall?.started_at) {
            const startTime = new Date(currentCall.started_at);
            duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
        }

        await supabase
            .from('calls')
            .update({
                status: 'ended',
                ended_at: endTime.toISOString(),
                duration_seconds: duration > 0 ? duration : 0
            })
            .eq('id', callToEnd.id);

        await signalingService.send('CALL_END', {
            call_id: callToEnd.id,
            sender_id: user.id,
            receiver_id: receiverId
        });

        setActiveCall(null);
        setIncomingCall(null);
        setIsRinging(false);
        soundService.stopAll();
        soundService.play('disconnected');
    };

    return (
        <CallContext.Provider value={{
            activeCall,
            initiateCall,
            acceptCall,
            declineCall,
            endCall,
            isRinging,
            incomingCall
        }}>
            {children}
        </CallContext.Provider>
    );
};

export const useCall = () => {
    const context = useContext(CallContext);
    if (context === undefined) {
        throw new Error('useCall must be used within a CallProvider');
    }
    return context;
};
