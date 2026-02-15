import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { clsx } from 'clsx';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { PostCard } from '../components/feed/PostCard';
import type { Post } from '../components/feed/PostCard';
import { Edit2, Calendar, Sparkles, Camera, Loader2, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { enUS, ru } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { useChat } from '../hooks/useChat';
import { UserBadge } from '../components/ui/UserBadge';
import { usePresence } from '../hooks/usePresence';

interface ProfileData {
    id: string;
    username: string;
    full_name?: string;
    avatar_url?: string;
    bio?: string;
    created_at?: string;
    status?: string;
    last_seen?: string | null;
    is_verified?: boolean;
}

export const Profile = () => {
    const { t, i18n } = useTranslation();
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { createDirectChat } = useChat();
    const { onlineUsers } = usePresence();

    // Determine if we're viewing our own profile
    const isOwnProfile = !id || id === user?.id;
    const targetUserId = id || user?.id;

    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [bio, setBio] = useState('');
    const [fullName, setFullName] = useState('');
    const [newUsername, setNewUsername] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchProfile = useCallback(async () => {
        if (!targetUserId) {
            setLoading(false);
            return;
        }

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', targetUserId)
            .single();

        if (!error && data) {
            setProfile(data);
            if (isOwnProfile) {
                setBio(data.bio || '');
                setFullName(data.full_name || '');
                setNewUsername(data.username || '');
            }
        } else if (error && (error as { code: string }).code === 'PGRST116' && isOwnProfile) {
            // Auto-create only for own profile
            const { data: newData, error: insertError } = await supabase
                .from('profiles')
                .insert([
                    {
                        id: targetUserId,
                        username: user?.email?.split('@')[0] || 'stranger',
                        full_name: user?.user_metadata?.full_name || '',
                        status: 'online'
                    }
                ])
                .select()
                .single();

            if (!insertError && newData) {
                setProfile(newData);
                setBio(newData.bio || '');
                setFullName(newData.full_name || '');
                setNewUsername(newData.username || '');
            }
        }
        setLoading(false);
    }, [targetUserId, isOwnProfile, user]);

    const fetchUserPosts = useCallback(async () => {
        if (!targetUserId) return;

        const { data, error } = await supabase
            .from('posts')
            .select(`
        *,
        author:profiles(username, full_name, avatar_url)
      `)
            .eq('user_id', targetUserId)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setPosts(data as Post[]);
        }
    }, [targetUserId]);

    useEffect(() => {
        setLoading(true);
        fetchProfile();
        fetchUserPosts();
    }, [id, targetUserId, fetchProfile, fetchUserPosts]); // Refetch when ID changes

    const handleMessage = async () => {
        if (!profile) return;
        const result = await createDirectChat(profile.id);
        if (result.success) {
            navigate(`/chat?id=${result.chatId}`);
        }
    };

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
            setEditMode(false);
            fetchProfile();
        } else {
            if ((error as { code?: string }).code === '23505') {
                alert(t('profile_page.username_taken') || 'This username is already taken!');
            } else {
                console.error('Error updating profile:', error);
            }
        }
    };

    const handleAvatarClick = () => {
        if (editMode) {
            fileInputRef.current?.click();
        }
    };

    const handleUploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('You must select an image to upload.');
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${user?.id}/${fileName}`; // Structured path for RLS

            // Upload to 'avatars' bucket
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // Update profile
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user?.id);

            if (updateError) throw updateError;

            fetchProfile();
        } catch (error: unknown) {
            const err = error as Error;
            alert(err.message);
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return <div className="text-center py-20 text-on-surface-variant animate-pulse">{t('profile_page.loading')}</div>;
    }

    if (!profile) {
        return <div className="text-center py-20 text-on-surface-variant">{t('profile_page.not_found')}</div>;
    }

    const isUserOnline = onlineUsers.has(profile.id);
    const dateLocale = i18n.language.startsWith('ru') ? ru : enUS;

    const formatLastSeen = (dateString: string | null | undefined) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);

        if (diffMins < 1) return t('chat.status.just_now');
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="w-full space-y-4 lg:space-y-6 mb-10">
            {/* Profile Header */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ willChange: "transform, opacity" }}
                className="bg-surface-container-low rounded-[40px] shadow-2xl shadow-primary/5 border border-outline-variant/10 transition-all duration-300"
            >
                {/* Cover */}
                <div className="h-40 lg:h-56 bg-gradient-to-br from-primary via-primary/80 to-tertiary relative shadow-inner rounded-t-[40px]">
                    <div className="absolute inset-0 bg-[url('/sparkles.svg')] opacity-20 mix-blend-overlay" />
                </div>

                {/* Profile Header Content */}
                <div className="px-5 lg:px-10 pb-4 bg-surface transition-colors relative">
                    <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 -mt-16 lg:-mt-24 mb-5">
                        {/* Avatar */}
                        <div
                            className={clsx(
                                "relative group/avatar cursor-pointer transition-transform duration-500 z-20",
                                editMode ? "hover:scale-105" : "hover:scale-[1.02]"
                            )}
                            onClick={handleAvatarClick}
                        >
                            <Avatar
                                src={profile.avatar_url}
                                alt={profile.username}
                                size="2xl"
                                status={isUserOnline ? 'online' : 'offline'}
                                className={clsx(
                                    "ring-[12px] ring-surface shadow-2xl transition-all duration-500",
                                    editMode && "brightness-75 group-hover/avatar:brightness-50"
                                )}
                            />
                            {editMode && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    {uploading ? (
                                        <Loader2 size={40} className="text-white animate-spin" />
                                    ) : (
                                        <Camera size={40} className="text-white opacity-0 group-hover/avatar:opacity-100 transition-opacity" />
                                    )}
                                </div>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleUploadAvatar}
                                accept="image/*"
                                className="hidden"
                                title="Upload Avatar"
                            />
                        </div>

                        {/* Name & Username & Buttons & Bio */}
                        <div className="flex-1 flex flex-col gap-4 text-center sm:text-left">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 pb-1">
                                <div>
                                    <h1 className="text-2xl lg:text-3xl font-black text-on-surface tracking-tight leading-none mb-1 flex items-center gap-2">
                                        {profile.full_name || profile.username}
                                        <UserBadge username={profile.username} isVerified={profile.is_verified} className="mb-0.5" />
                                    </h1>
                                    <div className="flex items-center justify-center sm:justify-start gap-2">
                                        <p className="text-primary font-bold text-sm uppercase tracking-widest flex items-center gap-1.5">
                                            @{profile.username}
                                            <UserBadge username={profile.username} isVerified={profile.is_verified} />
                                        </p>
                                        <span className="text-outline-variant opacity-30">•</span>
                                        <div className="flex items-center gap-1.5">
                                            <div className={clsx("w-1.5 h-1.5 rounded-full", isUserOnline ? "bg-primary shadow-[0_0_8px_currentColor] animate-pulse" : "bg-outline-variant")} />
                                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.1em] opacity-80">
                                                {isUserOnline
                                                    ? t('chat.status.online')
                                                    : `${t('chat.status.last_seen')} ${formatLastSeen(profile.last_seen)}`}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-center sm:justify-start gap-3">
                                    {isOwnProfile ? (
                                        <Button
                                            onClick={() => setEditMode(!editMode)}
                                            variant="secondary"
                                            className="flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold shadow-md hover:scale-105 transition-all text-sm lg:text-base border-outline/10 text-on-surface"
                                        >
                                            <Edit2 size={18} />
                                            {t('profile_page.edit_profile')}
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={handleMessage}
                                            className="flex items-center gap-2 px-8 py-2.5 rounded-2xl font-black shadow-lg shadow-primary/20 hover:scale-105 transition-all text-sm lg:text-base uppercase tracking-widest"
                                        >
                                            <MessageCircle size={18} />
                                            {t('friends_page.actions.direct_chat')}
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {editMode ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="space-y-4 surface-1 p-5 rounded-3xl border border-outline/10 mb-2 text-left"
                                >
                                    <div>
                                        <label className="block text-xs font-bold text-on-surface mb-1.5 ml-1">{t('profile_page.full_name')}</label>
                                        <input
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="w-full px-4 py-2 bg-surface border border-outline/20 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-on-surface"
                                            placeholder={t('profile_page.placeholder_name')}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-on-surface mb-1.5 ml-1">{t('profile_page.username')}</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black text-lg">@</span>
                                            <input
                                                type="text"
                                                value={newUsername}
                                                onChange={(e) => setNewUsername(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 bg-surface border border-outline/20 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-on-surface font-bold"
                                                placeholder={t('profile_page.placeholder_username')}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-on-surface mb-1.5 ml-1">{t('profile_page.bio')}</label>
                                        <textarea
                                            value={bio}
                                            onChange={(e) => setBio(e.target.value)}
                                            className="w-full px-4 py-2 bg-surface border border-outline/20 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all resize-none text-on-surface"
                                            rows={2}
                                            placeholder={t('profile_page.placeholder_bio')}
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <Button onClick={handleSaveProfile} className="px-6 py-2 shadow-lg shadow-primary/20">
                                            {t('profile_page.save_changes')}
                                        </Button>
                                        <Button onClick={() => setEditMode(false)} variant="secondary" className="px-6 py-2 border-outline/10 text-on-surface">
                                            {t('common.cancel')}
                                        </Button>
                                    </div>
                                </motion.div>
                            ) : (
                                <p className="text-on-surface text-base lg:text-lg leading-relaxed max-w-2xl font-medium mx-auto sm:mx-0">
                                    {profile.bio || t('profile_page.no_bio')}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-on-surface-variant font-bold uppercase tracking-wider mt-2 px-1">
                        <div className="flex items-center gap-2">
                            <Calendar size={18} className="text-primary" />
                            <span>
                                {t('profile_page.joined')} {profile.created_at ? format(new Date(profile.created_at), 'MMMM yyyy', { locale: dateLocale }) : t('profile_page.recently')}
                            </span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Experimental Section */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                style={{ willChange: "transform, opacity" }}
                className="bg-tertiary/5 backdrop-blur-3xl rounded-[40px] p-6 lg:p-8 border border-tertiary/20 shadow-2xl shadow-tertiary/10 relative overflow-hidden group"
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-tertiary/10 rounded-full blur-[100px] -mr-32 -mt-32 animate-pulse" />

                <div className="flex items-center gap-4 mb-4 relative z-10">
                    <div className="p-3 bg-surface-container-low rounded-2xl shadow-lg ring-1 ring-tertiary/20 group-hover:rotate-12 transition-transform duration-500 relative overflow-hidden">
                        <div className="absolute inset-0 pointer-events-none opacity-50">
                            <Sparkles size={8} className="absolute top-1 left-1 text-tertiary animate-pulse" />
                            <Sparkles size={6} className="absolute bottom-2 right-1 text-tertiary animate-pulse delay-700" />
                        </div>
                        <Sparkles size={20} className="text-tertiary animate-pulse relative z-10" />
                    </div>
                    <div>
                        <h3 className="text-base lg:text-lg font-black text-on-surface uppercase tracking-tighter italic">{t('profile_page.experimental.title')}</h3>
                        <p className="text-tertiary font-black text-[10px] uppercase tracking-widest opacity-80">{t('profile_page.experimental.subtitle')}</p>
                    </div>
                </div>

                <p className="text-on-surface font-semibold text-sm mb-6 relative z-10 max-w-xl leading-relaxed">
                    {t('profile_page.experimental.desc')}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                    <div className="bg-surface/30 backdrop-blur-xl p-4 rounded-3xl border border-outline-variant/20 shadow-sm hover:bg-surface/50 transition-all cursor-wait group/item">
                        <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-2 opacity-60">{t('profile_page.experimental.custom_themes')}</p>
                        <p className="text-xl font-black text-tertiary tracking-tighter italic group-hover/item:translate-x-1 transition-transform">{t('profile_page.experimental.coming_soon')}</p>
                    </div>
                    <div className="bg-surface/30 backdrop-blur-xl p-4 rounded-3xl border border-outline-variant/20 shadow-sm hover:bg-surface/50 transition-all cursor-wait group/item">
                        <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-2 opacity-60">{t('profile_page.experimental.voice_alchemy')}</p>
                        <p className="text-xl font-black text-tertiary tracking-tighter italic group-hover/item:translate-x-1 transition-transform">{t('profile_page.experimental.in_testing')}</p>
                    </div>
                </div>
            </motion.div>

            {/* User Posts */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{ willChange: "transform, opacity" }}
                className="bg-surface-container-low rounded-[40px] shadow-2xl shadow-primary/5 border border-outline-variant/10 p-6 lg:p-10 mb-10"
            >
                <h2 className="text-xl lg:text-2xl font-black text-on-surface mb-6 uppercase tracking-tighter italic">{t('profile_page.legacy.title')}</h2>
                {posts.length === 0 ? (
                    <div className="text-center py-12 bg-surface-container rounded-3xl border border-dashed border-outline-variant/20 group hover:border-primary/40 transition-colors">
                        <p className="text-on-surface-variant text-base font-bold italic tracking-tight">{t('profile_page.legacy.empty_annals')}</p>
                        <p className="text-primary font-black mt-1 text-[10px] uppercase tracking-widest">{t('profile_page.legacy.start_journey')}</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {posts.map((post, index) => (
                            <PostCard
                                key={post.id}
                                post={post}
                                index={index}
                            />
                        ))}
                    </div>
                )}
            </motion.div>
        </div>
    );
};
