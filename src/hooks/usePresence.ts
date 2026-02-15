import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export const usePresence = () => {
    const { user } = useAuth();
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const channelRef = useRef<RealtimeChannel | null>(null);

    useEffect(() => {
        if (!user) return;

        // 1. Update own status to 'online' in DB when connecting
        const updateStatus = async (status: 'online' | 'offline') => {
            await supabase
                .from('profiles')
                .update({
                    status,
                    last_seen: new Date().toISOString()
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
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                console.log('join', key, newPresences);
                setOnlineUsers(prev => {
                    const next = new Set(prev);
                    next.add(key);
                    return next;
                });
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                console.log('leave', key, leftPresences);
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
            updateStatus('offline'); // Ideally use navigator.sendBeacon for reliability on close
            channel.unsubscribe();
        };
    }, [user]);

    return { onlineUsers };
};
