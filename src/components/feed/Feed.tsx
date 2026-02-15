import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { PostCard } from './PostCard';
import type { Post } from './PostCard';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { Send, Image as ImageIcon, X } from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../ui/Avatar';
import { compressImage } from '../../utils/compressImage';

export const Feed = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [newPostContent, setNewPostContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
        console.log(`Image compressed: ${(file.size / 1024).toFixed(0)}KB → ${(compressed.size / 1024).toFixed(0)}KB`);

        const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;

        const { error } = await supabase.storage
            .from('post-images')
            .upload(fileName, compressed, {
                contentType: 'image/jpeg',
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

    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!newPostContent.trim() && !selectedImage) || !user) return;

        setLoading(true);
        try {
            let imageUrl: string | null = null;

            if (selectedImage) {
                imageUrl = await uploadImage(selectedImage);
            }

            const { error } = await supabase
                .from('posts')
                .insert([{
                    user_id: user.id,
                    content: newPostContent || '',
                    image_url: imageUrl
                }]);

            if (error) throw error;

            setNewPostContent('');
            removeImage();
            await fetchPosts();
        } catch (error: unknown) {
            console.error('Error creating post:', error);
            const errorMessage = error instanceof Error ? error.message : t('common.error');
            alert(errorMessage);
        } finally {
            setLoading(false);
        }
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
        <div className="w-full py-8 px-4 flex-1">
            {/* Post Creation: Launch Station */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-5 md:p-8 mb-6 md:mb-12 bg-surface-container-low/40 backdrop-blur-xl rounded-[32px] md:rounded-[48px] border border-outline-variant/10 shadow-2xl shadow-primary/5 group/composer relative overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -ml-32 -mt-32 transition-colors duration-1000 group-focus-within/composer:bg-primary/10" />

                <form onSubmit={handleCreatePost} className="relative z-10">
                    <div className="flex gap-4 md:gap-6">
                        <Avatar src={user?.user_metadata?.avatar_url} size="sm" className="md:w-14 md:h-14 ring-4 ring-primary/5 shadow-xl hidden xs:block" />
                        <div className="flex-1">
                            <textarea
                                className="w-full resize-none border-none focus:ring-0 focus:outline-none text-on-surface placeholder-on-surface-variant/40 text-xl md:text-2xl font-black italic tracking-tighter mb-2 md:mb-4 bg-transparent min-h-[100px] md:min-h-[120px] scrollbar-hide"
                                placeholder={t('home.placeholder')}
                                value={newPostContent}
                                onChange={(e) => setNewPostContent(e.target.value)}
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
                                        {selectedImage && `${(selectedImage.size / 1024).toFixed(0)}KB → ~150KB`}
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
                                            "p-2.5 md:p-3 rounded-xl md:rounded-2xl transition-all duration-300 border border-outline-variant/5 group/btn flex-1 sm:flex-initial flex items-center justify-center",
                                            selectedImage
                                                ? "text-primary bg-primary/10 border-primary/20"
                                                : "text-on-surface-variant hover:text-primary bg-surface-container-low hover:bg-primary/5"
                                        )}
                                        title={t('post.add_image')}
                                    >
                                        <ImageIcon size={20} className="md:w-[22px] md:h-[22px] group-hover/btn:scale-110 transition-transform" />
                                    </button>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={!newPostContent.trim() && !selectedImage}
                                    loading={loading}
                                    className="px-6 md:px-10 py-3.5 md:py-4 rounded-2xl md:rounded-[24px] shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all text-base md:text-lg font-black uppercase tracking-widest italic group/send"
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
                    <motion.div
                        key={post.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                            delay: Math.min(index * 0.05, 0.3),
                            duration: 0.3,
                            ease: "easeOut"
                        }}
                        style={{ willChange: "transform, opacity" }}
                    >
                        <PostCard post={post} onDelete={handleDeletePost} />
                    </motion.div>
                ))}

                {posts.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
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
