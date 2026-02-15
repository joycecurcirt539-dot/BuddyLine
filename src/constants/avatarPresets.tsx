import { Sparkles, Ghost, Cat, Flame, Zap, Moon, Rocket, Palette } from 'lucide-react';
import React from 'react';

export const AVATAR_PRESETS: Record<string, React.ReactNode> = {
    sparkles: (
        <div className="w-full h-full bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600 flex items-center justify-center p-2 shadow-inner">
            <Sparkles className="w-full h-full text-white drop-shadow-lg" />
        </div>
    ),
    ghost: (
        <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 flex items-center justify-center p-2 shadow-inner">
            <Ghost className="w-full h-full text-white drop-shadow-lg" />
        </div>
    ),
    cat: (
        <div className="w-full h-full bg-gradient-to-br from-pink-400 via-rose-500 to-red-600 flex items-center justify-center p-2 shadow-inner">
            <Cat className="w-full h-full text-white drop-shadow-lg" />
        </div>
    ),
    zap: (
        <div className="w-full h-full bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 flex items-center justify-center p-2 shadow-inner">
            <Zap className="w-full h-full text-white drop-shadow-lg fill-white/20" />
        </div>
    ),
    flame: (
        <div className="w-full h-full bg-gradient-to-br from-orange-400 via-red-500 to-red-800 flex items-center justify-center p-2 shadow-inner">
            <Flame className="w-full h-full text-white drop-shadow-lg" />
        </div>
    ),
    rocket: (
        <div className="w-full h-full bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-800 flex items-center justify-center p-2 shadow-inner">
            <Rocket className="w-full h-full text-white drop-shadow-lg -rotate-12" />
        </div>
    ),
    moon: (
        <div className="w-full h-full bg-gradient-to-br from-slate-700 via-slate-800 to-slate-950 flex items-center justify-center p-2 shadow-inner">
            <Moon className="w-full h-full text-blue-100 drop-shadow-lg fill-blue-100/10" />
        </div>
    ),
    palette: (
        <div className="w-full h-full bg-white flex items-center justify-center p-2 shadow-inner">
            <Palette className="w-full h-full text-primary drop-shadow-md" />
        </div>
    )
};

export type AvatarPresetKey = keyof typeof AVATAR_PRESETS;
