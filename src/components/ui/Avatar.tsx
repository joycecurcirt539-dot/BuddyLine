import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AVATAR_PRESETS, type AvatarPresetKey } from '../../constants/avatarPresets';

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

export const Avatar = React.memo(({ src, alt, size = 'md', className, status }: AvatarProps) => {
    const sizes = {
        xs: 'w-6 h-6',
        sm: 'w-8 h-8',
        md: 'w-10 h-10',
        lg: 'w-12 h-12',
        xl: 'w-24 h-24',
        '2xl': 'w-32 h-32 lg:w-48 lg:h-48'
    };

    const statusColors = {
        online: 'bg-green-500',
        offline: 'bg-gray-400',
        away: 'bg-yellow-500',
        busy: 'bg-red-500'
    };

    const dotSizes = {
        xs: 'w-2 h-2',
        sm: 'w-2.5 h-2.5',
        md: 'w-3.5 h-3.5',
        lg: 'w-4 h-4',
        xl: 'w-6 h-6',
        '2xl': 'w-6 h-6 lg:w-8 lg:h-8 border-4'
    };

    const isPreset = src && src.startsWith('preset:');
    const presetKey = isPreset ? src.replace('preset:', '') as AvatarPresetKey : null;
    const presets = AVATAR_PRESETS as Record<string, React.ReactNode>;
    const PresetIcon = presetKey ? presets[presetKey] : null;

    return (
        <div className="relative inline-block">
            <div
                className={cn(
                    'relative overflow-hidden rounded-full flex items-center justify-center border border-outline-variant/10 transition-colors duration-300',
                    presetKey ? 'logo-container-highlight' : 'bg-surface-container-low',
                    sizes[size as keyof typeof sizes],
                    className
                )}
            >
                {PresetIcon ? (
                    <div className="w-full h-full text-white pb-1">
                        {PresetIcon}
                    </div>
                ) : (src && src.trim() !== '') ? (
                    <img src={src} alt={alt || 'Avatar'} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/5 to-surface-container-high flex items-center justify-center relative group/fallback overflow-hidden">
                        <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                        <div
                            className="w-1/2 h-1/2 bg-gradient-to-br from-indigo-900 via-purple-950 to-black relative z-10 transition-all duration-500 group-hover/fallback:scale-110 shadow-[0_0_15px_rgba(49,46,129,0.3)] mask-logo"
                        />
                    </div>
                )}
            </div>
            {status && (
                <span
                    className={cn(
                        'absolute block rounded-full ring-2 ring-surface transition-all duration-300 z-10',
                        size === 'xl' || size === '2xl' ? 'bottom-1 right-1' : 'bottom-0.5 right-0.5',
                        dotSizes[size as keyof typeof dotSizes],
                        statusColors[status],
                        status === 'online' && 'shadow-[0_0_10px_rgba(34,197,94,0.4)] animate-pulse'
                    )}
                />
            )}
        </div>
    );
});

Avatar.displayName = 'Avatar';
