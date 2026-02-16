import { useState, useEffect, useCallback, useRef } from 'react';
import { Avatar } from '../ui/Avatar';
import { MessageCircle, Heart, Send, ChevronDown, ChevronUp, Trash2, Eye, Smile, Reply, X, Pencil, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { clsx } from 'clsx';
import { EmojiPicker } from '../ui/EmojiPicker';
import { UserBadge } from '../ui/UserBadge';
import { getDateLocale } from '../../utils/dateLocale';

export interface Post {
    id: string;
    content: string;
    image_url?: string;
    created_at: string;
    edited_at?: string | null;
    likes_count: number;
    views_count: number;
    user_id: string;
    author: {
        username: string;
        full_name: string;
        avatar_url: string;
        is_verified?: boolean;
    };
}

interface Comment {
    id: string;
    post_id: string;
    user_id: string;
    content: string;
    created_at: string;
    edited_at?: string | null;
    parent_id?: string | null;
    author: {
        username: string;
        full_name: string;
        avatar_url: string;
        is_verified?: boolean;
    };
}

export const PostCard = ({ post, onDelete, onPostUpdate, index = 0 }: { post: Post; onDelete?: (id: string) => void; onPostUpdate?: (id: string, content: string) => void; index?: number }) => {
    const { t, i18n } = useTranslation();
    const { user, isGuest } = useAuth();

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
    const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
    const commentInputRef = useRef<HTMLInputElement>(null);

    // Edit state
    const [editingPost, setEditingPost] = useState(false);
    const [editPostContent, setEditPostContent] = useState(post.content);
    const [postContent, setPostContent] = useState(post.content);
    const [postEditedAt, setPostEditedAt] = useState(post.edited_at);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editCommentContent, setEditCommentContent] = useState('');

    // Views state
    const [viewsCount, setViewsCount] = useState(post.views_count || 0);

    // Check if current user liked this post
    useEffect(() => {
        if (!user || isGuest) return;
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
    }, [user, post.id, isGuest]);

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
        if (!user || isGuest || viewRecorded.current) return;
        const el = cardRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !viewRecorded.current) {
                    viewRecorded.current = true;
                    // Record view - trigger will handle the increment
                    supabase
                        .from('post_views')
                        .insert({ post_id: post.id, user_id: user.id })
                        .then(({ error }) => {
                            if (!error) {
                                setViewsCount(prev => prev + 1);
                            }
                        });
                    observer.disconnect();
                }
            },
            { threshold: 0.5 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [user, post.id, isGuest]);

    const fetchComments = useCallback(async () => {
        const { data, error } = await supabase
            .from('comments')
            .select(`*, author:profiles(username, full_name, avatar_url)`)
            .eq('post_id', post.id)
            .order('created_at', { ascending: true });

        if (!error && data) {
            setComments(data.map(c => ({
                ...c,
                parent_id: c.parent_id || null,
                author: c.author as unknown as Comment['author']
            })) as Comment[]);
            setCommentsCount(data.length);
        }
    }, [post.id]);

    const handleToggleLike = async () => {
        if (isGuest) {
            alert(t('login_page.login_to_interact'));
            return;
        }
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
                // Update counter on posts table - REMOVED: Triggers handle this
                // await supabase.from('posts').update({ likes_count: likesCount - 1 }).eq('id', post.id);
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
                // await supabase.from('posts').update({ likes_count: likesCount + 1 }).eq('id', post.id);
            }
        }
        setLikeLoading(false);
    };

    const performAddComment = async (content: string, parentId?: string) => {
        if (isGuest) {
            alert(t('login_page.login_to_interact'));
            return;
        }
        if (!content.trim() || !user || commentLoading) return;

        setCommentLoading(true);
        const insertData: Record<string, string> = {
            post_id: post.id,
            user_id: user.id,
            content: content.trim()
        };
        if (parentId) {
            insertData.parent_id = parentId;
        }
        const { error } = await supabase
            .from('comments')
            .insert(insertData);

        if (error) {
            console.error('Error adding comment:', error);
        } else {
            setNewComment('');
            setReplyingTo(null);
            await fetchComments();
        }
        setCommentLoading(false);
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        await performAddComment(newComment, replyingTo?.id);
    };

    const handleReply = (comment: Comment) => {
        setReplyingTo(comment);
        commentInputRef.current?.focus();
    };

    const handleDeleteComment = async (commentId: string) => {
        const { error } = await supabase
            .from('comments')
            .delete()
            .eq('id', commentId);

        if (!error) {
            // Also remove child replies
            setComments(prev => prev.filter(c => c.id !== commentId && c.parent_id !== commentId));
            setCommentsCount(prev => prev - 1);
            if (replyingTo?.id === commentId) setReplyingTo(null);
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
        const updatedContent = before + emoji + after;

        setNewComment(updatedContent);

        // Reset focus and cursor position after state update
        setTimeout(() => {
            input.focus();
            input.setSelectionRange(start + emoji.length, start + emoji.length);
        }, 0);
    };

    const isOwnPost = user?.id === post.user_id;

    // Edit post handler
    const handleEditPost = async () => {
        if (!editPostContent.trim() || editPostContent === postContent) {
            setEditingPost(false);
            setEditPostContent(postContent);
            return;
        }
        const { error } = await supabase
            .from('posts')
            .update({ content: editPostContent.trim(), edited_at: new Date().toISOString() })
            .eq('id', post.id);
        if (!error) {
            setPostContent(editPostContent.trim());
            setPostEditedAt(new Date().toISOString());
            setEditingPost(false);
            onPostUpdate?.(post.id, editPostContent.trim());
        }
    };

    // Edit comment handler
    const handleEditComment = async (commentId: string) => {
        if (!editCommentContent.trim()) {
            setEditingCommentId(null);
            return;
        }
        const { error } = await supabase
            .from('comments')
            .update({ content: editCommentContent.trim(), edited_at: new Date().toISOString() })
            .eq('id', commentId);
        if (!error) {
            setComments(prev => prev.map(c =>
                c.id === commentId ? { ...c, content: editCommentContent.trim(), edited_at: new Date().toISOString() } : c
            ));
            setEditingCommentId(null);
        }
    };

    return (
        <motion.div
            ref={cardRef}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                delay: Math.min(index * 0.05, 0.3),
                duration: 0.3,
                ease: "easeOut"
            }}
            whileHover={{ y: -4 }}
            className={clsx(
                "p-6 mb-6 bg-surface-container-low/40 backdrop-blur-xl rounded-[40px] border border-outline-variant/10 shadow-xl shadow-primary/5 hover:shadow-2xl hover:shadow-primary/10 hover:bg-surface-container-low/60 transition-all duration-500 group/card relative",
                showEmojiPicker && "z-[100]"
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
                            <h3 className="text-base font-black text-on-surface leading-tight tracking-tight uppercase italic group-hover/name:text-primary transition-colors flex items-center gap-2">
                                {post.author.full_name || post.author.username}
                                <UserBadge username={post.author.username} isVerified={post.author.is_verified} />
                            </h3>
                        </Link>
                        <p className="text-[10px] font-bold text-primary/60 uppercase tracking-[0.2em]">
                            {formatDistanceToNow(new Date(post.created_at), {
                                addSuffix: true,
                                locale: getDateLocale(i18n.language)
                            })}
                        </p>
                    </div>
                </div>
                {isOwnPost && (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => { setEditingPost(true); setEditPostContent(postContent); }}
                            className="p-2 text-on-surface-variant/40 hover:text-primary rounded-xl hover:bg-primary/10 transition-all"
                            title={t('common.edit')}
                        >
                            <Pencil size={16} />
                        </button>
                        {onDelete && (
                            <button
                                onClick={() => onDelete(post.id)}
                                className="p-2 text-on-surface-variant/40 hover:text-red-500 rounded-xl hover:bg-red-500/10 transition-all"
                                title={t('post.delete')}
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="relative z-10">
                {editingPost ? (
                    <div className="mb-5">
                        <textarea
                            value={editPostContent}
                            onChange={(e) => setEditPostContent(e.target.value)}
                            className="w-full px-4 py-3 bg-surface-container rounded-2xl border border-primary/20 focus:ring-2 focus:ring-primary/30 outline-none text-base font-medium text-on-surface resize-none min-h-[80px]"
                            autoFocus
                        />
                        <div className="flex gap-2 mt-2 justify-end">
                            <button
                                onClick={() => { setEditingPost(false); setEditPostContent(postContent); }}
                                className="px-3 py-1.5 text-xs font-bold text-on-surface-variant/60 hover:text-on-surface transition-colors uppercase tracking-wider"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={handleEditPost}
                                className="px-3 py-1.5 text-xs font-bold bg-primary text-on-primary rounded-xl hover:opacity-90 transition-all uppercase tracking-wider"
                            >
                                {t('common.save')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="text-on-surface/90 mb-5 whitespace-pre-wrap text-base lg:text-lg leading-relaxed font-medium tracking-tight">
                        {postContent}
                        {postEditedAt && (
                            <span className="text-[10px] text-on-surface-variant/30 font-bold ml-2 uppercase">({t('common.edited')})</span>
                        )}
                    </p>
                )}

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
                            "flex items-center gap-2 px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-2xl transition-all duration-300 group/like active:scale-95 border shadow-sm",
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
                            "flex items-center gap-2 px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-2xl transition-all duration-300 group/discuss active:scale-95 border shadow-sm",
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
                        className="relative z-10 w-full overflow-visible"
                    >
                        <div className="pt-4 mt-4 border-t border-outline-variant/10 px-1">
                            {/* Reply Indicator */}
                            {replyingTo && (
                                <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-primary/5 rounded-xl text-xs font-semibold text-primary">
                                    <Reply size={14} />
                                    <span>{t('common.replying_to')} <span className="font-black">@{replyingTo.author.username}</span></span>
                                    <button onClick={() => setReplyingTo(null)} className="ml-auto p-0.5 hover:bg-primary/10 rounded-full transition-colors" title={t('common.close')}>
                                        <X size={14} />
                                    </button>
                                </div>
                            )}
                            {/* Comment Input */}
                            <form onSubmit={handleAddComment} className="flex gap-2 sm:gap-3 mb-4 items-center">
                                <Avatar
                                    src={user?.user_metadata?.avatar_url}
                                    size="sm"
                                    className="ring-2 ring-primary/5 flex-shrink-0"
                                />
                                <div className="flex-1 flex gap-1 sm:gap-2 relative min-w-0 z-[50]">
                                    <input
                                        ref={commentInputRef}
                                        type="text"
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder={t('post.comment_placeholder')}
                                        className="flex-1 w-full min-w-0 px-3 sm:px-4 py-2.5 bg-surface-container rounded-2xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium text-on-surface placeholder:text-on-surface-variant/40"
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
                                                className="absolute bottom-full mb-2 right-0"
                                            />
                                        )}
                                    </AnimatePresence>
                                    <button
                                        type="submit"
                                        disabled={!newComment.trim() || commentLoading}
                                        title={t('post.comment_placeholder')}
                                        className="p-2.5 bg-primary text-on-primary rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:scale-100 shadow-md flex-shrink-0"
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
                                    comments.filter(c => !c.parent_id).map((comment) => {
                                        const replies = comments.filter(c => c.parent_id === comment.id);
                                        return (
                                            <div key={comment.id}>
                                                {/* Top-level comment */}
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className="flex gap-3 group/comment"
                                                >
                                                    <Link to={`/profile/${comment.user_id}`} className="mt-1">
                                                        <Avatar
                                                            src={comment.author.avatar_url}
                                                            alt={comment.author.username}
                                                            size="sm"
                                                            className="ring-2 ring-transparent group-hover/comment:ring-primary/20 transition-all"
                                                        />
                                                    </Link>
                                                    <div className="flex-1 max-w-[85%] min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Link to={`/profile/${comment.user_id}`} className="text-xs font-black text-on-surface hover:text-primary transition-colors flex items-center gap-1.5">
                                                                {comment.author.full_name || comment.author.username}
                                                                <UserBadge username={comment.author.username} isVerified={comment.author.is_verified} />
                                                            </Link>
                                                            <span className="text-[9px] text-on-surface-variant/40 font-bold uppercase tracking-wider">
                                                                {formatDistanceToNow(new Date(comment.created_at), {
                                                                    addSuffix: true,
                                                                    locale: getDateLocale(i18n.language)
                                                                })}
                                                            </span>
                                                        </div>

                                                        <div className="bg-surface-container-high/50 px-4 py-2.5 rounded-2xl rounded-tl-none inline-block max-w-full text-sm font-medium text-on-surface leading-relaxed shadow-sm break-words whitespace-pre-wrap">
                                                            {editingCommentId === comment.id ? (
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="text"
                                                                        value={editCommentContent}
                                                                        onChange={(e) => setEditCommentContent(e.target.value)}
                                                                        onKeyDown={(e) => { if (e.key === 'Enter') handleEditComment(comment.id); if (e.key === 'Escape') setEditingCommentId(null); }}
                                                                        className="flex-1 bg-transparent outline-none text-sm font-medium min-w-[120px]"
                                                                        autoFocus
                                                                    />
                                                                    <button onClick={() => handleEditComment(comment.id)} className="text-primary hover:text-primary/80" title={t('common.save')}>
                                                                        <Check size={14} />
                                                                    </button>
                                                                    <button onClick={() => setEditingCommentId(null)} className="text-on-surface-variant/40 hover:text-on-surface" title={t('common.cancel')}>
                                                                        <X size={14} />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    {comment.content}
                                                                    {comment.edited_at && <span className="text-[9px] text-on-surface-variant/30 font-bold ml-1.5">({t('common.edited')})</span>}
                                                                </>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-3 mt-1">
                                                            <button
                                                                onClick={() => handleReply(comment)}
                                                                className="text-[10px] font-bold text-on-surface-variant/40 hover:text-primary transition-colors uppercase tracking-wider flex items-center gap-1"
                                                            >
                                                                <Reply size={11} />
                                                                {t('common.reply')}
                                                            </button>
                                                            {comment.user_id === user?.id && (
                                                                <>
                                                                    <button
                                                                        onClick={() => { setEditingCommentId(comment.id); setEditCommentContent(comment.content); }}
                                                                        className="text-[10px] font-bold text-on-surface-variant/40 hover:text-primary opacity-0 group-hover/comment:opacity-100 transition-all uppercase tracking-wider flex items-center gap-1"
                                                                    >
                                                                        <Pencil size={10} />
                                                                        {t('common.edit')}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteComment(comment.id)}
                                                                        className="text-[10px] font-bold text-red-500/50 hover:text-red-500 opacity-0 group-hover/comment:opacity-100 transition-all uppercase tracking-wider"
                                                                    >
                                                                        {t('common.remove')}
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </motion.div>

                                                {/* Replies */}
                                                {replies.length > 0 && (
                                                    <div className="ml-4 md:ml-10 mt-2 space-y-2 border-l-2 border-outline-variant/10 pl-3">
                                                        {replies.map((reply) => (
                                                            <motion.div
                                                                key={reply.id}
                                                                initial={{ opacity: 0, x: -8 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                className="flex gap-2.5 group/reply"
                                                            >
                                                                <Link to={`/profile/${reply.user_id}`} className="mt-0.5">
                                                                    <Avatar
                                                                        src={reply.author.avatar_url}
                                                                        alt={reply.author.username}
                                                                        size="xs"
                                                                        className="ring-1 ring-transparent group-hover/reply:ring-primary/20 transition-all"
                                                                    />
                                                                </Link>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 mb-0.5">
                                                                        <Link to={`/profile/${reply.user_id}`} className="text-[11px] font-black text-on-surface hover:text-primary transition-colors flex items-center gap-1">
                                                                            {reply.author.full_name || reply.author.username}
                                                                            <UserBadge username={reply.author.username} isVerified={reply.author.is_verified} />
                                                                        </Link>
                                                                        <span className="text-[9px] text-on-surface-variant/30 font-bold">
                                                                            {formatDistanceToNow(new Date(reply.created_at), {
                                                                                addSuffix: true,
                                                                                locale: getDateLocale(i18n.language)
                                                                            })}
                                                                        </span>
                                                                    </div>
                                                                    <div className="bg-surface-container/60 px-3 py-2 rounded-xl rounded-tl-none inline-block max-w-full text-[13px] font-medium text-on-surface leading-relaxed break-words whitespace-pre-wrap">
                                                                        <span className="text-primary/70 font-bold">@{comment.author.username}</span>{' '}
                                                                        {editingCommentId === reply.id ? (
                                                                            <span className="inline-flex items-center gap-1.5">
                                                                                <input
                                                                                    type="text"
                                                                                    value={editCommentContent}
                                                                                    onChange={(e) => setEditCommentContent(e.target.value)}
                                                                                    onKeyDown={(e) => { if (e.key === 'Enter') handleEditComment(reply.id); if (e.key === 'Escape') setEditingCommentId(null); }}
                                                                                    className="bg-transparent outline-none text-[13px] font-medium min-w-[80px]"
                                                                                    autoFocus
                                                                                />
                                                                                <button onClick={() => handleEditComment(reply.id)} className="text-primary" title={t('common.save')}><Check size={12} /></button>
                                                                                <button onClick={() => setEditingCommentId(null)} className="text-on-surface-variant/40" title={t('common.cancel')}><X size={12} /></button>
                                                                            </span>
                                                                        ) : (
                                                                            <>
                                                                                {reply.content}
                                                                                {reply.edited_at && <span className="text-[9px] text-on-surface-variant/30 font-bold ml-1">({t('common.edited')})</span>}
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-3 mt-0.5">
                                                                        <button
                                                                            onClick={() => handleReply(comment)}
                                                                            className="text-[9px] font-bold text-on-surface-variant/30 hover:text-primary transition-colors uppercase tracking-wider flex items-center gap-1"
                                                                        >
                                                                            <Reply size={10} />
                                                                            {t('common.reply')}
                                                                        </button>
                                                                        {reply.user_id === user?.id && (
                                                                            <>
                                                                                <button
                                                                                    onClick={() => { setEditingCommentId(reply.id); setEditCommentContent(reply.content); }}
                                                                                    className="text-[9px] font-bold text-on-surface-variant/30 hover:text-primary opacity-0 group-hover/reply:opacity-100 transition-all uppercase tracking-wider flex items-center gap-1"
                                                                                >
                                                                                    <Pencil size={9} />
                                                                                    {t('common.edit')}
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleDeleteComment(reply.id)}
                                                                                    className="text-[9px] font-bold text-red-500/40 hover:text-red-500 opacity-0 group-hover/reply:opacity-100 transition-all uppercase tracking-wider"
                                                                                >
                                                                                    {t('common.remove')}
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
