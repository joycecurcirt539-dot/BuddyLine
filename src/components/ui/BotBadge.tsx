import { clsx } from 'clsx';
import { Sparkles } from 'lucide-react';

interface BotBadgeProps {
    username?: string;
    className?: string;
    type?: 'bot' | 'ai';
}

export const BotBadge = ({ username, className, type = 'ai' }: BotBadgeProps) => {
    // Only show for buddy_test for now
    if (username !== 'buddy_test') return null;

    return (
        <span className={clsx(
            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest bg-tertiary/10 text-tertiary border border-tertiary/20 shadow-sm shadow-tertiary/5 select-none",
            className
        )}>
            <Sparkles size={10} className="animate-pulse" />
            {type === 'ai' ? 'AI' : 'BOT'}
        </span>
    );
};
