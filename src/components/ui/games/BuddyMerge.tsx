import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, RotateCcw, Zap, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { playSound } from '../../../utils/sounds';
import { usePerformanceMode } from '../../../hooks/usePerformanceMode';

interface Tile {
    id: number;
    val: number;
    r: number;
    c: number;
    isNew?: boolean;
    isMerged?: boolean;
    isDeleting?: boolean;
}

export const BuddyMerge: React.FC = () => {
    const { t } = useTranslation();
    const [tiles, setTiles] = useState<Tile[]>([]);
    const [score, setScore] = useState(0);
    const [bestScore, setBestScore] = useState(() => {
        const saved = localStorage.getItem('buddyline_highscore_merge');
        return saved ? parseInt(saved) : 0;
    });
    const [isGameOver, setIsGameOver] = useState(false);
    const [isMoving, setIsMoving] = useState(false);
    const { reduceMotion, reduceEffects } = usePerformanceMode();

    const addRandomTile = useCallback((currentTiles: Tile[]) => {
        const occupied = new Set(currentTiles.map(t => `${t.r}-${t.c}`));
        const empties = [];
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (!occupied.has(`${r}-${c}`)) empties.push({ r, c });
            }
        }
        if (empties.length === 0) return currentTiles;
        const { r, c } = empties[Math.floor(Math.random() * empties.length)];

        const newTile: Tile = {
            id: Date.now() + Math.random(),
            val: Math.random() < 0.9 ? 2 : 4,
            r,
            c,
            isNew: true
        };
        return [...currentTiles, newTile];
    }, []);

    const initGame = useCallback(() => {
        let initialTiles: Tile[] = [];
        initialTiles = addRandomTile(initialTiles);
        initialTiles = addRandomTile(initialTiles);
        setTiles(initialTiles);
        setScore(0);
        setIsGameOver(false);
    }, [addRandomTile]);

    useEffect(() => {
        if (tiles.length === 0) {
            const timer = setTimeout(() => {
                initGame();
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [initGame, tiles.length]);

    const move = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
        if (isGameOver || isMoving) return;

        let hasMoved = false;
        let hasMerged = false;
        let newScore = score;

        const grid: (Tile | null)[][] = Array.from({ length: 4 }, () => Array(4).fill(null));
        tiles.forEach(t => {
            if (t.r >= 0 && t.r < 4 && t.c >= 0 && t.c < 4) {
                grid[t.r][t.c] = { ...t, isMerged: false, isNew: false, isDeleting: false };
            }
        });

        const rotateCCW = (g: (Tile | null)[][]) => {
            const newGrid: (Tile | null)[][] = Array.from({ length: 4 }, () => Array(4).fill(null));
            for (let r = 0; r < 4; r++) {
                for (let c = 0; c < 4; c++) {
                    newGrid[3 - c][r] = g[r][c];
                }
            }
            return newGrid;
        };

        const rotations = { 'left': 0, 'up': 1, 'right': 2, 'down': 3 }[direction];
        let workingGrid = grid;
        for (let i = 0; i < rotations; i++) workingGrid = rotateCCW(workingGrid);

        const disappearingTiles: Tile[] = [];
        for (let r = 0; r < 4; r++) {
            const row = workingGrid[r].filter(t => t !== null) as Tile[];
            const newRow: (Tile | null)[] = [];

            for (let c = 0; c < row.length; c++) {
                if (c + 1 < row.length && row[c].val === row[c + 1].val) {
                    const primary = { ...row[c], val: row[c].val * 2, isMerged: true };
                    const secondary = { ...row[c + 1], isMerged: false, isDeleting: true };
                    newRow.push(primary);
                    disappearingTiles.push({ ...secondary, r, c: newRow.length - 1 });
                    newScore += primary.val;
                    hasMoved = true;
                    hasMerged = true;
                    c++;
                } else {
                    newRow.push({ ...row[c], isMerged: false });
                }
            }

            while (newRow.length < 4) newRow.push(null);

            for (let c = 0; c < 4; c++) {
                if (workingGrid[r][c] !== newRow[c]) hasMoved = true;
                workingGrid[r][c] = newRow[c];
            }
        }

        for (let i = 0; i < (4 - rotations) % 4; i++) workingGrid = rotateCCW(workingGrid);

        const nextTiles: Tile[] = [];
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (workingGrid[r][c]) nextTiles.push({ ...workingGrid[r][c]!, r, c });
            }
        }

        let finalDisappearing = disappearingTiles;
        for (let i = 0; i < (4 - rotations) % 4; i++) {
            const nextD: Tile[] = [];
            finalDisappearing.forEach(t => {
                nextD.push({ ...t, r: 3 - t.c, c: t.r });
            });
            finalDisappearing = nextD;
        }

        if (hasMoved) {
            setIsMoving(true);
            setTiles([...nextTiles, ...finalDisappearing]);
            setScore(newScore);

            if (!reduceEffects) {
                if (hasMerged) {
                    playSound('merge');
                } else {
                    playSound('click');
                }
            }

            if (newScore > bestScore) {
                setBestScore(newScore);
                localStorage.setItem('buddyline_highscore_merge', newScore.toString());
            }

            setTimeout(() => {
                setTiles(prev => {
                    const filtered = prev.filter(t => !t.isDeleting);
                    const withNew = addRandomTile(filtered);
                    const canStillMove = (ts: Tile[]) => {
                        if (ts.length < 16) return true;
                        const g = Array.from({ length: 4 }, () => Array(4).fill(0));
                        ts.forEach(t => g[t.r][t.c] = t.val);
                        for (let r = 0; r < 4; r++) {
                            for (let c = 0; c < 4; c++) {
                                if (c < 3 && g[r][c] === g[r][c + 1]) return true;
                                if (r < 3 && g[r][c] === g[r + 1][c]) return true;
                            }
                        }
                        return false;
                    };
                    if (!canStillMove(withNew)) setIsGameOver(true);
                    return withNew.map(t => ({ ...t, isMerged: false }));
                });
                setIsMoving(false);
            }, 150);
        }
    }, [tiles, score, bestScore, addRandomTile, isGameOver, isMoving, reduceEffects]);

    // Keyboard support
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isMoving || isGameOver) return;
            if (e.key === 'ArrowUp') move('up');
            if (e.key === 'ArrowDown') move('down');
            if (e.key === 'ArrowLeft') move('left');
            if (e.key === 'ArrowRight') move('right');
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [move, isMoving, isGameOver]);

    const getTileStyle = (val: number) => {
        switch (val) {
            case 2: return 'bg-surface-container-highest/60 text-on-surface/80';
            case 4: return 'bg-primary/10 text-primary';
            case 8: return 'bg-gradient-to-br from-primary/25 to-primary/15 text-primary';
            case 16: return 'bg-gradient-to-br from-primary/50 to-primary/35 text-on-primary';
            case 32: return 'bg-gradient-to-br from-primary/70 to-primary/55 text-on-primary';
            case 64: return 'bg-gradient-to-br from-primary to-primary/80 text-on-primary shadow-md shadow-primary/20';
            case 128: return 'bg-gradient-to-br from-primary to-tertiary text-on-primary shadow-lg shadow-primary/30';
            case 256: return 'bg-gradient-to-br from-tertiary/70 to-tertiary text-on-tertiary shadow-lg';
            case 512: return 'bg-gradient-to-br from-tertiary to-secondary text-on-tertiary shadow-xl';
            case 1024: return 'bg-gradient-to-br from-secondary to-tertiary text-white shadow-xl ring-2 ring-white/10';
            case 2048: return 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-2xl ring-4 ring-amber-400/20';
            default: return 'bg-surface-container-high/20 text-on-surface/10';
        }
    };

    return (
        <div className="flex flex-col items-center gap-4 lg:gap-8 w-full max-w-sm mx-auto p-4 select-none accelerate">
            {/* Stats - Premium Glass */}
            <div className="flex justify-between items-center w-full px-2">
                <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="flex items-center gap-3 bg-surface-container-high/40 backdrop-blur-3xl px-4 py-2.5 rounded-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                >
                    <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center shadow-lg shadow-primary/20">
                        <Zap className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[8px] text-primary/70 font-black uppercase tracking-[0.2em] leading-none mb-1">{t('game.score')}</span>
                        <motion.span
                            key={score}
                            initial={{ scale: 1.2 }}
                            animate={{ scale: 1 }}
                            className="text-2xl font-black text-on-surface tabular-nums leading-none tracking-tight"
                        >
                            {score}
                        </motion.span>
                    </div>
                </motion.div>

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
                        <span className="text-xl font-black text-on-surface/80 tabular-nums leading-none mt-0.5">{bestScore}</span>
                    </div>
                </motion.div>
            </div>

            {/* Game Grid — Liquid Style */}
            <div
                className="touch-none relative w-full aspect-square bg-gradient-to-br from-surface-container-low/40 to-surface-container-high/10 p-3 rounded-[2.5rem] lg:rounded-[3.5rem] border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] overflow-hidden"
            >
                {/* Background depth items */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute -top-10 -left-10 w-48 h-48 bg-primary/20 blur-[60px] rounded-full animate-pulse" />
                    <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-tertiary/20 blur-[60px] rounded-full" />
                </div>

                {/* Grid Slots */}
                <div className="absolute inset-3 grid grid-cols-4 grid-rows-4 gap-3">
                    {Array.from({ length: 16 }).map((_, i) => (
                        <div key={i} className="bg-white/[0.03] border border-white/[0.02] rounded-2xl lg:rounded-3xl" />
                    ))}
                </div>

                {/* Tiles Layer */}
                <div className="absolute inset-3 grid grid-cols-4 grid-rows-4 gap-3 pointer-events-none">
                    <AnimatePresence initial={false}>
                        {tiles.map((tile) => (
                            <motion.div
                                key={tile.id}
                                layout={!reduceMotion}
                                initial={tile.isNew && !reduceMotion ? { scale: 0, opacity: 0 } : false}
                                animate={{
                                    scale: tile.isMerged && !reduceMotion ? [1, 1.15, 1] : 1,
                                    opacity: tile.isDeleting ? 0 : 1,
                                    zIndex: tile.isDeleting ? 0 : 1
                                }}
                                transition={{
                                    layout: { type: "spring", stiffness: 450, damping: 35, mass: 0.8 },
                                    scale: { duration: 0.15 },
                                    opacity: { duration: 0.1 }
                                }}
                                // @ts-expect-error: Inline styles needed for dynamic grid positioning
                                style={{
                                    gridRowStart: tile.r + 1,
                                    gridColumnStart: tile.c + 1,
                                }}
                                className={`flex items-center justify-center font-black text-2xl lg:text-3xl rounded-2xl lg:rounded-3xl shadow-xl border border-white/10 transition-shadow duration-300 accelerate ${getTileStyle(tile.val)}`}
                            >
                                <span className="drop-shadow-md">{tile.val}</span>
                                {tile.val >= 128 && (
                                    <div className="absolute inset-0 rounded-2xl lg:rounded-3xl bg-white/10 animate-pulse pointer-events-none" />
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Game Over Overlay - Premium */}
                <AnimatePresence>
                    {isGameOver && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-xl p-6 rounded-[2.5rem]"
                        >
                            <div className="bg-surface-container-high/90 border border-white/10 rounded-[2.5rem] p-6 shadow-2xl flex flex-col items-center justify-center aspect-square text-center w-full max-w-[220px] relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-error/10 to-transparent" />
                                <div className="w-12 h-12 rounded-[1rem] bg-error/20 flex items-center justify-center mb-4 shadow-xl shadow-error/20 relative z-10 transition-transform duration-500 scale-110">
                                    <img src="/logo.png" className="w-[60%] h-[60%] object-contain brightness-200" alt="logo" />
                                </div>
                                <h3 className="text-xl font-black text-error mb-2 uppercase italic tracking-tight relative z-10">{t('game.merge.game_over')}</h3>
                                <div className="flex flex-col items-center gap-1 mb-6 relative z-10">
                                    <span className="text-[9px] font-black text-on-surface/40 uppercase tracking-[0.2em]">{t('game.score')}</span>
                                    <span className="text-3xl font-black text-on-surface">{score}</span>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(99,102,241,0.3)' }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={initGame}
                                    className="w-full py-4 bg-gradient-to-r from-primary to-tertiary text-white rounded-2xl font-black uppercase tracking-[0.1em] text-xs shadow-xl shadow-primary/25 relative z-10"
                                >
                                    {t('game.try_again')}
                                </motion.button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Mobile Controls — Premium Glass Floating */}
            <div className={`grid grid-cols-3 gap-3 w-full max-w-[240px] mt-4 transition-opacity ${isMoving ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                <div />
                <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => move('up')}
                    className="aspect-square bg-surface-container-high/40 backdrop-blur-3xl rounded-2xl border border-white/10 flex items-center justify-center active:bg-primary shadow-lg"
                >
                    <ArrowUp className="w-7 h-7 opacity-80" />
                </motion.button>
                <div />
                <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => move('left')}
                    className="aspect-square bg-surface-container-high/40 backdrop-blur-3xl rounded-2xl border border-white/10 flex items-center justify-center active:bg-primary shadow-lg"
                >
                    <ArrowLeft className="w-7 h-7 opacity-80" />
                </motion.button>
                <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => move('down')}
                    className="aspect-square bg-surface-container-high/40 backdrop-blur-3xl rounded-2xl border border-white/10 flex items-center justify-center active:bg-primary shadow-lg"
                >
                    <ArrowDown className="w-7 h-7 opacity-80" />
                </motion.button>
                <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => move('right')}
                    className="aspect-square bg-surface-container-high/40 backdrop-blur-3xl rounded-2xl border border-white/10 flex items-center justify-center active:bg-primary shadow-lg"
                >
                    <ArrowRight className="w-7 h-7 opacity-80" />
                </motion.button>
            </div>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={initGame}
                className="flex items-center gap-2 px-8 py-3 bg-surface-container-high/40 hover:bg-primary hover:text-white text-on-surface-variant/80 border border-white/10 rounded-full font-black uppercase tracking-widest text-[10px] transition-all duration-300 shadow-xl backdrop-blur-2xl mt-4"
            >
                <RotateCcw className="w-4 h-4" />
                {t('game.match.reset')}
            </motion.button>
        </div>
    );
};
