import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Trophy, RotateCcw, Hash, Users, MessageSquare, Heart, Star, Sparkles, Smile, PartyPopper } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { playSound } from '../../../utils/sounds';

interface Tile {
    id: number;
    type: number;
    isMatched: boolean;
    isFlipped: boolean;
}

const ICON_CONFIGS = [
    { icon: Users, gradient: 'from-blue-500 to-blue-600', glow: 'shadow-blue-500/30' },
    { icon: MessageSquare, gradient: 'from-emerald-500 to-green-600', glow: 'shadow-emerald-500/30' },
    { icon: Heart, gradient: 'from-rose-500 to-red-600', glow: 'shadow-rose-500/30' },
    { icon: Star, gradient: 'from-amber-400 to-yellow-500', glow: 'shadow-amber-400/30' },
    { icon: Sparkles, gradient: 'from-violet-500 to-purple-600', glow: 'shadow-violet-500/30' },
    { icon: Smile, gradient: 'from-orange-400 to-orange-600', glow: 'shadow-orange-400/30' },
    { icon: Trophy, gradient: 'from-amber-500 to-amber-600', glow: 'shadow-amber-500/30' },
    { icon: Hash, gradient: 'from-indigo-500 to-indigo-600', glow: 'shadow-indigo-500/30' }
];

import { usePerformanceMode } from '../../../hooks/usePerformanceMode';

