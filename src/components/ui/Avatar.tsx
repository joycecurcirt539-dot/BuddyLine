import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AVATAR_PRESETS, type AvatarPresetKey } from '../../constants/avatarPresets';
import { motion } from 'framer-motion';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface AvatarProps {
    src?: string | null;
    alt?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    className?: string;
    status?: 'online' | 'offline' | 'away' | 'busy';
}

// Container size in px, inner avatar Tailwind class
const RING_SIZES: Record<string, { containerPx: number; avatarClass: string }> = {
    xs: { containerPx: 32, avatarClass: 'w-6 h-6' },
    sm: { containerPx: 40, avatarClass: 'w-8 h-8' },
    md: { containerPx: 50, avatarClass: 'w-10 h-10' },
    lg: { containerPx: 60, avatarClass: 'w-12 h-12' },
    xl: { containerPx: 110, avatarClass: 'w-24 h-24' },
    '2xl': { containerPx: 192, avatarClass: 'w-44 h-44' },
};

const STATUS_CONFIGS: Record<string, { ring: string; glow: string; animation: string }> = {
    online: {
        ring: 'conic-gradient(from 0deg, #10B981, #34D399, #6EE7B7, #10B981)',
        glow: '0 0 16px 4px rgba(16,185,129,0.5)',
        animation: 'avatar-ring-spin 2.4s linear infinite',
    },
    away: {
        ring: 'conic-gradient(from 0deg, #F59E0B, #FBBF24, #FDE68A, #F59E0B)',
        glow: '0 0 12px 3px rgba(245,158,11,0.45)',
        animation: 'avatar-ring-pulse 1.8s ease-in-out infinite',
    },
    busy: {
        ring: 'linear-gradient(135deg, #EF4444, #F87171)',
        glow: '0 0 14px 4px rgba(239,68,68,0.5)',
        animation: 'none',
    },
    offline: {
        ring: 'conic-gradient(from 0deg, rgba(100,116,139,0.35) 60%, transparent 60%)',
        glow: 'none',
        animation: 'none',
    },
};

const AvatarImage = ({
    src, alt, presetKey, avatarClass, extraClass,
}: {
    src?: string | null;
    alt?: string;
    presetKey: AvatarPresetKey | null;
    avatarClass: string;
    extraClass?: string;
}) => {
    const presets = AVATAR_PRESETS as Record<string, React.ReactNode>;
    const PresetIcon = presetKey ? presets[presetKey] : null;

    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-full flex items-center justify-center border border-outline-variant/10 transition-colors duration-300',
                presetKey ? 'logo-container-highlight' : 'bg-surface-container-low',
                avatarClass,
                extraClass,
            )}
        >
            {PresetIcon ? (
                <div className="w-full h-full text-white pb-1">{PresetIcon}</div>
            ) : (src && src.trim() !== '') ? (
                <img src={src} alt={alt || 'Avatar'} className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/5 to-surface-container-high flex items-center justify-center relative group/fallback overflow-hidden">
                    <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                    <div className="w-1/2 h-1/2 bg-gradient-to-br from-indigo-900 via-purple-950 to-black relative z-10 transition-all duration-500 group-hover/fallback:scale-110 shadow-[0_0_15px_rgba(49,46,129,0.3)] mask-logo" />
                </div>
            )}
        </div>
    );
};

export const Avatar = React.memo(({ src, alt, size = 'md', className, status }: AvatarProps) => {
    const dims = RING_SIZES[size];

    const isPreset = src && src.startsWith('preset:');
    const presetKey = isPreset ? src.replace('preset:', '') as AvatarPresetKey : null;

    const cfg = status ? STATUS_CONFIGS[status] : null;

    // No status ring — plain avatar
    if (!cfg) {
        return (
            <div className={cn('relative inline-block rounded-full', className)}>
                <AvatarImage src={src} alt={alt} presetKey={presetKey} avatarClass={dims.avatarClass} />
            </div>
        );
    }

    // With story-ring
    return (
        <div
            className={cn('relative inline-flex items-center justify-center rounded-full shrink-0', className)}
            style={{ width: dims.containerPx, height: dims.containerPx }}
        >
            {/* Animated gradient ring */}
            <div
                className="absolute inset-0 rounded-full"
                style={{
                    background: cfg.ring,
                    animation: cfg.animation,
                    boxShadow: cfg.glow,
                }}
            />
            {/* Gap between ring and avatar */}
            <div
                className="absolute rounded-full bg-surface z-10"
                style={{ inset: '2.5px' }}
            />
            {/* Inner avatar image */}
            <div className="relative z-20 rounded-full overflow-hidden">
                <AvatarImage
                    src={src}
                    alt={alt}
                    presetKey={presetKey}
                    avatarClass={dims.avatarClass}
                />
            </div>

            {/* Pulsing dot for online */}
            {status === 'online' && (
                <motion.div
                    className="absolute bottom-0 right-0 z-30 w-3 h-3 rounded-full bg-emerald-400 border-2 border-surface"
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ boxShadow: '0 0 8px 2px rgba(52,211,153,0.7)' }}
                />
            )}
        </div>
    );
});

Avatar.displayName = 'Avatar';
