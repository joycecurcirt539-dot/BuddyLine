import { clsx } from 'clsx';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface UserBadgeProps {
    username?: string;
    isVerified?: boolean;
    className?: string;
}

export const UserBadge = ({ username, isVerified, className }: UserBadgeProps) => {
    const { t } = useTranslation();
    // AI Badge for specific accounts
    const isAI = username?.toLowerCase() === 'buddy_test';

    if (isAI) {
        return (
            <span className={clsx(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest bg-tertiary/10 text-tertiary border border-tertiary/20 shadow-sm shadow-tertiary/5 select-none",
                className
            )}>
                <Sparkles size={10} className="animate-pulse" />
                {t('common.ai', 'AI')}
            </span>
        );
    }

    // Verification Checkmark for human users
    if (isVerified) {
        return (
            <CheckCircle2
                size={14}
                className={clsx("text-primary fill-primary/10", className)}
            />
        );
    }

    return null;
};