export const BuddyMatch: React.FC = () => {
    const { t } = useTranslation();
    const { reduceEffects } = usePerformanceMode();
    const [tiles, setTiles] = useState<Tile[]>([]);
    const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
    const [moves, setMoves] = useState(0);
    const [bestMoves, setBestMoves] = useState(() => {
        const saved = localStorage.getItem('buddyline_highscore_match');
        return saved ? parseInt(saved) : Infinity;
    });

    const isComplete = tiles.length > 0 && tiles.every(tile => tile.isMatched);

    const initGame = useCallback(() => {
        const types = [0, 1, 2, 3, 4, 5, 6, 7];
        const pairTypes = [...types, ...types];

        for (let i = pairTypes.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pairTypes[i], pairTypes[j]] = [pairTypes[j], pairTypes[i]];
        }

        const newTiles: Tile[] = pairTypes.map((type, index) => ({
            id: index,
            type,
            isMatched: false,
            isFlipped: false
        }));

        setTiles(newTiles);
        setFlippedIndices([]);
        setMoves(0);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => initGame(), 0);
        return () => clearTimeout(timer);
    }, [initGame]);

    useEffect(() => {
        if (flippedIndices.length === 2) {
            const [first, second] = flippedIndices;
            if (tiles[first].type === tiles[second].type) {
                const timer = setTimeout(() => {
                    setTiles(prev => prev.map((tile, idx) =>
                        (idx === first || idx === second) ? { ...tile, isMatched: true } : tile
                    ));
                    setFlippedIndices([]);
                }, 0);
                return () => clearTimeout(timer);
            } else {
                const timer = setTimeout(() => {
                    setTiles(prev => prev.map((tile, idx) =>
                        (idx === first || idx === second) ? { ...tile, isFlipped: false } : tile
                    ));
                    setFlippedIndices([]);
                }, 1000);
                return () => clearTimeout(timer);
            }
        }
    }, [flippedIndices, tiles]);

    useEffect(() => {
        if (isComplete) {
            if (moves < bestMoves) {
                const timer = setTimeout(() => {
                    setBestMoves(moves);
                    localStorage.setItem('buddyline_highscore_match', moves.toString());
                }, 0);
                return () => clearTimeout(timer);
            }
        }
    }, [tiles, moves, bestMoves, isComplete]);

    const handleTileClick = (index: number) => {
        if (flippedIndices.length === 2 || tiles[index].isFlipped || tiles[index].isMatched) return;

        playSound('click', 0.4);
        setTiles(prev => prev.map((tile, idx) => idx === index ? { ...tile, isFlipped: true } : tile));
        setFlippedIndices(prev => [...prev, index]);
        setMoves(prev => prev + 1);
    };

    return (
        <div className="flex flex-col items-center gap-6 lg:gap-10 w-full max-w-sm mx-auto p-4 select-none accelerate">
            {/* Stats Bar - Premium Glass */}
            <div className="flex justify-between items-center w-full px-2">
                <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="flex items-center gap-3 bg-surface-container-high/40 backdrop-blur-3xl px-4 py-2.5 rounded-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                >
                    <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center shadow-lg shadow-primary/20">
                        <Hash className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[8px] text-primary/70 font-black uppercase tracking-[0.2em] leading-none mb-1">{t('game.moves')}</span>
                        <motion.span
                            key={moves}
                            initial={{ scale: 1.2 }}
                            animate={{ scale: 1 }}
                            className="text-2xl font-black text-on-surface tabular-nums leading-none tracking-tight"
                        >
                            {moves}
                        </motion.span>
                    </div>
                </motion.div>

                {isComplete && (
                    <motion.div
                        initial={{ scale: 0, rotate: -10 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="flex items-center gap-3 bg-gradient-to-r from-primary to-tertiary text-white px-5 py-2.5 rounded-full shadow-[0_0_30px_rgba(99,102,241,0.4)] border border-white/20"
                    >
                        <PartyPopper className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase tracking-[0.1em]">Victory!</span>
                    </motion.div>
                )}

                <motion.div
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="flex items-center gap-3 bg-surface-container-high/40 backdrop-blur-3xl px-4 py-2.5 rounded-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                >
                    <div className="w-8 h-8 rounded-xl bg-tertiary/20 flex items-center justify-center shadow-lg shadow-tertiary/20">
                        <Trophy className="w-4 h-4 text-tertiary" />
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[8px] text-tertiary/70 font-black uppercase tracking-[0.2em] leading-none mb-1">{t('game.best')}</span>
                        <span className="text-xl font-black text-on-surface/80 tabular-nums leading-none mt-0.5">
                            {bestMoves === Infinity ? '—' : bestMoves}
                        </span>
                    </div>
                </motion.div>
            </div>

            {/* Grid Area — Liquid Glass style */}
            <div
                style={{ touchAction: 'none' }}
                className={`relative aspect-square w-full bg-gradient-to-br from-surface-container-low/40 to-surface-container-high/10 rounded-[2.5rem] lg:rounded-[3.5rem] border border-white/10 ${reduceEffects ? '' : 'backdrop-blur-xl'} p-6 flex flex-col items-center justify-center overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] accelerate`}
            >
                {/* Background depth items */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute -top-10 -left-10 w-48 h-48 bg-primary/20 blur-[60px] rounded-full animate-pulse" />
                    <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-tertiary/20 blur-[60px] rounded-full" />
                </div>

                <div className="grid grid-cols-4 grid-rows-4 gap-3 w-full h-full relative z-10">
                    {tiles.map((tile, index) => {
                        const config = ICON_CONFIGS[tile.type];
                        const Icon = config.icon;
                        return (
                            <motion.button
                                key={tile.id}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleTileClick(index)}
                                className="relative w-full h-full perspective-1000"
                            >
                                <motion.div
                                    initial={false}
                                    animate={{ rotateY: tile.isFlipped || tile.isMatched ? 180 : 0 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                    className="w-full h-full relative"
                                    style={{ transformStyle: 'preserve-3d' }}
                                >
                                    {/* Front (Closed) - Premium Glass */}
                                    <div
                                        className="absolute inset-0 bg-gradient-to-br from-white/15 to-white/5 border border-white/10 rounded-2xl lg:rounded-3xl flex items-center justify-center shadow-xl backdrop-blur-sm"
                                        style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                                    >
                                        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-white/5 shadow-inner">
                                            <img src="/logo.png" className="w-6 h-6 object-contain opacity-40 grayscale brightness-200" alt="" />
                                        </div>
                                    </div>

                                    {/* Back (Open) - High Contrast Glass */}
                                    <div
                                        className={`absolute inset-0 rounded-2xl lg:rounded-3xl flex items-center justify-center border border-white/20 shadow-2xl transition-all duration-300
                                            ${tile.isMatched
                                                ? `bg-gradient-to-br ${config.gradient} shadow-[0_0_30px_rgba(255,255,255,0.2)]`
                                                : 'bg-surface-container-highest/90 shadow-inner'}`}
                                        style={{
                                            backfaceVisibility: 'hidden',
                                            WebkitBackfaceVisibility: 'hidden',
                                            transform: 'rotateY(180deg)'
                                        }}
                                    >
                                        <Icon className={`w-8 h-8 lg:w-10 lg:h-10 ${tile.isMatched ? 'text-white' : 'text-primary'} drop-shadow-md transition-all`} />
                                        {tile.isMatched && (
                                            <motion.div
                                                initial={{ scale: 0, opacity: 0 }}
                                                animate={{ scale: 1.5, opacity: 0 }}
                                                transition={{ duration: 0.6 }}
                                                className="absolute inset-0 bg-white rounded-2xl lg:rounded-3xl pointer-events-none"
                                            />
                                        )}
                                    </div>
                                </motion.div>
                            </motion.button>
                        );
                    })}
                </div>
            </div>

            {/* Reset Button - Liquid style */}
            <motion.button
                whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(99,102,241,0.2)' }}
                whileTap={{ scale: 0.95 }}
                onClick={initGame}
                className="flex items-center gap-3 px-10 py-3.5 bg-surface-container-high/40 hover:bg-primary hover:text-white text-on-surface-variant/80 border border-white/10 rounded-full font-black uppercase tracking-widest text-xs transition-all duration-300 shadow-xl backdrop-blur-2xl"
            >
                <RotateCcw className="w-4 h-4" />
                {t('game.match.reset')}
            </motion.button>
        </div>
    );
};
