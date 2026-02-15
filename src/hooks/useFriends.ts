import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface Profile {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
    status: 'online' | 'offline';
}

export interface FriendRequest {
    id: string;
    user_id: string;
    friend_id: string;
    status: 'pending' | 'accepted' | 'blocked';
    created_at: string;
    sender: Profile;
}

export const useFriends = () => {
    const { user } = useAuth();
    const [friends, setFriends] = useState<Profile[]>([]);
    const [requests, setRequests] = useState<FriendRequest[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAll = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        try {
            const [friendsRes, requestsRes] = await Promise.all([
                supabase
                    .from('friendships')
                    .select('*, friend:friend_id(*), initiator:user_id(*)')
                    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
                    .eq('status', 'accepted'),
                supabase
                    .from('friendships')
                    .select('*, sender:user_id(*)')
                    .eq('friend_id', user.id)
                    .eq('status', 'pending')
            ]);

            if (friendsRes.error) throw friendsRes.error;
            if (requestsRes.error) throw requestsRes.error;

            const friendsList = (friendsRes.data || [])
                .map((f) =>
                    f.user_id === user.id ? f.friend : f.initiator
                )
                .filter(Boolean);

            const validRequests = (requestsRes.data || [])
                .filter((req) => req.sender);

            setFriends(friendsList);
            setRequests(validRequests);
        } catch (err) {
            console.error('Error fetching friends data:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const sendRequest = async (username: string) => {
        if (!user) return { error: 'Not logged in' };

        const searchName = username.toLowerCase().trim();
        if (!searchName) return { error: 'Please enter a username' };

        const { data: foundUser, error: searchError } = await supabase
            .from('profiles')
            .select('id, username')
            .eq('username', searchName)
            .maybeSingle();

        if (searchError || !foundUser) return { error: `User @${searchName} not found` };
        if (foundUser.id === user.id) return { error: 'Cannot add yourself' };

        const { data: existing } = await supabase
            .from('friendships')
            .select('*')
            .or(`and(user_id.eq.${user.id},friend_id.eq.${foundUser.id}),and(user_id.eq.${foundUser.id},friend_id.eq.${user.id})`)
            .maybeSingle();

        if (existing) return { error: 'already_exists' };

        const { error: insertError } = await supabase
            .from('friendships')
            .insert([{ user_id: user.id, friend_id: foundUser.id }]);

        if (insertError) return { error: insertError.message };
        return { success: true };
    };

    const acceptRequest = async (id: string) => {
        const { error } = await supabase
            .from('friendships')
            .update({ status: 'accepted' })
            .eq('id', id);

        if (!error) {
            fetchAll();
        }
    };

    const rejectRequest = async (id: string) => {
        const { error } = await supabase
            .from('friendships')
            .delete()
            .eq('id', id);

        if (!error) {
            fetchAll();
        }
    };

    const blockUser = async (friendId: string) => {
        if (!user) return { error: 'Not logged in' };

        const { error } = await supabase
            .from('friendships')
            .upsert({
                user_id: user.id,
                friend_id: friendId,
                status: 'blocked'
            }, { onConflict: 'user_id,friend_id' });

        if (error) {
            console.error('Error blocking user:', error);
            return { error: error.message };
        }

        await fetchAll();
        return { success: true };
    };

    return {
        friends,
        requests,
        loading,
        sendRequest,
        acceptRequest,
        rejectRequest,
        blockUser,
        refresh: fetchAll
    };
};
