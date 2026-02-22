import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bomb, Flag, RefreshCw, Trophy, MousePointer2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { playSound } from '../../../utils/sounds';

interface Cell {
    r: number;
    c: number;
    isMine: boolean;
    isRevealed: boolean;
    isFlagged: boolean;
    neighborMines: number;
}

const GRID_SIZE = 8;
const MINE_COUNT = 10;

import { usePerformanceMode } from '../../../hooks/usePerformanceMode';

export const BuddyMines: React.FC = () => {
    const { t } = useTranslation();
    const { reduceEffects } = usePerformanceMode();
    const [grid, setGrid] = useState<Cell[][]>([]);
    const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
    const [flagCount, setFlagCount] = useState(0);
    const [timer, setTimer] = useState(0);
    const [isFirstClick, setIsFirstClick] = useState(true);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const initGrid = useCallback(() => {
        const newGrid: Cell[][] = [];
        for (let r = 0; r < GRID_SIZE; r++) {
            const row: Cell[] = [];
            for (let c = 0; c < GRID_SIZE; c++) {
                row.push({
                    r, c,
                    isMine: false,
                    isRevealed: false,
                    isFlagged: false,
                    neighborMines: 0
                });
            }
            newGrid.push(row);
        }
        setGrid(newGrid);
        setGameState('playing');
        setFlagCount(0);
        setTimer(0);
        setIsFirstClick(true);
    }, []);

    useEffect(() => {
        if (grid.length === 0) {
            const timer = setTimeout(() => initGrid(), 0);
            return () => clearTimeout(timer);
        }
    }, [initGrid, grid.length]);

    useEffect(() => {
        if (gameState === 'playing' && !isFirstClick) {
            timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
        }
        return () => {
            if (timerRef.current !== null) {
                clearInterval(timerRef.current);
            }
        };
    }, [gameState, isFirstClick]);

    const revealCell = useCallback((r: number, c: number) => {
        if (gameState !== 'playing' || grid[r][c].isRevealed || grid[r][c].isFlagged) return;

        const newGrid = [...grid.map(row => [...row])];

        if (isFirstClick) {
            let minesPlaced = 0;
            while (minesPlaced < MINE_COUNT) {
                const randomR = Math.floor(Math.random() * GRID_SIZE);
                const randomC = Math.floor(Math.random() * GRID_SIZE);

                const isNearFirstClick = Math.abs(randomR - r) <= 1 && Math.abs(randomC - c) <= 1;

                if (!isNearFirstClick && !newGrid[randomR][randomC].isMine) {
                    newGrid[randomR][randomC].isMine = true;
                    minesPlaced++;
                }
            }

            for (let row = 0; row < GRID_SIZE; row++) {
                for (let col = 0; col < GRID_SIZE; col++) {
                    if (!newGrid[row][col].isMine) {
                        let count = 0;
                        for (let dr = -1; dr <= 1; dr++) {
                            for (let dc = -1; dc <= 1; dc++) {
                                const nr = row + dr;
                                const nc = col + dc;
                                if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && newGrid[nr][nc].isMine) {
                                    count++;
                                }
                            }
                        }
                        newGrid[row][col].neighborMines = count;
                    }
                }
            }
            setIsFirstClick(false);
            playSound('mine_start', 0.5);
        }

        if (newGrid[r][c].isMine) {
            playSound('mine_explode', 0.6);
            setGameState('lost');
            newGrid.forEach(row => row.forEach(cell => {
                if (cell.isMine) cell.isRevealed = true;
            }));
            setGrid(newGrid);
            return;
        }

        const revealRecursive = (row: number, col: number) => {
            if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE || newGrid[row][col].isRevealed) return;
            newGrid[row][col].isRevealed = true;
            if (newGrid[row][col].neighborMines === 0) {
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        revealRecursive(row + dr, col + dc);
                    }
                }
            }
        };

        revealRecursive(r, c);
        playSound('mine_reveal', 0.4);
        const unrevealedSafe = newGrid.flat().filter(cell => !cell.isMine && !cell.isRevealed).length;
        if (unrevealedSafe === 0) {
            playSound('mine_win', 0.6);
            setGameState('won');
        }
        setGrid(newGrid);
    }, [grid, gameState, isFirstClick]);

    const toggleFlag = useCallback((e: React.MouseEvent, r: number, c: number) => {
        e.preventDefault();
        if (gameState !== 'playing' || grid[r][c].isRevealed) return;

        const newGrid = [...grid.map(row => [...row])];
        const cell = newGrid[r][c];

        if (!cell.isFlagged && flagCount >= MINE_COUNT) return;

        cell.isFlagged = !cell.isFlagged;
        playSound('mine_flag', 0.5);
        setFlagCount(prev => cell.isFlagged ? prev + 1 : prev - 1);
        setGrid(newGrid);
    }, [grid, gameState, flagCount]);

    const getNumberColor = (n: number) => {
        switch (n) {
            case 1: return 'text-blue-400';
            case 2: return 'text-emerald-400';
            case 3: return 'text-rose-400';
            case 4: return 'text-violet-400';
            case 5: return 'text-amber-400';
            default: return 'text-primary';
        }
    };

    return (
        <div className="flex flex-col items-center gap-4 lg:gap-8 w-full max-w-md mx-auto p-4 select-none accelerate">
            {/* Stats Bar - Premium Glass */}
            <div className="flex justify-between items-center w-full px-2">
                <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="flex items-center gap-3 bg-surface-container-high/40 backdrop-blur-3xl px-4 py-2.5 rounded-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] accelerate"
                >
                    <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center shadow-lg shadow-primary/20">
                        <Bomb className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[8px] text-primary/70 font-black uppercase tracking-[0.2em] leading-none mb-1">Mines</span>
                        <motion.span
                            key={flagCount}
                            className="text-2xl font-black text-on-surface tabular-nums leading-none tracking-tight"
                        >
                            {MINE_COUNT - flagCount}
                        </motion.span>
                    </div>
                </motion.div>

                <div className="flex items-center gap-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center bg-surface-container-high/40 backdrop-blur-3xl px-6 py-2 rounded-2xl border border-white/10 shadow-lg"
                    >
                        <span className="text-[8px] text-on-surface-variant/50 font-black uppercase tracking-[0.2em] leading-none mb-1">Time</span>
                        <span className="text-xl font-black text-on-surface tabular-nums leading-none">{timer}s</span>
                    </motion.div>

                    <motion.button
                        whileHover={{ scale: 1.1, rotate: 180 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={initGrid}
                        className="w-12 h-12 flex items-center justify-center bg-primary/20 backdrop-blur-3xl text-primary rounded-2xl border border-primary/20 hover:bg-primary hover:text-white transition-all shadow-lg shadow-primary/20"
                        title="Restart"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </motion.button>
                </div>
            </div>

            {/* Grid Area — Liquid Glass style */}
            <div
                style={{ touchAction: 'none' }}
                className={`relative p-4 bg-gradient-to-br from-surface-container-low/40 to-surface-container-high/10 rounded-[2.5rem] border border-white/10 ${reduceEffects ? '' : 'backdrop-blur-xl'} shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] overflow-hidden accelerate`}
            >
                {/* Background depth effects */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute -top-10 -left-10 w-48 h-48 bg-primary/20 blur-[60px] rounded-full animate-pulse" />
                    <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-tertiary/20 blur-[60px] rounded-full" />
                </div>

                <div className="grid grid-cols-8 gap-2 relative z-10">
                    {grid.map((row, r) => row.map((cell, c) => (
                        <motion.button
                            key={`${r}-${c}`}
                            initial={false}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => revealCell(r, c)}
                            onContextMenu={(e) => toggleFlag(e, r, c)}
                            className={`
                                w-8 h-8 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center font-black transition-all duration-300
                                ${cell.isRevealed
                                    ? cell.isMine
                                        ? 'bg-gradient-to-br from-error to-rose-700 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] border-transparent'
                                        : 'bg-white/[0.03] border border-white/[0.05] shadow-inner'
                                    : 'bg-gradient-to-br from-white/10 to-white/[0.02] border border-white/10 hover:border-white/20 shadow-lg'
                                }
                            `}
                        >
                            <AnimatePresence mode='wait'>
                                {cell.isRevealed ? (
                                    cell.isMine ? (
                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} key="bomb">
                                            <Bomb className="w-5 h-5 drop-shadow-md" />
                                        </motion.div>
                                    ) : (
                                        cell.neighborMines > 0 ? (
                                            <motion.span
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                key="num"
                                                className={`${getNumberColor(cell.neighborMines)} font-black text-sm lg:text-base drop-shadow-sm`}
                                            >
                                                {cell.neighborMines}
                                            </motion.span>
                                        ) : null
                                    )
                                ) : (
                                    cell.isFlagged ? (
                                        <motion.div initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} key="flag">
                                            <Flag className="w-4 h-4 text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.5)]" />
                                        </motion.div>
                                    ) : null
                                )}
                            </AnimatePresence>
                        </motion.button>
                    )))}
                </div>

                {/* Overlays - Premium Victory/Defeat */}
                <AnimatePresence>
                    {gameState !== 'playing' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-xl rounded-[2.5rem] p-8"
                        >
                            <div className="bg-surface-container-high/90 border border-white/10 rounded-[3rem] p-8 shadow-2xl flex flex-col items-center text-center w-full max-w-[260px] relative overflow-hidden">
                                <div className={`absolute inset-0 bg-gradient-to-br ${gameState === 'won' ? 'from-primary/10' : 'from-error/10'} to-transparent`} />

                                {gameState === 'won' ? (
                                    <>
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-primary/20 flex items-center justify-center mb-6 shadow-xl shadow-primary/20 relative z-10">
                                            <Trophy className="w-8 h-8 text-primary" />
                                        </div>
                                        <h3 className="text-2xl font-black bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent mb-1 uppercase italic tracking-tight relative z-10">{t('game.mines.win_title')}</h3>
                                        <div className="flex flex-col items-center gap-1 mb-8 relative z-10">
                                            <span className="text-[10px] font-black text-on-surface/40 uppercase tracking-[0.2em]">Accuracy</span>
                                            <span className="text-4xl font-black text-on-surface">{timer}s</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-error/20 flex items-center justify-center mb-6 shadow-xl shadow-error/20 relative z-10">
                                            <Bomb className="w-8 h-8 text-error" />
                                        </div>
                                        <h3 className="text-2xl font-black text-error mb-1 uppercase italic tracking-tight relative z-10">{t('game.mines.lose_title')}</h3>
                                        <p className="text-sm font-bold text-on-surface-variant/60 mb-8 relative z-10">{t('game.mines.lose_subtitle')}</p>
                                    </>
                                )}

                                <motion.button
                                    whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(99,102,241,0.3)' }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={initGrid}
                                    className="w-full py-4 bg-gradient-to-r from-primary to-tertiary text-white rounded-2xl font-black uppercase tracking-[0.1em] text-xs shadow-xl shadow-primary/25 relative z-10"
                                >
                                    {t('game.try_again')}
                                </motion.button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Instructions - Premium subtle */}
            <div className="flex items-center justify-center gap-8 text-[10px] font-black text-on-surface-variant/30 uppercase tracking-[0.25em]">
                <div className="flex items-center gap-2 transition-colors hover:text-on-surface-variant/60 cursor-default">
                    <MousePointer2 className="w-4 h-4" /> {t('game.mines.hint_reveal')}
                </div>
                <div className="flex items-center gap-2 transition-colors hover:text-on-surface-variant/60 cursor-default">
                    <Flag className="w-4 h-4" /> {t('game.mines.hint_flag')}
                </div>
            </div>
        </div>
    );
};
