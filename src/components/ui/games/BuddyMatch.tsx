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

export const BuddyMatch: React.FC = () => {
    const { t } = useTranslation();
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
        <div className="flex flex-col items-center gap-3 lg:gap-6 w-full max-w-md mx-auto">
            {/* Stats Bar */}
            <div className="flex justify-between items-center w-full px-3">
                <div className="flex items-center gap-2.5 bg-surface-container-high/50 backdrop-blur-2xl px-4 py-2.5 rounded-2xl border border-outline/10 shadow-lg">
                    <Hash className="w-4 h-4 text-primary" />
                    <div className="flex flex-col">
                        <span className="text-[7px] text-on-surface-variant/50 font-black uppercase tracking-[0.2em] leading-none">{t('game.moves')}</span>
                        <span className="text-lg font-black text-on-surface tabular-nums leading-none mt-0.5">{moves}</span>
                    </div>
                </div>

                {isComplete && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-2 bg-gradient-to-r from-primary to-tertiary text-on-primary px-4 py-2 rounded-full shadow-lg"
                    >
                        <PartyPopper className="w-4 h-4" />
                        <span className="text-xs font-black uppercase">GG!</span>
                    </motion.div>
                )}

                <div className="flex items-center gap-2.5 bg-surface-container-high/50 backdrop-blur-2xl px-4 py-2.5 rounded-2xl border border-outline/10 shadow-lg">
                    <Trophy className="w-4 h-4 text-primary/60" />
                    <div className="flex flex-col items-end">
                        <span className="text-[7px] text-on-surface-variant/50 font-black uppercase tracking-[0.2em] leading-none">{t('game.best')}</span>
                        <span className="text-lg font-black text-on-surface/60 tabular-nums leading-none mt-0.5">
                            {bestMoves === Infinity ? '—' : bestMoves}
                        </span>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-4 gap-2.5 lg:gap-3 w-full aspect-square p-3 bg-surface-container-low/30 rounded-[1.8rem] border border-outline/8 backdrop-blur-xl shadow-2xl">
                {tiles.map((tile, index) => {
                    const config = ICON_CONFIGS[tile.type];
                    const Icon = config.icon;
                    return (
                        <motion.button
                            key={tile.id}
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.94 }}
                            onClick={() => handleTileClick(index)}
                            className="relative w-full h-full perspective-1000"
                        >
                            <motion.div
                                initial={false}
                                animate={{ rotateY: tile.isFlipped || tile.isMatched ? 180 : 0 }}
                                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                                className="w-full h-full relative"
                                style={{ transformStyle: 'preserve-3d' }}
                            >
                                {/* Front (Closed) */}
                                <div
                                    className="absolute inset-0 bg-gradient-to-br from-surface-container-high/80 to-surface-container-high/40 border border-outline/10 rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg"
                                    style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                                >
                                    <div className="w-8 h-8 rounded-full bg-primary/8 flex items-center justify-center">
                                        <img src="/logo.png" className="w-4 h-4 object-contain opacity-40" alt="" />
                                    </div>
                                </div>

                                {/* Back (Open) */}
                                <div
                                    className={`absolute inset-0 rounded-xl lg:rounded-2xl flex items-center justify-center
                                        ${tile.isMatched
                                            ? `bg-gradient-to-br ${config.gradient} shadow-xl ${config.glow}`
                                            : 'bg-surface-container-highest/90 border border-outline/15 shadow-lg'}`}
                                    style={{
                                        backfaceVisibility: 'hidden',
                                        WebkitBackfaceVisibility: 'hidden',
                                        transform: 'rotateY(180deg)'
                                    }}
                                >
                                    <Icon className={`w-8 h-8 lg:w-10 lg:h-10 ${tile.isMatched ? 'text-white drop-shadow-md' : 'text-on-surface'} transition-all`} />
                                </div>
                            </motion.div>
                        </motion.button>
                    );
                })}
            </div>

            {/* Reset Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={initGame}
                className="flex items-center gap-2.5 px-7 py-2.5 bg-surface-container-high/50 hover:bg-primary hover:text-on-primary text-on-surface-variant border border-outline/10 rounded-full font-black uppercase tracking-wider text-[10px] transition-all duration-300 shadow-lg backdrop-blur-xl"
            >
                <RotateCcw className="w-4 h-4" />
                {t('game.match.reset')}
            </motion.button>
        </div>
    );
};
