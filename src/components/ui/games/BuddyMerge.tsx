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
    }, [tiles, score, bestScore, addRandomTile, isGameOver, isMoving]);

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
        <div className="flex flex-col items-center gap-2 lg:gap-5 w-full max-w-sm mx-auto p-4 select-none">
            {/* Stats */}
            <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-2.5 bg-surface-container-high/50 backdrop-blur-2xl px-3.5 py-2 rounded-2xl border border-outline/10 shadow-lg">
                    <div className="w-6 h-6 rounded-lg bg-primary/15 flex items-center justify-center">
                        <Zap className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[7px] text-on-surface-variant/50 font-black uppercase tracking-[0.2em] leading-none">{t('game.score')}</span>
                        <motion.span
                            key={score}
                            initial={{ scale: 1.2 }}
                            animate={{ scale: 1 }}
                            className="text-xl font-black text-on-surface tabular-nums leading-none mt-0.5"
                        >
                            {score}
                        </motion.span>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 bg-surface-container-high/50 backdrop-blur-2xl px-3.5 py-2 rounded-2xl border border-outline/10 shadow-lg">
                    <Trophy className="w-4 h-4 text-primary/60" />
                    <div className="flex flex-col items-end">
                        <span className="text-[7px] text-on-surface-variant/50 font-black uppercase tracking-[0.2em] leading-none">{t('game.best')}</span>
                        <span className="text-lg font-black text-on-surface/60 tabular-nums leading-none mt-0.5">{bestScore}</span>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="relative aspect-square w-full bg-surface-container-low/30 rounded-[1.8rem] border border-outline/8 backdrop-blur-xl p-2 shadow-2xl">
                {/* Empty Cells Layer */}
                <div className="absolute inset-2 grid grid-cols-4 grid-rows-4 gap-2">
                    {Array.from({ length: 16 }).map((_, i) => (
                        <div key={i} className="bg-surface-container-high/8 rounded-xl" />
                    ))}
                </div>

                {/* Tiles Layer */}
                <div className="absolute inset-2 grid grid-cols-4 grid-rows-4 gap-2 pointer-events-none">
                    <AnimatePresence>
                        {tiles.map((tile) => (
                            <motion.div
                                key={tile.id}
                                layout
                                initial={tile.isNew && !reduceMotion ? { scale: 0, opacity: 0 } : false}
                                animate={{
                                    scale: tile.isMerged && !reduceMotion ? [1, 1.25, 1] : 1,
                                    opacity: tile.isDeleting ? 0 : 1,
                                    zIndex: tile.isDeleting ? 0 : 1
                                }}
                                transition={{
                                    layout: reduceMotion
                                        ? { type: "spring", stiffness: 350, damping: 32, mass: 0.8 }
                                        : { type: "spring", stiffness: 450, damping: 35, mass: 0.8 },
                                    scale: { duration: reduceMotion ? 0.1 : 0.15 },
                                    opacity: { duration: 0.1 }
                                }}
                                style={{
                                    gridRowStart: tile.r + 1,
                                    gridColumnStart: tile.c + 1,
                                }}
                                className={`flex items-center justify-center font-black text-xl lg:text-2xl rounded-xl ${getTileStyle(tile.val)}`}
                            >
                                {tile.val}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Game Over Overlay */}
                <AnimatePresence>
                    {isGameOver && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 backdrop-blur-md p-4 rounded-[1.8rem]"
                        >
                            <div className="bg-surface-container-high/95 border border-outline/15 rounded-[2rem] p-6 shadow-2xl flex flex-col items-center text-center w-full max-w-[240px]">
                                <div className="w-14 h-14 rounded-2xl bg-error/15 flex items-center justify-center mb-3">
                                    <span className="text-2xl">🧩</span>
                                </div>
                                <h3 className="text-xl font-black text-error mb-0.5 uppercase italic tracking-tight">{t('game.merge.game_over')}</h3>
                                <p className="text-base font-bold text-on-surface-variant mb-4">{t('game.merge.final_score', { score })}</p>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={initGame}
                                    className="w-full py-3 bg-gradient-to-r from-primary to-tertiary text-on-primary rounded-xl font-black uppercase tracking-wider text-[10px] shadow-lg"
                                >
                                    {t('game.try_again')}
                                </motion.button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Mobile Controls */}
            <div className={`grid grid-cols-3 gap-1.5 w-full max-w-[200px] mt-2 transition-opacity ${isMoving ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                <div />
                <button onClick={() => move('up')} title={t('game.merge.move_up')} className="p-3.5 bg-surface-container-high/50 backdrop-blur-xl rounded-xl border border-outline/10 flex items-center justify-center active:bg-gradient-to-r active:from-primary active:to-tertiary active:text-on-primary transition-all shadow-md">
                    <ArrowUp className="w-5 h-5" />
                </button>
                <div />
                <button onClick={() => move('left')} title={t('game.merge.move_left')} className="p-3.5 bg-surface-container-high/50 backdrop-blur-xl rounded-xl border border-outline/10 flex items-center justify-center active:bg-gradient-to-r active:from-primary active:to-tertiary active:text-on-primary transition-all shadow-md">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <button onClick={() => move('down')} title={t('game.merge.move_down')} className="p-3.5 bg-surface-container-high/50 backdrop-blur-xl rounded-xl border border-outline/10 flex items-center justify-center active:bg-gradient-to-r active:from-primary active:to-tertiary active:text-on-primary transition-all shadow-md">
                    <ArrowDown className="w-5 h-5" />
                </button>
                <button onClick={() => move('right')} title={t('game.merge.move_right')} className="p-3.5 bg-surface-container-high/50 backdrop-blur-xl rounded-xl border border-outline/10 flex items-center justify-center active:bg-gradient-to-r active:from-primary active:to-tertiary active:text-on-primary transition-all shadow-md">
                    <ArrowRight className="w-5 h-5" />
                </button>
            </div>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={initGame}
                className="flex items-center gap-2 px-6 py-2.5 bg-surface-container-high/50 hover:bg-primary hover:text-on-primary text-on-surface-variant border border-outline/10 rounded-full font-black uppercase tracking-wider text-[9px] transition-all duration-300 shadow-lg backdrop-blur-xl"
            >
                <RotateCcw className="w-4 h-4" />
                {t('game.match.reset')}
            </motion.button>
        </div>
    );
};
