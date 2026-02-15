import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { ThemeTogglePanel } from '../components/settings/ThemeTogglePanel';
import { LanguageTogglePanel } from '../components/settings/LanguageTogglePanel';
import { RegistrationForm } from '../components/auth/RegistrationForm';
import { LogOut, Shield, Bell, Camera, Loader2, Sparkles, Cpu, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { clsx } from 'clsx';

export const Settings = () => {
    const { t } = useTranslation();
    const { user, isGuest, signOut } = useAuth();
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [bio, setBio] = useState('');
    const [fullName, setFullName] = useState('');
    const [newUsername, setNewUsername] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchProfile = useCallback(async () => {
        if (!user) return;
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (!error && data) {
            setBio(data.bio || '');
            setFullName(data.full_name || '');
            setNewUsername(data.username || '');
            setAvatarUrl(data.avatar_url || '');
        }
        setLoading(false);
    }, [user]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleSaveProfile = async () => {
        if (!user) return;

        const { error } = await supabase
            .from('profiles')
            .update({
                bio,
                full_name: fullName,
                username: newUsername.toLowerCase().trim()
            })
            .eq('id', user.id);

        if (!error) {
            alert(t('common.save') + '!');
            fetchProfile();
        } else {
            console.error('Error updating profile:', error);
        }
    };

    const handleUploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            if (!event.target.files || event.target.files.length === 0) return;

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${user?.id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user?.id);

            if (updateError) throw updateError;
            setAvatarUrl(publicUrl);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            alert(message);
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 text-on-surface-variant/40">
                <Loader2 size={40} className="animate-spin mb-4" />
                <p className="font-black uppercase tracking-widest text-[10px]">{t('common.loading')}</p>
            </div>
        );
    }

    return (
        <div className="w-full pb-20 relative min-h-screen">
            {/* Background Atmosphere */}
            <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute top-[10%] left-[20%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[20%] right-[10%] w-[30%] h-[30%] bg-tertiary/5 rounded-full blur-[100px] animate-pulse delay-700" />
            </div>

            <header className="mb-12">
                <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-1 bg-primary rounded-full shadow-[0_0_12px_currentColor]" />
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em]"
                    >
                        {t('settings.system_access')}
                    </motion.div>
                </div>
                <h1 className="text-4xl lg:text-6xl font-black text-on-surface mb-2 uppercase italic tracking-tighter">
                    {t('settings.title')}
                </h1>
                <p className="text-on-surface-variant font-bold uppercase tracking-widest text-xs opacity-60">
                    {t('settings.subtitle')}
                </p>
            </header>

            <div className="space-y-12">
                {isGuest ? (
                    <motion.section
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative bg-surface/40 backdrop-blur-3xl rounded-[48px] p-8 lg:p-12 border border-outline-variant/20 shadow-2xl overflow-hidden"
                    >
                        <RegistrationForm />
                    </motion.section>
                ) : (
                    <motion.section
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ willChange: "transform, opacity" }}
                        className="relative group"
                    >
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 via-transparent to-tertiary/10 blur-2xl rounded-[48px] opacity-40 group-hover:opacity-100 transition-opacity" />

                        <div className="relative bg-surface/40 backdrop-blur-3xl rounded-[48px] p-8 lg:p-12 border border-outline-variant/20 shadow-2xl overflow-hidden">
                            <div className="flex flex-col lg:flex-row gap-12 items-start">
                                {/* Avatar Config */}
                                <div className="flex flex-col items-center gap-6">
                                    <div className="relative group/avatar cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                        <div className="absolute -inset-2 bg-gradient-to-tr from-primary to-tertiary rounded-full opacity-20 blur-md group-hover/avatar:opacity-40 transition-opacity" />
                                        <Avatar
                                            src={avatarUrl}
                                            alt={newUsername}
                                            size="2xl"
                                            className="ring-8 ring-surface shadow-2xl relative z-10 transition-transform group-hover/avatar:scale-105"
                                        />
                                        <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                                            <div className="bg-black/60 backdrop-blur-md p-4 rounded-full text-white shadow-xl">
                                                {uploading ? <Loader2 className="animate-spin" /> : <Camera />}
                                            </div>
                                        </div>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleUploadAvatar}
                                            className="hidden"
                                            title="Change Avatar"
                                        />
                                    </div>
                                    <div className="text-center">
                                        <h3 className="font-black text-on-surface uppercase italic tracking-tight text-xl mb-1">{t('settings.identity.title')}</h3>
                                        <p className="text-primary font-black text-[10px] uppercase tracking-[0.2em]">{t('settings.identity.subtitle')}</p>
                                    </div>
                                </div>

                                {/* Data Streams */}
                                <div className="flex-1 w-full space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <label htmlFor="fullName" className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant ml-2">{t('profile_page.full_name')}</label>
                                            <input
                                                type="text"
                                                id="fullName"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                className="w-full bg-surface/30 border border-outline-variant/20 rounded-[24px] px-6 py-4 focus:ring-2 focus:ring-primary/30 outline-none font-bold text-on-surface transition-all"
                                                placeholder={t('profile_page.placeholder_name')}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label htmlFor="username" className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant ml-2">{t('profile_page.username')}</label>
                                            <div className="relative">
                                                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-primary font-black">@</span>
                                                <input
                                                    type="text"
                                                    id="username"
                                                    value={newUsername}
                                                    onChange={(e) => setNewUsername(e.target.value)}
                                                    className="w-full bg-surface/30 border border-outline-variant/20 rounded-[24px] pl-10 pr-6 py-4 focus:ring-2 focus:ring-primary/30 outline-none font-bold text-on-surface transition-all"
                                                    placeholder={t('profile_page.placeholder_username')}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="bio" className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant ml-2">{t('profile_page.bio')}</label>
                                        <textarea
                                            id="bio"
                                            value={bio}
                                            onChange={(e) => setBio(e.target.value)}
                                            rows={3}
                                            className="w-full bg-surface/30 border border-outline-variant/20 rounded-[24px] px-6 py-4 focus:ring-2 focus:ring-primary/30 outline-none font-bold text-on-surface transition-all resize-none"
                                            placeholder={t('profile_page.placeholder_bio')}
                                        />
                                    </div>
                                    <div className="flex justify-end">
                                        <Button
                                            onClick={handleSaveProfile}
                                            className="px-10 py-4 rounded-[20px] font-black uppercase tracking-widest shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                                        >
                                            <Sparkles size={18} className="mr-2" />
                                            {t('profile_page.save_changes')}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.section>
                )}

                {/* System & Visual Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        style={{ willChange: "transform, opacity" }}
                    >
                        <ThemeTogglePanel />
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        style={{ willChange: "transform, opacity" }}
                    >
                        <LanguageTogglePanel />
                    </motion.div>
                </div>

                {/* Sub-sections nodes */}
                {!isGuest && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { icon: Bell, key: 'notifications', color: 'text-primary' },
                            { icon: Shield, key: 'privacy', color: 'text-tertiary' },
                            { icon: Cpu, key: 'account', color: 'text-amber-500' }
                        ].map((item, idx) => (
                            <motion.button
                                key={item.key}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 + (idx * 0.05) }}
                                style={{ willChange: "transform, opacity" }}
                                className="bg-surface/30 backdrop-blur-xl border border-outline-variant/10 rounded-[32px] p-6 flex items-center gap-5 hover:bg-surface/50 transition-all hover:scale-105 text-left group"
                            >
                                <div className={clsx("p-4 rounded-2xl bg-surface transition-transform group-hover:rotate-12 duration-500 shadow-lg", item.color)}>
                                    <item.icon size={24} />
                                </div>
                                <div>
                                    <h4 className="font-black uppercase tracking-tight italic text-on-surface">{t(`settings.sections.${item.key}`)}</h4>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">{t(`settings.sections.${item.key}_desc`)}</p>
                                </div>
                            </motion.button>
                        ))}
                    </div>
                )}

                {/* Danger Zone */}
                <motion.section
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                    style={{ willChange: "transform, opacity" }}
                    className="relative"
                >
                    <div className="absolute inset-0 bg-red-500/5 blur-[80px] rounded-full pointer-events-none" />
                    <div className="bg-red-500/5 border border-red-500/20 rounded-[40px] p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                        <div className="flex items-center gap-6">
                            <div className="p-4 bg-red-500/10 rounded-3xl text-red-500">
                                <Zap size={32} strokeWidth={2.5} aria-label="Danger Icon" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-red-600 uppercase italic tracking-tighter mb-1">{t('settings.danger_zone.title')}</h3>
                                <p className="text-red-500/60 font-black text-[10px] uppercase tracking-widest italic">{t('settings.danger_zone.sign_out')}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => signOut()}
                            className="w-full md:w-auto px-12 py-5 bg-red-600 text-white rounded-[24px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-red-500/20 hover:bg-red-700 hover:scale-110 active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                            <LogOut size={20} />
                            {t('settings.danger_zone.sign_out')}
                        </button>
                    </div>
                </motion.section>
            </div>
        </div>
    );
};
