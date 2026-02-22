import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { PostCard } from './PostCard';
import type { Post } from './PostCard';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { Send, Image as ImageIcon, X, Smile } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../ui/Avatar';
import { compressImage } from '../../utils/compressImage';
import { EmojiPicker } from '../ui/EmojiPicker';
import { usePerformanceMode } from '../../hooks/usePerformanceMode';

export const Feed = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [newPostContent, setNewPostContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { reduceMotion, reduceEffects } = usePerformanceMode();

    const fetchPosts = useCallback(async () => {
        const { data, error } = await supabase
            .from('posts')
            .select(`
        *,
        author:profiles(username, full_name, avatar_url)
      `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching posts:', error);
        } else if (data) {
            const formattedPosts = data.map((post) => ({
                ...post,
                author: post.author as unknown as Post['author']
            }));
            setPosts(formattedPosts as Post[]);
        }
    }, []);

    const handleEmojiSelect = (emoji: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = newPostContent;
        const before = text.substring(0, start);
        const after = text.substring(end);
        const updatedContent = before + emoji + after;

        setNewPostContent(updatedContent);

        // Reset focus and cursor position after state update
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + emoji.length, start + emoji.length);
        }, 0);
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert(t('post.invalid_image'));
            return;
        }

        setSelectedImage(file);
        const reader = new FileReader();
        reader.onload = (ev) => setImagePreview(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    const removeImage = () => {
        setSelectedImage(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const uploadImage = async (file: File): Promise<string | null> => {
        if (!user) return null;

        // Compress to ~150KB
        const compressed = await compressImage(file, 150);

        // Log skip vs compress
        if (compressed === file) {
            console.log(`[Upload] Using original file: ${(file.size / 1024).toFixed(0)}KB`);
        } else {
            console.log(`[Upload] Image compressed: ${(file.size / 1024).toFixed(0)}KB → ${(compressed.size / 1024).toFixed(0)}KB (${compressed.type})`);
        }

        const extension = compressed.type.split('/')[1] || 'jpg';
        const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${extension}`;

        const { error } = await supabase.storage
            .from('post-images')
            .upload(fileName, compressed, {
                contentType: compressed.type,
                upsert: false,
            });

        if (error) {
            console.error('Upload error:', error);
            throw error;
        }

        const { data: urlData } = supabase.storage
            .from('post-images')
            .getPublicUrl(fileName);

        return urlData.publicUrl;
    };

    const performCreatePost = async (content: string, imageFile: File | null) => {
        if ((!content.trim() && !imageFile) || !user || loading) return;

        setLoading(true);
        try {
            let imageUrl: string | null = null;

            if (imageFile) {
                imageUrl = await uploadImage(imageFile);
            }

            const { error } = await supabase
                .from('posts')
                .insert([{
                    user_id: user.id,
                    content: content || '',
                    image_url: imageUrl
                }]);

            if (error) throw error;

            setNewPostContent('');
            removeImage();
            setShowEmojiPicker(false);
            await fetchPosts();
        } catch (error: unknown) {
            console.error('Error creating post:', error);
            const errorMessage = error instanceof Error ? error.message : t('common.error');
            alert(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        await performCreatePost(newPostContent, selectedImage);
    };

    const handleDeletePost = async (postId: string) => {
        if (!confirm(t('post.delete_confirm'))) return;
        const { error } = await supabase
            .from('posts')
            .delete()
            .eq('id', postId);

        if (error) {
            console.error('Error deleting post:', error);
        } else {
            setPosts(prev => prev.filter(p => p.id !== postId));
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            void fetchPosts();
        }, 0);

        const channel = supabase
            .channel('public:posts')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'posts'
            }, async (payload) => {
                const { data } = await supabase
                    .from('posts')
                    .select(`*, author:profiles(username, full_name, avatar_url)`)
                    .eq('id', payload.new.id)
                    .single();

                if (data) {
                    setPosts((prev) => {
                        // Avoid duplicates
                        if (prev.some(p => p.id === data.id)) return prev;
                        return [data as Post, ...prev];
                    });
                }
            })
            .subscribe();

        return () => {
            clearTimeout(timer);
            void supabase.removeChannel(channel);
        };
    }, [fetchPosts]);

    return (
        <div className="w-full pb-8 lg:pt-0 px-4 flex-1">
            {/* Post Creation: Launch Station */}
            <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={clsx(
                    "liquid-glass p-6 md:p-10 mb-10 group/composer relative rounded-[3rem] border border-white/20 shadow-[0_0_40px_rgba(0,0,0,0.1)] dark:shadow-[0_0_40px_rgba(255,255,255,0.03)] hover:border-primary/30 hover:shadow-[0_0_60px_rgba(99,102,241,0.15)] transition-all duration-700",
                    showEmojiPicker && "z-[70]"
                )}
            >
                <div
                    className="absolute top-0 left-0 rounded-full -ml-24 -mt-24 transition-all duration-1000 group-focus-within/composer:bg-primary/30 group-focus-within/composer:scale-[1.5]"
                    style={{
                        width: reduceEffects ? '12rem' : '20rem',
                        height: reduceEffects ? '12rem' : '20rem',
                        backgroundColor: 'rgba(99,102,241, 0.15)',
                        filter: reduceEffects ? 'blur(56px)' : 'blur(120px)',
                    }}
                />
                <div
                    className="absolute bottom-0 right-0 rounded-full -mr-24 -mb-24 transition-all duration-1000 group-focus-within/composer:bg-tertiary/30 group-focus-within/composer:scale-[1.5]"
                    style={{
                        width: reduceEffects ? '12rem' : '20rem',
                        height: reduceEffects ? '12rem' : '20rem',
                        backgroundColor: 'rgba(236,72,153, 0.1)',
                        filter: reduceEffects ? 'blur(56px)' : 'blur(120px)',
                    }}
                />

                <form onSubmit={handleCreatePost} className="relative z-10">
                    <div className="flex gap-4 md:gap-6">
                        <Avatar src={user?.user_metadata?.avatar_url} size="sm" className="md:w-14 md:h-14 ring-4 ring-primary/5 shadow-xl hidden xs:block" />
                        <div className="flex-1">
                            <textarea
                                ref={textareaRef}
                                className="w-full resize-none border-none focus:ring-0 focus:outline-none text-on-surface placeholder:text-on-surface-variant/30 text-2xl md:text-[34px] font-black tracking-tight mb-4 md:mb-6 bg-transparent min-h-[120px] md:min-h-[140px] scrollbar-hide selection:bg-primary/20 drop-shadow-sm leading-tight"
                                placeholder={t('home.placeholder')}
                                value={newPostContent}
                                onChange={(e) => setNewPostContent(e.target.value)}
                                title={t('home.placeholder')}
                            />

                            {/* Image Preview */}
                            {imagePreview && (
                                <div className="relative mb-4 rounded-2xl overflow-hidden border border-outline-variant/10 shadow-lg">
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="w-full max-h-[300px] object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={removeImage}
                                        className="absolute top-3 right-3 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors backdrop-blur-sm"
                                        title={t('common.cancel')}
                                    >
                                        <X size={16} />
                                    </button>
                                    <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/60 text-white text-[10px] font-bold rounded-full backdrop-blur-sm uppercase tracking-wider">
                                        {selectedImage && (
                                            selectedImage.size <= 150 * 1024
                                                ? `${(selectedImage.size / 1024).toFixed(0)}KB (Original)`
                                                : `${(selectedImage.size / 1024).toFixed(0)}KB → ~150KB`
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center pt-4 md:pt-6 border-t border-outline-variant/10 gap-4">
                                <div className="flex gap-2 md:gap-3">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageSelect}
                                        className="hidden"
                                        id="post-image-input"
                                        title="Select image"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className={clsx(
                                            "p-3.5 md:p-4 rounded-[1.25rem] transition-all duration-500 border group/btn flex-1 sm:flex-initial flex items-center justify-center shadow-lg active:scale-95 backdrop-blur-md",
                                            selectedImage
                                                ? "text-primary bg-primary/20 border-primary/40 shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                                                : "text-on-surface-variant hover:text-primary bg-white/5 border-white/10 hover:border-primary/30 hover:bg-white/10"
                                        )}
                                        title={t('post.add_image')}
                                    >
                                        <ImageIcon size={22} className="md:w-[24px] md:h-[24px] group-hover/btn:scale-110 group-hover/btn:rotate-6 transition-transform" />
                                    </button>

                                    {/* Emoji Button */}
                                    <button
                                        type="button"
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                        className={clsx(
                                            "p-3.5 md:p-4 rounded-[1.25rem] transition-all duration-500 border group/btn flex-1 sm:flex-initial flex items-center justify-center shadow-lg active:scale-95 backdrop-blur-md",
                                            showEmojiPicker
                                                ? "text-primary bg-primary/20 border-primary/40 shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                                                : "text-on-surface-variant hover:text-primary bg-white/5 border-white/10 hover:border-primary/30 hover:bg-white/10"
                                        )}
                                        title={t('post.add_emoji', 'Add emoji')}
                                    >
                                        <Smile size={22} className="md:w-[24px] md:h-[24px] group-hover/btn:scale-110 group-hover/btn:-rotate-6 transition-transform" />
                                    </button>

                                    <AnimatePresence>
                                        {showEmojiPicker && (
                                            <EmojiPicker
                                                onSelect={handleEmojiSelect}
                                                onClose={() => setShowEmojiPicker(false)}
                                                className="absolute top-full mt-4 left-0"
                                            />
                                        )}
                                    </AnimatePresence>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={!newPostContent.trim() && !selectedImage}
                                    loading={loading}
                                    className="px-6 md:px-10 py-3.5 md:py-4 rounded-[1.25rem] md:rounded-[1.75rem] shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.5)] bg-gradient-to-r from-primary to-primary-container border border-white/20 hover:scale-105 active:scale-95 transition-all text-base md:text-lg font-black uppercase tracking-widest italic group/send"
                                >
                                    <span className="mr-2 md:mr-3">{t('home.launch')}</span>
                                    <Send size={18} className="md:w-[22px] md:h-[22px] group-hover/send:translate-x-1 group-hover/send:-translate-y-1 transition-transform" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </form>
            </motion.div>


            {/* Posts List */}
            <div className="space-y-4">
                {posts.map((post, index) => (
                    <PostCard
                        key={post.id}
                        post={post}
                        onDelete={handleDeletePost}
                        index={index}
                    />
                ))}

                {posts.length === 0 && (
                    <motion.div
                        initial={reduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={clsx(
                            'text-center py-20 bg-surface/50 transition-colors shadow-sm',
                            'rounded-[40px] glass border-0 overflow-hidden relative'
                        )}
                    >
                        <div className="absolute inset-0 bg-primary/5 blur-[100px] -z-10" />
                        <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                            <Send size={36} className="text-primary/20 rotate-12" />
                            <motion.div
                                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute inset-0 bg-primary/5 rounded-full blur-xl"
                            />
                        </div>
                        <p className="text-on-surface text-2xl font-black italic uppercase tracking-wider">{t('home.empty.title')}</p>
                        <p className="text-primary font-bold mt-2 text-sm uppercase leading-relaxed opacity-70 tracking-widest">{t('home.empty.subtitle')}</p>
                    </motion.div>
                )}
            </div>
        </div>
    );
};
