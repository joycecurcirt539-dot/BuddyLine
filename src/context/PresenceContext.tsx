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

    useEffect(() => {
        if (!user) {
            setOnlineUsers(prev => prev.size === 0 ? prev : new Set());
            return;
        }

        // 1. Update own status to 'online' in DB when connecting
        const updateStatus = async (status: 'online' | 'offline') => {
            const lastSeen = new Date().toISOString();
            await supabase
                .from('profiles')
                .update({
                    status,
                    last_seen: lastSeen
                })
                .eq('id', user.id);
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

        channel
            .on('presence', { event: 'sync' }, () => {
                const newState = channel.presenceState();
                const users = new Set(Object.keys(newState));
                setOnlineUsers(users);
            })
            .on('presence', { event: 'join' }, ({ key }) => {
                setOnlineUsers(prev => {
                    const next = new Set(prev);
                    next.add(key);
                    return next;
                });
            })
            .on('presence', { event: 'leave' }, ({ key }) => {
                setOnlineUsers(prev => {
                    const next = new Set(prev);
                    next.delete(key);
                    return next;
                });
            })
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
    }, [user]);

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
