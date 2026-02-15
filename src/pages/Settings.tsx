import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { ThemeTogglePanel } from '../components/settings/ThemeTogglePanel';
import { LanguageTogglePanel } from '../components/settings/LanguageTogglePanel';
import { RegistrationForm } from '../components/auth/RegistrationForm';
import { LogOut, Shield, Bell, Camera, Loader2, Sparkles, Cpu, ArrowLeft, User as UserIcon, Palette, Globe, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { clsx } from 'clsx';

type SettingCategory = 'profile' | 'appearance' | 'system' | 'notifications' | 'privacy' | 'account' | null;

export const Settings = () => {
    const { t } = useTranslation();
    const { user, isGuest, signOut } = useAuth();
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [bio, setBio] = useState('');
    const [fullName, setFullName] = useState('');
    const [newUsername, setNewUsername] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [activeCategory, setActiveCategory] = useState<SettingCategory>(null);
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
            if (window.innerWidth < 1024) setActiveCategory(null);
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

    const categories = [
        { id: 'profile', title: t('settings.identity.title'), desc: t('settings.identity.subtitle'), icon: UserIcon, color: 'text-primary', guestHidden: false },
        { id: 'appearance', title: t('settings.visual.title'), desc: t('settings.visual.subtitle'), icon: Palette, color: 'text-tertiary', guestHidden: false },
        { id: 'system', title: t('settings.system.title'), desc: t('settings.system.subtitle'), icon: Globe, color: 'text-blue-500', guestHidden: false },
        { id: 'notifications', title: t('settings.sections.notifications'), desc: t('settings.sections.notifications_desc'), icon: Bell, color: 'text-primary', guestHidden: true },
        { id: 'privacy', title: t('settings.sections.privacy'), desc: t('settings.sections.privacy_desc'), icon: Shield, color: 'text-tertiary', guestHidden: true },
        { id: 'account', title: t('settings.sections.account'), desc: t('settings.sections.account_desc'), icon: Cpu, color: 'text-amber-500', guestHidden: true },
    ];

    const filteredCategories = isGuest ? categories.filter(c => !c.guestHidden) : categories;

    return (
        <div className="w-full pb-20 lg:pb-10 relative min-h-screen">
            {/* Desktop Header / Global Header */}
            <header className={clsx("mb-8 lg:mb-12", activeCategory && "hidden lg:block")}>
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

            {/* Mobile Back Button */}
            {activeCategory && (
                <button
                    onClick={() => setActiveCategory(null)}
                    className="lg:hidden flex items-center gap-3 mb-6 text-primary font-black uppercase tracking-widest text-xs py-2 group"
                >
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    {t('common.back')}
                </button>
            )}

            <div className="relative">
                {/* Mobile Category List */}
                <AnimatePresence mode="wait">
                    {!activeCategory ? (
                        <motion.div
                            key="categories"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="grid grid-cols-1 gap-4 lg:hidden"
                        >
                            {filteredCategories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.id as SettingCategory)}
                                    className="bg-surface/40 backdrop-blur-xl border border-outline-variant/10 rounded-[32px] p-5 flex items-center justify-between group active:scale-95 transition-all"
                                >
                                    <div className="flex items-center gap-4 text-left">
                                        <div className={clsx("p-3 rounded-2xl bg-surface shadow-md group-hover:scale-110 transition-transform", cat.color)}>
                                            <cat.icon size={22} />
                                        </div>
                                        <div>
                                            <h4 className="font-black uppercase tracking-tight italic text-on-surface text-sm">{cat.title}</h4>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 leading-tight">{cat.desc}</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={20} className="text-on-surface-variant/30 group-hover:text-primary transition-colors" />
                                </button>
                            ))}

                            <div className="mt-8 border-t border-outline-variant/10 pt-8">
                                <button
                                    onClick={() => signOut()}
                                    className="w-full bg-red-500/10 border border-red-500/20 rounded-[32px] p-5 flex items-center gap-4 group active:scale-95 transition-all"
                                >
                                    <div className="p-3 rounded-2xl bg-red-500/20 text-red-500 shadow-md">
                                        <LogOut size={22} />
                                    </div>
                                    <div className="text-left">
                                        <h4 className="font-black uppercase tracking-tight italic text-red-600 text-sm">{t('settings.danger_zone.sign_out')}</h4>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-red-500/60 leading-tight italic">TERMINATE SESSION</p>
                                    </div>
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="category-content"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="lg:hidden"
                        >
                            {activeCategory === 'profile' && (
                                isGuest ? <RegistrationForm /> : (
                                    <div className="bg-surface/40 backdrop-blur-3xl rounded-[40px] p-6 border border-outline-variant/20 shadow-2xl space-y-8">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="relative cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                                <Avatar src={avatarUrl} alt={newUsername} size="2xl" className="ring-4 ring-primary/20 shadow-2xl" />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 hover:opacity-100 transition-opacity">
                                                    <Camera className="text-white" />
                                                </div>
                                                <input type="file" ref={fileInputRef} onChange={handleUploadAvatar} className="hidden" title="Avatar" />
                                            </div>
                                            <h3 className="font-black text-on-surface uppercase italic tracking-tight text-lg">{t('settings.identity.title')}</h3>
                                        </div>
                                        <div className="space-y-4">
                                            <label htmlFor="fullName-mob" className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant ml-2">{t('profile_page.full_name')}</label>
                                            <input id="fullName-mob" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-surface/30 border border-outline-variant/20 rounded-[20px] px-5 py-3.5 focus:ring-2 focus:ring-primary/30 outline-none font-bold text-on-surface" placeholder={t('profile_page.placeholder_name')} />
                                        </div>
                                        <div className="space-y-1">
                                            <label htmlFor="username-mob" className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant ml-2">{t('profile_page.username')}</label>
                                            <input id="username-mob" type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="w-full bg-surface/30 border border-outline-variant/20 rounded-[20px] px-5 py-3.5 focus:ring-2 focus:ring-primary/30 outline-none font-bold text-on-surface" placeholder={t('profile_page.placeholder_username')} />
                                        </div>
                                        <div className="space-y-1">
                                            <label htmlFor="bio-mob" className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant ml-2">{t('profile_page.bio')}</label>
                                            <textarea id="bio-mob" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="w-full bg-surface/30 border border-outline-variant/20 rounded-[20px] px-5 py-3.5 focus:ring-2 focus:ring-primary/30 outline-none font-bold text-on-surface resize-none" placeholder={t('profile_page.placeholder_bio')} />
                                        </div>
                                        <Button onClick={handleSaveProfile} className="w-full py-4 rounded-[20px] font-black uppercase tracking-widest shadow-xl">
                                            <Sparkles size={18} className="mr-2" />
                                            {t('profile_page.save_changes')}
                                        </Button>
                                    </div>
                                    </div>
                    )
                            )}
                    {activeCategory === 'appearance' && <ThemeTogglePanel />}
                    {activeCategory === 'system' && <LanguageTogglePanel />}
                    {(activeCategory === 'notifications' || activeCategory === 'privacy' || activeCategory === 'account') && (
                        <div className="bg-surface/40 backdrop-blur-3xl rounded-[40px] p-10 border border-outline-variant/20 shadow-2xl flex flex-col items-center justify-center text-center py-20">
                            <Cpu size={48} className="text-on-surface-variant/20 mb-6" />
                            <h4 className="text-on-surface font-black uppercase tracking-tight italic mb-2">{t(`settings.sections.${activeCategory}`)}</h4>
                            <p className="text-on-surface-variant/60 font-medium text-sm">{t(`settings.sections.${activeCategory}_desc`)}</p>
                            <p className="mt-4 text-primary font-black text-[10px] uppercase tracking-widest bg-primary/10 px-4 py-1.5 rounded-full">Coming Soon</p>
                        </div>
                    )}
                </motion.div>
                    )}
            </AnimatePresence>

            {/* Desktop Grid Layout (Hidden on Mobile) */}
            <div className="hidden lg:grid grid-cols-1 gap-12">
                {/* Identity Section */}
                {isGuest ? (
                    <motion.section
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative bg-surface/40 backdrop-blur-3xl rounded-[48px] p-12 border border-outline-variant/20 shadow-2xl"
                    >
                        <RegistrationForm />
                    </motion.section>
                ) : (
                    <motion.section
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative bg-surface/40 backdrop-blur-3xl rounded-[48px] p-12 border border-outline-variant/20 shadow-2xl overflow-hidden"
                    >
                        <div className="flex flex-col lg:flex-row gap-12 items-start">
                            <div className="flex flex-col items-center gap-6">
                                <div className="relative group/avatar cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                    <div className="absolute -inset-2 bg-gradient-to-tr from-primary to-tertiary rounded-full opacity-20 blur-md group-hover/avatar:opacity-40 transition-opacity" />
                                    <Avatar src={avatarUrl} alt={newUsername} size="2xl" className="ring-8 ring-surface shadow-2xl relative z-10 transition-transform group-hover/avatar:scale-105" />
                                    <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                                        <div className="bg-black/60 p-4 rounded-full text-white">{uploading ? <Loader2 className="animate-spin" /> : <Camera />}</div>
                                    </div>
                                    <input type="file" ref={fileInputRef} onChange={handleUploadAvatar} className="hidden" title="Avatar" />
                                </div>
                                <div className="text-center">
                                    <h3 className="font-black text-on-surface uppercase italic tracking-tight text-xl mb-1">{t('settings.identity.title')}</h3>
                                    <p className="text-primary font-black text-[10px] uppercase tracking-[0.2em]">{t('settings.identity.subtitle')}</p>
                                </div>
                            </div>

                            <div className="flex-1 w-full space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant ml-2">{t('profile_page.full_name')}</label>
                                        <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-surface/30 border border-outline-variant/20 rounded-[24px] px-6 py-4 focus:ring-2 focus:ring-primary/30 outline-none font-bold text-on-surface" placeholder={t('profile_page.placeholder_name')} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant ml-2">{t('profile_page.username')}</label>
                                        <div className="relative">
                                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-primary font-black">@</span>
                                            <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="w-full bg-surface/30 border border-outline-variant/20 rounded-[24px] pl-10 pr-6 py-4 focus:ring-2 focus:ring-primary/30 outline-none font-bold text-on-surface" placeholder={t('profile_page.placeholder_username')} />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant ml-2">{t('profile_page.bio')}</label>
                                    <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="w-full bg-surface/30 border border-outline-variant/20 rounded-[24px] px-6 py-4 focus:ring-2 focus:ring-primary/30 outline-none font-bold text-on-surface resize-none" placeholder={t('profile_page.placeholder_bio')} />
                                </div>
                                <div className="flex justify-end">
                                    <Button onClick={handleSaveProfile} className="px-10 py-4 rounded-[20px] font-black uppercase tracking-widest shadow-2xl shadow-primary/20 transition-all">
                                        <Sparkles size={18} className="mr-2" />
                                        {t('profile_page.save_changes')}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </motion.section>
                )}

                {/* Desktop Panels */}
                <div className="grid grid-cols-2 gap-8">
                    <ThemeTogglePanel />
                    <LanguageTogglePanel />
                </div>

                {!isGuest && (
                    <div className="grid grid-cols-3 gap-6">
                        {filteredCategories.slice(3).map((item) => (
                            <button key={item.id} className="bg-surface/30 backdrop-blur-xl border border-outline-variant/10 rounded-[32px] p-6 flex items-center gap-5 hover:bg-surface/50 transition-all text-left group">
                                <div className={clsx("p-4 rounded-2xl bg-surface shadow-lg group-hover:rotate-12 duration-500", item.color)}>
                                    <item.icon size={24} />
                                </div>
                                <div>
                                    <h4 className="font-black uppercase tracking-tight italic text-on-surface">{item.title}</h4>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 leading-tight">{item.desc}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Logout Desktop */}
                <button
                    onClick={() => signOut()}
                    className="bg-red-500/5 border border-red-500/20 rounded-[40px] p-8 flex items-center justify-between group hover:bg-red-500/10 transition-all"
                >
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-red-500/10 rounded-3xl text-red-500 group-hover:scale-110 transition-transform"><LogOut size={32} /></div>
                        <div>
                            <h3 className="text-xl font-black text-red-600 uppercase italic tracking-tighter shadow-red-500/20">{t('settings.danger_zone.sign_out')}</h3>
                            <p className="text-red-500/60 font-black text-[10px] uppercase tracking-widest italic leading-tight">TERMINATE CURRENT UPLINK SESSION</p>
                        </div>
                    </div>
                    <ChevronRight className="text-red-500/20 group-hover:translate-x-2 transition-transform" size={40} />
                </button>
            </div>
        </div>
        </div >
    );
};
