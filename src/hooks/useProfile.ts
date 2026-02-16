import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface Profile {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
    website?: string;
    bio?: string;
    updated_at?: string;
    is_verified?: boolean;
}

export function useProfile() {
    const { user, isGuest } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || isGuest) {
            setProfile(null);
            setLoading(false);
            return;
        }

        let isMounted = true;

        const fetchProfile = async () => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (error) {
                    console.error('Error fetching profile:', error);
                } else if (isMounted) {
                    setProfile(data);
                }
            } catch (error) {
                console.error('Error in fetchProfile:', error);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchProfile();

        // Subscribe to realtime changes
        const subscription = supabase
            .channel(`profile:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${user.id}`,
                },
                (payload) => {
                    if (isMounted) {
                        setProfile(payload.new as Profile);
                    }
                }
            )
            .subscribe();

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [user, isGuest]);

    return { profile, loading };
}
