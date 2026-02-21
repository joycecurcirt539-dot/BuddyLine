/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface PresenceContextType {
    onlineUsers: Set<string>;
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined);

export const PresenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const channelRef = useRef<RealtimeChannel | null>(null);
    const lastStatusRef = useRef<'online' | 'offline' | null>(null);

    useEffect(() => {
        if (!user) {
            // Use a small delay or check to avoid sync render warning
            const timer = setTimeout(() => {
                setOnlineUsers(new Set());
            }, 0);
            return () => clearTimeout(timer);
        }

        // 1. Update own status to 'online' in DB when connecting
        const updateStatus = async (status: 'online' | 'offline') => {
            if (lastStatusRef.current === status) return;
            lastStatusRef.current = status;

            try {
                const lastSeen = new Date().toISOString();
                await supabase
                    .from('profiles')
                    .update({
                        status,
                        last_seen: lastSeen
                    })
                    .eq('id', user.id);
            } catch (err) {
                console.error('Error updating status:', err);
            }
        };

        updateStatus('online');

        // 2. Subscribe to Presence channel
        const channel = supabase.channel('online-users', {
            config: {
                presence: {
                    key: user.id,
                },
            },
        });

        // Use a ref to store the latest users to avoid rapid state updates during sync/join/leave bursts
        let presencePending = false;
        const syncUsers = () => {
            if (presencePending) return;
            presencePending = true;

            // Small delay to batch multiple presence events
            setTimeout(() => {
                const newState = channel.presenceState();
                const users = new Set(Object.keys(newState));
                setOnlineUsers(users);
                presencePending = false;
            }, 100);
        };

        channel
            .on('presence', { event: 'sync' }, syncUsers)
            .on('presence', { event: 'join' }, syncUsers)
            .on('presence', { event: 'leave' }, syncUsers)
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({ online_at: new Date().toISOString() });
                }
            });

        channelRef.current = channel;

        // Cleanup
        return () => {
            updateStatus('offline');
            channel.unsubscribe();
        };
    }, [user?.id]); // Only re-subscribe if user ID changes

    return (
        <PresenceContext.Provider value={{ onlineUsers }}>
            {children}
        </PresenceContext.Provider>
    );
};

export const usePresenceContext = () => {
    const context = useContext(PresenceContext);
    if (context === undefined) {
        throw new Error('usePresenceContext must be used within a PresenceProvider');
    }
    return context;
};
