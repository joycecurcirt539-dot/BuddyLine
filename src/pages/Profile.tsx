import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { clsx } from 'clsx';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { PostCard } from '../components/feed/PostCard';
import type { Post } from '../components/feed/PostCard';
import { Edit2, Calendar, Sparkles, Camera, Loader2, MessageCircle, Users } from 'lucide-react';
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
        } else if (result.error) {
            // Check for specific error messages or just show the error
            if (result.error.toLowerCase().includes('friends')) {
                alert(t('chat_error.friends_only'));
            } else {
                alert(result.error);
            }
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
                className="bubble"
            >
                {/* Cover with Mesh-like Gradient */}
                <div className="h-48 lg:h-72 relative overflow-hidden rounded-t-[40px]">
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary via-tertiary to-primary opacity-90 animate-gradient-xy" />
                    <div className="absolute inset-0 bg-[url('/sparkles.svg')] opacity-30 mix-blend-overlay animate-pulse" />
                    <div className="absolute inset-0 bg-black/10" />
                    <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-surface-container-high/40 to-transparent" />
                </div>

                {/* Profile Header Content */}
                <div className="px-6 lg:px-12 pb-10 relative">
                    <div className="flex flex-col lg:flex-row items-center lg:items-end gap-8 -mt-20 lg:-mt-28 mb-8">
                        {/* Avatar Wrapper with Glow */}
                        <div
                            className={clsx(
                                "relative group/avatar cursor-pointer transition-all duration-700 z-20",
                                editMode ? "scale-105" : "hover:scale-105"
                            )}
                            onClick={handleAvatarClick}
                        >
                            <div className="absolute -inset-4 bg-primary/20 blur-3xl opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-700 rounded-full" />
                            <Avatar
                                src={profile.avatar_url}
                                alt={profile.username}
                                size="2xl"
                                status={isUserOnline ? 'online' : 'offline'}
                                className={clsx(
                                    "ring-[12px] ring-surface-container-high/60 backdrop-blur-3xl shadow-2xl transition-all duration-700",
                                    editMode && "brightness-75 group-hover/avatar:brightness-50"
                                )}
                            />
                            {editMode && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
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

                        {/* Name & Username & Stats */}
                        <div className="flex-1 flex flex-col gap-6 w-full">
                            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6">
                                <div className="text-center lg:text-left">
                                    <h1 className="text-3xl lg:text-5xl font-black text-on-surface tracking-tighter leading-none mb-3 flex items-center justify-center lg:justify-start gap-3 italic uppercase">
                                        {profile.full_name || profile.username}
                                        <UserBadge username={profile.username} isVerified={profile.is_verified} className="text-2xl" />
                                    </h1>
                                    <div className="flex items-center justify-center lg:justify-start gap-4 flex-wrap">
                                        <p className="px-4 py-1.5 bg-primary/10 text-primary font-black text-xs uppercase tracking-[0.2em] rounded-full border border-primary/20 backdrop-blur-sm">
                                            @{profile.username}
                                        </p>
                                        <div className="flex items-center gap-2 px-4 py-1.5 bg-surface-container-low/40 rounded-full border border-outline-variant/10 backdrop-blur-sm">
                                            <div className={clsx("w-2 h-2 rounded-full", isUserOnline ? "bg-primary shadow-[0_0_12px_currentColor] animate-pulse" : "bg-outline-variant")} />
                                            <span className="text-[10px] font-black text-on-surface uppercase tracking-widest">
                                                {isUserOnline
                                                    ? t('chat.status.online')
                                                    : `${t('chat.status.last_seen')} ${formatLastSeen(profile.last_seen)}`}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-center gap-3">
                                    {isOwnProfile ? (
                                        <Button
                                            onClick={() => setEditMode(!editMode)}
                                            className="px-8 py-3 rounded-2xl font-black shadow-xl shadow-primary/10 hover:scale-105 transition-all text-xs uppercase tracking-[0.2em]"
                                        >
                                            <Edit2 size={16} className="mr-2" />
                                            {t('profile_page.edit_profile')}
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={handleMessage}
                                            className="px-10 py-3 rounded-2xl font-black shadow-2xl shadow-primary/20 hover:scale-105 transition-all text-sm uppercase tracking-[0.2em]"
                                        >
                                            <MessageCircle size={20} className="mr-2" />
                                            {t('friends_page.actions.direct_chat')}
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Bio Area - Glass Card */}
                            <div className="relative group/bio">
                                {editMode ? (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="space-y-4 bg-surface-container-low/40 backdrop-blur-3xl p-6 rounded-[32px] border border-outline-variant/10"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-primary mb-2 ml-1">{t('profile_page.full_name')}</label>
                                                <input
                                                    type="text"
                                                    value={fullName}
                                                    onChange={(e) => setFullName(e.target.value)}
                                                    className="w-full px-5 py-3 bg-white/5 border border-outline/10 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all text-on-surface font-bold"
                                                    placeholder={t('profile_page.placeholder_name')}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-primary mb-2 ml-1">{t('profile_page.username')}</label>
                                                <input
                                                    type="text"
                                                    value={newUsername}
                                                    onChange={(e) => setNewUsername(e.target.value)}
                                                    className="w-full px-5 py-3 bg-white/5 border border-outline/10 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all text-on-surface font-bold"
                                                    placeholder={t('profile_page.placeholder_username')}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-primary mb-2 ml-1">{t('profile_page.bio')}</label>
                                            <textarea
                                                value={bio}
                                                onChange={(e) => setBio(e.target.value)}
                                                className="w-full px-5 py-3 bg-white/5 border border-outline/10 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none text-on-surface min-h-[100px]"
                                                placeholder={t('profile_page.placeholder_bio')}
                                            />
                                        </div>
                                        <div className="flex gap-3 justify-end">
                                            <Button onClick={() => setEditMode(false)} variant="secondary" className="px-6 py-2 rounded-xl text-xs uppercase tracking-widest border-outline/10">
                                                {t('common.cancel')}
                                            </Button>
                                            <Button onClick={handleSaveProfile} className="px-8 py-2 rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-primary/20">
                                                {t('profile_page.save_changes')}
                                            </Button>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <div className="bg-white/5 backdrop-blur-sm p-6 lg:p-8 rounded-[32px] border border-outline-variant/10 group-hover/bio:bg-white/10 transition-colors">
                                        <p className="text-on-surface text-base lg:text-xl leading-relaxed italic font-medium">
                                            {profile.bio || t('profile_page.no_bio')}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Additional Info Badges */}
                            <div className="flex flex-wrap gap-4 mt-2">
                                <div className="flex items-center gap-3 px-5 py-2.5 bg-tertiary/10 text-tertiary rounded-2xl border border-tertiary/20 backdrop-blur-sm">
                                    <Calendar size={18} />
                                    <span className="text-[11px] font-black uppercase tracking-widest">
                                        {t('profile_page.joined')} {profile.created_at ? format(new Date(profile.created_at), 'MMMM yyyy', { locale: dateLocale }) : t('profile_page.recently')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 px-5 py-2.5 bg-primary/10 text-primary rounded-2xl border border-primary/20 backdrop-blur-sm">
                                    <Users size={18} />
                                    <span className="text-[11px] font-black uppercase tracking-widest">
                                        {posts.length} {t('profile_page.legacy.title')}
                                    </span>
                                </div>
                            </div>
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
                className="bubble p-6 lg:p-8 bg-tertiary/5 border-tertiary/20 shadow-tertiary/10 relative overflow-hidden group"
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
                className="bubble p-6 lg:p-10 mb-10"
            >
                <h2 className="text-xl lg:text-2xl font-black text-on-surface mb-6 uppercase tracking-tighter italic">{t('profile_page.legacy.title')}</h2>
                {posts.length === 0 ? (
                    <div className="text-center py-12 bg-white/40 dark:bg-white/5 rounded-[32px] border border-dashed border-outline-variant/10 group hover:border-primary/40 transition-all">
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
