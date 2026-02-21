/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    isGuest: boolean;
    signOut: () => Promise<void>;
    continueAsGuest: () => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
    isGuest: false,
    signOut: async () => { },
    continueAsGuest: () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [isGuest, setIsGuest] = useState(() => {
        return localStorage.getItem('buddyline_guest') === 'true';
    });

    useEffect(() => {
        // Check active sessions and sets the user
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (!isGuest) {
                setUser(session?.user ?? null);
            }
            setLoading(false);
        });

        // Listen for changes on auth state (sign in, sign out, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (!isGuest) {
                setUser(session?.user ?? null);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, [isGuest]);

    const signOut = async () => {
        setIsGuest(false);
        localStorage.removeItem('buddyline_guest');
        await supabase.auth.signOut();
    };

    const continueAsGuest = () => {
        setIsGuest(true);
        localStorage.setItem('buddyline_guest', 'true');
        // Set a mock user object for consistency
        setUser({
            id: 'guest_user',
            email: 'guest@buddyline.app',
            user_metadata: {
                full_name: 'Guest User',
                username: 'guest'
            }
        } as unknown as User);
        setLoading(false);
    };

    const value = {
        session,
        user: isGuest ? {
            id: 'guest_user',
            email: 'guest@buddyline.app',
            user_metadata: {
                full_name: 'Guest User',
                username: 'guest'
            }
        } as unknown as User : user,
        loading,
        isGuest,
        signOut,
        continueAsGuest,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
