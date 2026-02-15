import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Mail, Lock, User, AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const RegistrationForm = ({ onSuccess }: { onSuccess?: () => void }) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [fullName, setFullName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (password !== passwordConfirm) {
                throw new Error(t('login_page.errors.passwords_mismatch'));
            }

            const cleanUsername = username.toLowerCase().trim();

            // Check if username already exists in profiles
            const { data: existing, error: checkError } = await supabase
                .from('profiles')
                .select('username')
                .eq('username', cleanUsername)
                .maybeSingle();

            if (checkError) throw checkError;
            if (existing) {
                throw new Error(t('login_page.errors.already_exists'));
            }

            const { error: signUpError, data } = await supabase.auth.signUp({
                email: email.toLowerCase().trim(),
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

                setMessage(t('login_page.errors.check_email'));
                setEmail('');
                setFullName('');
                setUsername('');
                setPassword('');
                setPasswordConfirm('');
                if (onSuccess) onSuccess();
            }
        } catch (error: unknown) {
            const err = error as Error;
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full space-y-6">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-black text-primary uppercase italic tracking-tight">{t('login_page.create_account')}</h2>
                <p className="text-on-surface-variant font-medium text-sm mt-1">{t('login_page.join_circle')}</p>
            </div>

            {error && (
                <div className="bg-error/10 text-error p-4 rounded-2xl flex items-center text-sm border border-error/20 font-bold">
                    <AlertCircle size={18} className="mr-3 flex-shrink-0" />
                    {error}
                </div>
            )}

            {message && (
                <div className="bg-primary/10 text-primary p-4 rounded-2xl flex items-start text-sm border border-primary/20 font-bold shadow-lg shadow-primary/5">
                    <Mail size={18} className="mr-3 mt-0.5 flex-shrink-0" />
                    {message}
                </div>
            )}

            <form onSubmit={handleSignUp} className="space-y-4">
                <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors">
                        <User size={20} />
                    </div>
                    <input
                        type="text"
                        required
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
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder={t('login_page.username')}
                        className="w-full pl-12 pr-4 py-3.5 bg-surface-container rounded-2xl border border-outline/10 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold text-on-surface h-14 text-sm"
                    />
                </div>

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

                <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors">
                        <Lock size={20} />
                    </div>
                    <input
                        type="password"
                        required
                        value={passwordConfirm}
                        onChange={(e) => setPasswordConfirm(e.target.value)}
                        placeholder={t('login_page.confirm_password')}
                        className="w-full pl-12 pr-4 py-3.5 bg-surface-container rounded-2xl border border-outline/10 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold text-on-surface h-14"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary text-on-primary py-3.5 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-primary/20 mt-4 h-14"
                >
                    {loading ? (
                        <div className="flex items-center justify-center gap-2">
                            <Loader2 className="animate-spin" size={20} />
                            {t('login_page.please_wait')}
                        </div>
                    ) : (
                        t('login_page.create_account')
                    )}
                </button>
            </form>
        </div>
    );
};
