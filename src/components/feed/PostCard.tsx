import { Avatar } from '../ui/Avatar';
import { MessageCircle, Heart, Share2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export interface Post {
    id: string;
    content: string;
    image_url?: string;
    created_at: string;
    likes_count: number;
    user_id: string;
    author: {
        username: string;
        full_name: string;
        avatar_url: string;
    };
}

export const PostCard = ({ post }: { post: Post }) => {
    const { t } = useTranslation();
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            className="p-6 mb-6 bg-surface-container-low/40 backdrop-blur-xl rounded-[40px] border border-outline-variant/10 shadow-xl shadow-primary/5 hover:shadow-2xl hover:shadow-primary/10 hover:bg-surface-container-low/60 transition-all duration-500 group/card relative overflow-hidden"
        >
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover/card:bg-primary/10 transition-colors duration-700" />

            <div className="flex items-center gap-4 mb-5 relative z-10">
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

            <div className="flex items-center justify-between pt-4 border-t border-outline-variant/10 relative z-10">
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-surface-container-low text-on-surface-variant hover:text-red-500 hover:bg-red-500/5 transition-all duration-300 group/like active:scale-95 border border-outline-variant/5 shadow-sm">
                        <Heart size={20} className="group-hover/like:fill-red-500 transition-all duration-300" />
                        <span className="text-sm font-black tracking-tight">{post.likes_count}</span>
                    </button>
                    <button className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-surface-container-low text-on-surface-variant hover:text-primary hover:bg-primary/5 transition-all duration-300 group/discuss active:scale-95 border border-outline-variant/5 shadow-sm">
                        <MessageCircle size={20} className="group-hover/discuss:fill-primary/20 transition-all duration-300" />
                        <span className="text-sm font-black tracking-tight uppercase italic">{t('home.discuss') || 'Discuss'}</span>
                    </button>
                </div>
                <button
                    className="p-3 text-on-surface-variant hover:text-primary rounded-2xl bg-surface-container-low hover:bg-primary/5 transition-all duration-300 border border-outline-variant/5 shadow-sm active:scale-90"
                    title={t('common.share')}
                >
                    <Share2 size={20} />
                </button>
            </div>
        </motion.div>
    );
};
