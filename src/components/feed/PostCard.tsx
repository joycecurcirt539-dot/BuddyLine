import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Avatar } from '../ui/Avatar';
import { MessageCircle, Heart, Send, ChevronDown, ChevronUp, Trash2, Eye, Smile, Reply, X, Pencil, Check, MoreVertical } from 'lucide-react';
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
    // Menu state
    const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
    const [activeCommentMenuId, setActiveCommentMenuId] = useState<string | null>(null);
    const touchCoordsRef = useRef<{ x: number; y: number } | null>(null);
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleTouchStart = (e: React.TouchEvent, commentId: string) => {
        const touch = e.touches[0];
        touchCoordsRef.current = { x: touch.clientX, y: touch.clientY };
        longPressTimerRef.current = setTimeout(() => {
            if (touchCoordsRef.current) {
                setMenuPosition(touchCoordsRef.current);
                setActiveCommentMenuId(commentId);
            }
        }, 500);
    };

    const handleTouchEnd = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
        touchCoordsRef.current = null;
    };

    const handleTouchMove = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
        touchCoordsRef.current = null;
    };

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (activeCommentMenuId && !(e.target as Element).closest('.comment-menu-content')) {
                setActiveCommentMenuId(null);
                setMenuPosition(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeCommentMenuId]);

    // ... (Views state, Like Logic, etc) goes here ... don't replace everything, just targeting specific blocks

    // Helper to render menu
    const renderMenu = (item: Comment, isReply?: boolean): React.ReactPortal | null => {
        if (activeCommentMenuId !== item.id || !menuPosition) return null;

        return createPortal(
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    style={{
                        position: 'fixed',
                        top: menuPosition.y,
                        left: isReply ? undefined : menuPosition.x,
                        right: isReply ? window.innerWidth - menuPosition.x : undefined,
                        zIndex: 9999
                    }}
                    className="comment-menu-content bg-surface-container-high border border-outline-variant/10 shadow-xl rounded-xl overflow-hidden min-w-[140px] isolate"
                >
                    <button
                        onClick={() => { handleReply(item); setActiveCommentMenuId(null); }}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-on-surface hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-2"
                    >
                        <Reply size={14} />
                        {t('common.reply')}
                    </button>
                    {item.user_id === user?.id && (
                        <>
                            <button
                                onClick={() => { setEditingCommentId(item.id); setEditCommentContent(item.content); setActiveCommentMenuId(null); }}
                                className="w-full text-left px-4 py-2.5 text-xs font-bold text-on-surface hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-2"
                            >
                                <Pencil size={14} />
                                {t('common.edit')}
                            </button>
                            <div className="h-px bg-outline-variant/10 mx-2" />
                            <button
                                onClick={() => { handleDeleteComment(item.id); setActiveCommentMenuId(null); }}
                                className="w-full text-left px-4 py-2.5 text-xs font-bold text-error/80 hover:bg-error/10 hover:text-error transition-colors flex items-center gap-2"
                            >
                                <Trash2 size={14} />
                                {t('common.remove')}
                            </button>
                        </>
                    )}
                </motion.div>
            </AnimatePresence>,
            document.body
        );
    };



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
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
                delay: Math.min(index * 0.08, 0.4),
                type: "spring",
                stiffness: 100,
                damping: 20
            }}
            whileHover={{ y: -8, scale: 1.01 }}
            style={{ maxWidth: 800 }}
            className={clsx(
                "liquid-glass p-6 md:p-8 mb-10 rounded-[3rem] group/card relative w-full mx-auto transition-all duration-500 border-white/20 dark:border-white/10 hover:shadow-[0_0_40px_rgba(99,102,241,0.15)] hover:border-primary/30",
                showEmojiPicker && "z-[100]"
            )}
        >
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-[80px] -mr-24 -mt-24 group-hover/card:bg-primary/20 transition-colors duration-700" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-tertiary/10 rounded-full blur-[80px] -ml-24 -mb-24 group-hover/card:bg-tertiary/20 transition-colors duration-700" />

            {/* Header */}
            <div className="flex items-center justify-between mb-5 relative z-10">
                <div className="flex items-center gap-4">
                    <Link to={`/profile/${post.user_id}`} className="relative group/avatar">
                        <Avatar
                            src={post.author.avatar_url}
                            alt={post.author.username}
                            size="lg"
                            className="ring-4 ring-white/20 dark:ring-white/10 shadow-2xl transition-all duration-700 group-hover/avatar:scale-110 group-hover/avatar:rotate-6"
                        />
                        <div className="absolute inset-0 rounded-full bg-primary/20 opacity-0 group-hover/avatar:opacity-100 blur-md transition-opacity duration-300" />
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
                            title={t('common.edit')}
                            placeholder={t('post.placeholder', 'What is on your mind?')}
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
                    <p className="text-on-surface/90 mb-6 whitespace-pre-wrap text-[17px] lg:text-[20px] leading-relaxed font-black tracking-tight drop-shadow-sm">
                        {postContent}
                        {postEditedAt && (
                            <span className="text-[10px] text-primary/50 font-black ml-2 uppercase tracking-widest italic">({t('common.edited')})</span>
                        )}
                    </p>
                )}

                {post.image_url && (
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="overflow-hidden mb-6 rounded-[2rem] border border-white/20 dark:border-white/5 shadow-2xl relative group/image bg-black/10 backdrop-blur-sm"
                    >
                        <img
                            src={post.image_url}
                            alt="Post content"
                            className="w-full h-auto object-contain rounded-[2rem] transition-transform duration-1000 cubic-bezier(0.16, 1, 0.3, 1) group-hover/image:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover/image:opacity-100 transition-all duration-700" />
                    </motion.div>
                )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/10 relative z-10">
                <div className="flex gap-4">
                    {/* Like Button */}
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        whileHover={{ scale: 1.05 }}
                        onClick={handleToggleLike}
                        disabled={likeLoading}
                        className={clsx(
                            "flex items-center gap-2 px-5 py-3 rounded-[1.25rem] transition-all duration-500 group/like active:scale-95 shadow-xl backdrop-blur-xl border border-white/10 hover:border-red-500/30",
                            liked
                                ? "bg-red-500/20 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                                : "bg-white/5 text-on-surface-variant hover:text-red-500 hover:bg-red-500/10"
                        )}
                    >
                        <Heart
                            size={22}
                            className={clsx(
                                "transition-all duration-500",
                                liked ? "fill-red-500 text-red-500 scale-110 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" : "group-hover/like:text-red-500 group-hover/like:scale-110 group-hover/like:drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                            )}
                        />
                        <span className="text-sm font-black tracking-widest">{likesCount}</span>
                    </motion.button>

                    {/* Comment Toggle */}
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        whileHover={{ scale: 1.05 }}
                        onClick={handleToggleComments}
                        className={clsx(
                            "flex items-center gap-2 px-5 py-3 rounded-[1.25rem] transition-all duration-500 group/discuss active:scale-95 shadow-xl backdrop-blur-xl border border-white/10 hover:border-primary/30",
                            showComments
                                ? "bg-primary/20 text-primary shadow-[0_0_20px_rgba(99,102,241,0.3)] border-primary/40"
                                : "bg-white/5 text-on-surface-variant hover:text-primary hover:bg-primary/10"
                        )}
                    >
                        <MessageCircle size={22} className={clsx(showComments && "fill-primary/20 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]")} />
                        <span className="text-sm font-black tracking-widest">{commentsCount}</span>
                        {showComments ? <ChevronUp size={14} className="animate-bounce" /> : <ChevronDown size={14} />}
                    </motion.button>
                </div>
                <div className="flex items-center gap-3">
                    {/* Views */}
                    <div className="flex items-center gap-1.5 text-on-surface-variant/40 bg-surface/50 px-3 py-1.5 rounded-full border border-white/5" title={t('post.views')}>
                        <Eye size={16} />
                        <span className="text-xs font-black">{viewsCount}</span>
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
                                        className="flex-1 w-full min-w-0 px-4 sm:px-5 py-3 bg-white/5 backdrop-blur-md rounded-[1.5rem] border border-white/10 focus:bg-white/10 focus:ring-2 focus:ring-primary/30 focus:border-primary/50 outline-none transition-all duration-300 text-sm font-black text-on-surface placeholder:text-on-surface-variant/40 shadow-inner"
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
                                        className="p-3 bg-primary/20 text-primary border border-primary/30 rounded-[1.25rem] hover:bg-primary hover:text-white hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-30 disabled:scale-100 shadow-[0_0_15px_rgba(99,102,241,0.2)] flex-shrink-0"
                                    >
                                        <Send size={16} />
                                    </button>
                                </div>
                            </form>

                            {/* Comments List */}
                            <div className="space-y-3 max-h-[400px] overflow-y-auto overflow-x-hidden scrollbar-hide overscroll-contain touch-pan-y">
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
                                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1">
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

                                                            {/* Desktop Menu Button & Menu Anchor */}
                                                            <div className="relative ml-auto">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                                                                        setMenuPosition({
                                                                            x: rect.right,
                                                                            y: rect.bottom + 4,
                                                                        });
                                                                        setActiveCommentMenuId(activeCommentMenuId === comment.id ? null : comment.id);
                                                                    }}
                                                                    className={clsx(
                                                                        "comment-menu-btn p-1 rounded-full transition-all",
                                                                        "hidden md:flex text-primary hover:text-primary/80 bg-primary/5 hover:bg-primary/10",
                                                                        activeCommentMenuId === comment.id && "flex !bg-primary/20"
                                                                    )}
                                                                    title={t('common.more_options')}
                                                                >
                                                                    <MoreVertical size={14} />
                                                                </button>

                                                                {renderMenu(comment, false)}
                                                            </div>
                                                        </div>

                                                        <div
                                                            className="bg-white/5 backdrop-blur-md border border-white/10 px-5 py-3 rounded-[1.5rem] rounded-tl-sm w-fit max-w-full text-[15px] font-bold text-on-surface leading-relaxed shadow-lg break-words whitespace-pre-wrap select-none touch-manipulation hover:bg-white/10 transition-colors"
                                                            onTouchStart={(e) => handleTouchStart(e, comment.id)}
                                                            onTouchEnd={handleTouchEnd}
                                                            onTouchMove={handleTouchMove}
                                                            onContextMenu={(e) => e.preventDefault()}
                                                        >
                                                            {editingCommentId === comment.id ? (
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="text"
                                                                        value={editCommentContent}
                                                                        onChange={(e) => setEditCommentContent(e.target.value)}
                                                                        onKeyDown={(e) => { if (e.key === 'Enter') handleEditComment(comment.id); if (e.key === 'Escape') setEditingCommentId(null); }}
                                                                        className="flex-1 bg-transparent outline-none text-sm font-medium min-w-[120px]"
                                                                        autoFocus
                                                                        title={t('common.edit')}
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
                                                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-0.5">
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

                                                                        {/* Reply Desktop Menu Button */}
                                                                        <div className="relative ml-auto">
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                                                                                    setMenuPosition({
                                                                                        x: rect.right,
                                                                                        y: rect.bottom + 4,
                                                                                    });
                                                                                    setActiveCommentMenuId(activeCommentMenuId === reply.id ? null : reply.id);
                                                                                }}
                                                                                className={clsx(
                                                                                    "comment-menu-btn p-0.5 rounded-full transition-all",
                                                                                    "hidden md:flex text-primary hover:text-primary/80 bg-primary/5 hover:bg-primary/10",
                                                                                    activeCommentMenuId === reply.id && "flex !bg-primary/20"
                                                                                )}
                                                                                title={t('common.more_options')}
                                                                            >
                                                                                <MoreVertical size={12} />
                                                                            </button>

                                                                            {renderMenu(reply, true)}
                                                                        </div>
                                                                    </div>
                                                                    <div
                                                                        className="bg-white/5 backdrop-blur-sm border border-white/5 px-4 py-2.5 rounded-[1.25rem] rounded-tl-sm w-fit max-w-full text-[13px] font-bold text-on-surface leading-relaxed shadow-md break-words whitespace-pre-wrap select-none touch-manipulation hover:bg-white/10 transition-colors"
                                                                        onTouchStart={(e) => handleTouchStart(e, reply.id)}
                                                                        onTouchEnd={handleTouchEnd}
                                                                        onTouchMove={handleTouchMove}
                                                                        onContextMenu={(e) => e.preventDefault()}
                                                                    >
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
                                                                                    title={t('common.edit')}
                                                                                    placeholder={t('common.edit')}
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
