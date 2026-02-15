import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AVATAR_PRESETS, type AvatarPresetKey } from '../../constants/avatarPresets';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface AvatarProps {
    src?: string | null;
    alt?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    className?: string;
    status?: 'online' | 'offline' | 'away';
}

export const Avatar = ({ src, alt, size = 'md', className, status }: AvatarProps) => {
    const sizes = {
        sm: 'w-8 h-8',
        md: 'w-10 h-10',
        lg: 'w-12 h-12',
        xl: 'w-24 h-24',
        '2xl': 'w-32 h-32 lg:w-48 lg:h-48',
    };

    const statusColors = {
        online: 'bg-green-500',
        offline: 'bg-gray-400',
        away: 'bg-yellow-500',
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
                            className="w-1/2 h-1/2 bg-gradient-to-br from-indigo-900 via-purple-950 to-black relative z-10 transition-all duration-500 group-hover/fallback:scale-110 shadow-[0_0_15px_rgba(49,46,129,0.3)]"
                            style={{
                                maskImage: 'url(/logo.svg)',
                                maskRepeat: 'no-repeat',
                                maskPosition: 'center',
                                maskSize: 'contain',
                                WebkitMaskImage: 'url(/logo.svg)',
                                WebkitMaskRepeat: 'no-repeat',
                                WebkitMaskPosition: 'center',
                                WebkitMaskSize: 'contain'
                            }}
                        />
                    </div>
                )}
            </div>
            {status && (
                <span
                    className={cn(
                        'absolute bottom-0 right-0 block rounded-full ring-2 ring-white',
                        size === 'sm' ? 'w-2 h-2' : size === '2xl' ? 'w-6 h-6 lg:w-8 lg:h-8 border-4' : 'w-3 h-3',
                        statusColors[status]
                    )}
                />
            )}
        </div>
    );
};
