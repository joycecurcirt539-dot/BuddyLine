import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, Lock, User, AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

export const Login = () => {
    const { t } = useTranslation();
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [fullName, setFullName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const { continueAsGuest } = useAuth();
    const navigate = useNavigate();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                navigate('/');
            } else {
                // Signup Validation
                if (password !== passwordConfirm) {
                    throw new Error(t('login_page.errors.passwords_mismatch'));
                }

                const cleanUsername = username.toLowerCase().trim();

                // Check if username already exists in profiles
                const { data: existing, error: checkError } = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('username', cleanUsername) // Only check for username
                    .maybeSingle();

                if (checkError) throw checkError;
                if (existing) {
                    throw new Error(t('login_page.errors.already_exists'));
                }

                const { error: signUpError, data } = await supabase.auth.signUp({
                    email: email.toLowerCase().trim(), // Email is still used for auth.signUp
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                            username: cleanUsername
                        },
                    },
                });
                if (signUpError) throw signUpError;

                if (data.user) {
                    const { error: profileError } = await supabase
                        .from('profiles')
                        .insert([
                            {
                                id: data.user.id,
                                username: cleanUsername,
                                full_name: fullName,
                                status: 'online'
                            }
                        ]);
                    if (profileError) console.error('Error creating profile:', profileError);

                    // Show success message and switch to login
                    setMessage(t('login_page.errors.check_email'));
                    setIsLogin(true);
                    setEmail('');
                    setPassword('');
                    setUsername('');
                    setFullName('');
                    setPasswordConfirm('');
                }
            }
        } catch (error: unknown) {
            const err = error as Error;
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-surface flex items-center justify-center p-4 transition-colors duration-300">
            <div className="w-full max-w-md">
                <div className="bg-surface p-8 rounded-3xl shadow-xl border border-outline/10">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-primary mb-2 tracking-tighter">{t('sidebar.buddyline')}</h1>
                        <p className="text-on-surface-variant font-medium">
                            {isLogin ? t('login_page.welcome') : t('login_page.join_circle')}
                        </p>
                    </div>

                    {error && (
                        <div className="bg-error/10 text-error p-3 rounded-2xl mb-6 flex items-center text-sm border border-error/20 font-bold">
                            <AlertCircle size={16} className="mr-2 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="bg-primary/10 text-primary p-4 rounded-2xl mb-6 flex items-start text-sm border border-primary/20 font-bold shadow-lg shadow-primary/5">
                            <Mail size={18} className="mr-3 mt-0.5 flex-shrink-0" />
                            {message}
                        </div>
                    )}

                    <form onSubmit={handleAuth} className="space-y-4">
                        {!isLogin && (
                            <>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors">
                                        <User size={20} />
                                    </div>
                                    <input
                                        type="text"
                                        required={!isLogin}
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder={t('login_page.full_name')}
                                        className="w-full pl-12 pr-4 py-3.5 bg-surface-container rounded-2xl border border-outline/10 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold text-on-surface h-14"
                                    />
                                </div>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors">
                                        <span className="font-black text-lg">@</span>
                                    </div>
                                    <input
                                        type="text"
                                        required={!isLogin}
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder={t('login_page.username')}
                                        className="w-full pl-12 pr-4 py-3.5 bg-surface-container rounded-2xl border border-outline/10 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold text-on-surface h-14"
                                    />
                                </div>
                            </>
                        )}
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors">
                                <Mail size={20} />
                            </div>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={t('login_page.email')}
                                className="w-full pl-12 pr-4 py-3.5 bg-surface-container rounded-2xl border border-outline/10 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold text-on-surface h-14"
                            />
                        </div>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors">
                                <Lock size={20} />
                            </div>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={t('login_page.password')}
                                className="w-full pl-12 pr-4 py-3.5 bg-surface-container rounded-2xl border border-outline/10 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold text-on-surface h-14"
                            />
                        </div>
                        {!isLogin && (
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors">
                                    <Lock size={20} />
                                </div>
                                <input
                                    type="password"
                                    required={!isLogin}
                                    value={passwordConfirm}
                                    onChange={(e) => setPasswordConfirm(e.target.value)}
                                    placeholder={t('login_page.confirm_password')}
                                    className="w-full pl-12 pr-4 py-3.5 bg-surface-container rounded-2xl border border-outline/10 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold text-on-surface h-14"
                                />
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary text-on-primary py-3.5 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-primary/20 mt-4 h-14"
                        >
                            {loading ? <div className="flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={20} /> {t('login_page.please_wait')}</div> : (isLogin ? t('login_page.sign_in') : t('login_page.create_account'))}
                        </button>
                    </form>

                    <div className="mt-4">
                        <button
                            onClick={() => {
                                continueAsGuest();
                                navigate('/');
                            }}
                            className="w-full bg-surface-container-high text-on-surface py-3.5 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all border border-outline/10 h-14"
                        >
                            {t('login_page.continue_as_guest')}
                        </button>
                    </div>

                    <div className="mt-8 text-center">
                        <p className="text-on-surface-variant text-sm font-bold">
                            {isLogin ? t('login_page.no_account') : t('login_page.already_member')}
                            <button
                                onClick={() => {
                                    setIsLogin(!isLogin);
                                    setError(null);
                                }}
                                className="text-primary font-black hover:underline ml-1"
                            >
                                {isLogin ? t('login_page.sign_up') : t('login_page.sign_in')}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
