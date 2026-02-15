import { useState, useEffect, useCallback, useRef } from 'react';
import { Avatar } from '../ui/Avatar';
import { MessageCircle, Heart, Share2, Send, ChevronDown, ChevronUp, Trash2, Eye, Smile } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { clsx } from 'clsx';
import { EmojiPicker } from '../ui/EmojiPicker';

export interface Post {
    id: string;
    content: string;
    image_url?: string;
    created_at: string;
    likes_count: number;
    views_count: number;
    user_id: string;
    author: {
        username: string;
        full_name: string;
        avatar_url: string;
    };
}

interface Comment {
    id: string;
    post_id: string;
    user_id: string;
    content: string;
    created_at: string;
    author: {
        username: string;
        full_name: string;
        avatar_url: string;
    };
}

export const PostCard = ({ post, onDelete }: { post: Post; onDelete?: (id: string) => void }) => {
    const { t } = useTranslation();
    const { user } = useAuth();

    // Likes state
    const [liked, setLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(post.likes_count || 0);
    const [likeLoading, setLikeLoading] = useState(false);

    // Comments state
    const [comments, setComments] = useState<Comment[]>([]);
    const [showComments, setShowComments] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);
    const [commentsCount, setCommentsCount] = useState(0);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const commentInputRef = useRef<HTMLInputElement>(null);

    // Views state
    const [viewsCount, setViewsCount] = useState(post.views_count || 0);

    // Check if current user liked this post
    useEffect(() => {
        if (!user) return;
        const checkLike = async () => {
            const { data } = await supabase
                .from('post_likes')
                .select('id')
                .eq('post_id', post.id)
                .eq('user_id', user.id)
                .maybeSingle();
            setLiked(!!data);
        };
        checkLike();
    }, [user, post.id]);

    // Fetch comment count
    useEffect(() => {
        const fetchCount = async () => {
            const { count } = await supabase
                .from('comments')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', post.id);
            setCommentsCount(count || 0);
        };
        fetchCount();
    }, [post.id]);

    // Track view (once per user per post)
    const cardRef = useRef<HTMLDivElement>(null);
    const viewRecorded = useRef(false);
    useEffect(() => {
        if (!user || viewRecorded.current) return;
        const el = cardRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !viewRecorded.current) {
                    viewRecorded.current = true;
                    // Record view in background
                    supabase
                        .from('post_views')
                        .upsert({ post_id: post.id, user_id: user.id }, { onConflict: 'post_id,user_id' })
                        .then(({ error }) => {
                            if (!error) {
                                setViewsCount(prev => prev + 1);
                                supabase.from('posts').update({ views_count: viewsCount + 1 }).eq('id', post.id);
                            }
                        });
                    observer.disconnect();
                }
            },
            { threshold: 0.5 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [user, post.id, viewsCount]);

    const fetchComments = useCallback(async () => {
        const { data, error } = await supabase
            .from('comments')
            .select(`*, author:profiles(username, full_name, avatar_url)`)
            .eq('post_id', post.id)
            .order('created_at', { ascending: true });

        if (!error && data) {
            setComments(data.map(c => ({
                ...c,
                author: c.author as unknown as Comment['author']
            })) as Comment[]);
            setCommentsCount(data.length);
        }
    }, [post.id]);

    const handleToggleLike = async () => {
        if (!user || likeLoading) return;
        setLikeLoading(true);

        if (liked) {
            // Unlike
            setLiked(false);
            setLikesCount(prev => Math.max(0, prev - 1));

            const { error } = await supabase
                .from('post_likes')
                .delete()
                .eq('post_id', post.id)
                .eq('user_id', user.id);

            if (error) {
                // Revert
                setLiked(true);
                setLikesCount(prev => prev + 1);
                console.error('Error unliking:', error);
            } else {
                // Update counter on posts table
                await supabase.from('posts').update({ likes_count: likesCount - 1 }).eq('id', post.id);
            }
        } else {
            // Like
            setLiked(true);
            setLikesCount(prev => prev + 1);

            const { error } = await supabase
                .from('post_likes')
                .insert({ post_id: post.id, user_id: user.id });

            if (error) {
                // Revert
                setLiked(false);
                setLikesCount(prev => Math.max(0, prev - 1));
                console.error('Error liking:', error);
            } else {
                await supabase.from('posts').update({ likes_count: likesCount + 1 }).eq('id', post.id);
            }
        }
        setLikeLoading(false);
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !user || commentLoading) return;

        setCommentLoading(true);
        const { error } = await supabase
            .from('comments')
            .insert({
                post_id: post.id,
                user_id: user.id,
                content: newComment.trim()
            });

        if (error) {
            console.error('Error adding comment:', error);
        } else {
            setNewComment('');
            await fetchComments();
        }
        setCommentLoading(false);
    };

    const handleDeleteComment = async (commentId: string) => {
        const { error } = await supabase
            .from('comments')
            .delete()
            .eq('id', commentId);

        if (!error) {
            setComments(prev => prev.filter(c => c.id !== commentId));
            setCommentsCount(prev => prev - 1);
        }
    };

    const handleToggleComments = () => {
        if (!showComments) {
            fetchComments();
        }
        setShowComments(prev => !prev);
    };

    const handleEmojiSelect = (emoji: string) => {
        const input = commentInputRef.current;
        if (!input) return;

        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const text = newComment;
        const before = text.substring(0, start);
        const after = text.substring(end);

        setNewComment(before + emoji + after);

        // Reset focus and cursor position after state update
        setTimeout(() => {
            input.focus();
            input.setSelectionRange(start + emoji.length, start + emoji.length);
        }, 0);
    };

    const isOwnPost = user?.id === post.user_id;

    return (
        <motion.div
            ref={cardRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            className={clsx(
                "p-6 mb-6 bg-surface-container-low/40 backdrop-blur-xl rounded-[40px] border border-outline-variant/10 shadow-xl shadow-primary/5 hover:shadow-2xl hover:shadow-primary/10 hover:bg-surface-container-low/60 transition-all duration-500 group/card relative",
                showEmojiPicker && "z-[60]"
            )}
        >
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover/card:bg-primary/10 transition-colors duration-700" />

            {/* Header */}
            <div className="flex items-center justify-between mb-5 relative z-10">
                <div className="flex items-center gap-4">
                    <Link to={`/profile/${post.user_id}`} className="relative group/avatar">
                        <Avatar
                            src={post.author.avatar_url}
                            alt={post.author.username}
                            size="md"
                            className="ring-4 ring-primary/5 shadow-2xl transition-transform duration-500 group-hover/avatar:scale-110"
                        />
                        <div className="absolute inset-0 rounded-full bg-primary/10 opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300" />
                    </Link>
                    <div className="flex flex-col">
                        <Link to={`/profile/${post.user_id}`} className="group/name">
                            <h3 className="text-base font-black text-on-surface leading-tight tracking-tight uppercase italic group-hover/name:text-primary transition-colors">
                                {post.author.full_name || post.author.username}
                            </h3>
                        </Link>
                        <p className="text-[10px] font-bold text-primary/60 uppercase tracking-[0.2em]">
                            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        </p>
                    </div>
                </div>
                {isOwnPost && onDelete && (
                    <button
                        onClick={() => onDelete(post.id)}
                        className="p-2 text-on-surface-variant/40 hover:text-red-500 rounded-xl hover:bg-red-500/10 transition-all"
                        title={t('post.delete')}
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="relative z-10">
                <p className="text-on-surface/90 mb-5 whitespace-pre-wrap text-base lg:text-lg leading-relaxed font-medium tracking-tight">
                    {post.content}
                </p>

                {post.image_url && (
                    <motion.div
                        whileHover={{ scale: 1.01 }}
                        className="overflow-hidden mb-5 rounded-[32px] border border-outline-variant/10 shadow-2xl relative group/image"
                    >
                        <img
                            src={post.image_url}
                            alt="Post content"
                            className="w-full h-auto object-cover max-h-[600px] transition-transform duration-700 group-hover/image:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity duration-500" />
                    </motion.div>
                )}
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-outline-variant/10 relative z-10">
                <div className="flex gap-3">
                    {/* Like Button */}
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={handleToggleLike}
                        disabled={likeLoading}
                        className={clsx(
                            "flex items-center gap-2 px-5 py-2.5 rounded-2xl transition-all duration-300 group/like active:scale-95 border shadow-sm",
                            liked
                                ? "bg-red-500/10 text-red-500 border-red-500/20"
                                : "bg-surface-container-low text-on-surface-variant hover:text-red-500 hover:bg-red-500/5 border-outline-variant/5"
                        )}
                    >
                        <Heart
                            size={20}
                            className={clsx(
                                "transition-all duration-300",
                                liked ? "fill-red-500 text-red-500" : "group-hover/like:fill-red-500/20"
                            )}
                        />
                        <span className="text-sm font-black tracking-tight">{likesCount}</span>
                    </motion.button>

                    {/* Comment Toggle */}
                    <button
                        onClick={handleToggleComments}
                        className={clsx(
                            "flex items-center gap-2 px-5 py-2.5 rounded-2xl transition-all duration-300 group/discuss active:scale-95 border shadow-sm",
                            showComments
                                ? "bg-primary/10 text-primary border-primary/20"
                                : "bg-surface-container-low text-on-surface-variant hover:text-primary hover:bg-primary/5 border-outline-variant/5"
                        )}
                    >
                        <MessageCircle size={20} className={clsx(showComments && "fill-primary/20")} />
                        <span className="text-sm font-black tracking-tight">{commentsCount}</span>
                        {showComments ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                </div>
                <div className="flex items-center gap-3">
                    {/* Views */}
                    <div className="flex items-center gap-1.5 text-on-surface-variant/50" title={t('post.views')}>
                        <Eye size={16} />
                        <span className="text-xs font-bold">{viewsCount}</span>
                    </div>
                    <button
                        className="p-3 text-on-surface-variant hover:text-primary rounded-2xl bg-surface-container-low hover:bg-primary/5 transition-all duration-300 border border-outline-variant/5 shadow-sm active:scale-90"
                        title={t('common.share')}
                    >
                        <Share2 size={20} />
                    </button>
                </div>
            </div>

            {/* Comments Section */}
            <AnimatePresence>
                {showComments && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden relative z-10"
                    >
                        <div className="pt-4 mt-4 border-t border-outline-variant/10">
                            {/* Comment Input */}
                            <form onSubmit={handleAddComment} className="flex gap-3 mb-4">
                                <Avatar
                                    src={user?.user_metadata?.avatar_url}
                                    size="sm"
                                    className="ring-2 ring-primary/5 flex-shrink-0"
                                />
                                <div className="flex-1 flex gap-2 relative">
                                    <input
                                        ref={commentInputRef}
                                        type="text"
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder={t('post.comment_placeholder')}
                                        className="flex-1 px-4 py-2.5 bg-surface-container rounded-2xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium text-on-surface placeholder:text-on-surface-variant/40"
                                    />

                                    <button
                                        type="button"
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                        className={clsx(
                                            "p-2 text-on-surface-variant/40 hover:text-primary transition-colors",
                                            showEmojiPicker && "text-primary"
                                        )}
                                        title={t('post.add_emoji', 'Add emoji')}
                                    >
                                        <Smile size={20} />
                                    </button>

                                    <AnimatePresence>
                                        {showEmojiPicker && (
                                            <EmojiPicker
                                                onSelect={handleEmojiSelect}
                                                onClose={() => setShowEmojiPicker(false)}
                                                className="absolute top-full mt-2 right-0"
                                            />
                                        )}
                                    </AnimatePresence>
                                    <button
                                        type="submit"
                                        disabled={!newComment.trim() || commentLoading}
                                        title={t('post.comment_placeholder')}
                                        className="p-2.5 bg-primary text-on-primary rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:scale-100 shadow-md"
                                    >
                                        <Send size={16} />
                                    </button>
                                </div>
                            </form>

                            {/* Comments List */}
                            <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-hide">
                                {comments.length === 0 ? (
                                    <p className="text-center text-on-surface-variant/40 text-xs font-bold py-4 uppercase tracking-widest">
                                        {t('post.no_comments')}
                                    </p>
                                ) : (
                                    comments.map((comment) => (
                                        <motion.div
                                            key={comment.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="flex gap-3 p-3 rounded-2xl hover:bg-surface-container-high/50 transition-colors group/comment"
                                        >
                                            <Link to={`/profile/${comment.user_id}`}>
                                                <Avatar
                                                    src={comment.author.avatar_url}
                                                    alt={comment.author.username}
                                                    size="sm"
                                                    className="ring-2 ring-outline-variant/10"
                                                />
                                            </Link>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <Link to={`/profile/${comment.user_id}`} className="text-xs font-black text-on-surface uppercase tracking-tight hover:text-primary transition-colors">
                                                        {comment.author.full_name || comment.author.username}
                                                    </Link>
                                                    <span className="text-[9px] text-on-surface-variant/40 font-medium">
                                                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-on-surface/80 font-medium mt-0.5 leading-relaxed">
                                                    {comment.content}
                                                </p>
                                            </div>
                                            {comment.user_id === user?.id && (
                                                <button
                                                    onClick={() => handleDeleteComment(comment.id)}
                                                    title={t('post.delete')}
                                                    className="p-1.5 text-on-surface-variant/30 hover:text-red-500 rounded-lg opacity-0 group-hover/comment:opacity-100 transition-all"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
