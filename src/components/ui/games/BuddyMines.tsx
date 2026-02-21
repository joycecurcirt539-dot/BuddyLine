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

export const BuddyMines: React.FC = () => {
    const { t } = useTranslation();
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
        <div className="flex flex-col items-center gap-3 w-full max-w-md mx-auto p-4 select-none">
            {/* Stats */}
            <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-2.5 bg-surface-container-high/50 backdrop-blur-2xl px-3.5 py-2 rounded-2xl border border-outline/10 shadow-lg">
                    <div className="w-6 h-6 rounded-lg bg-primary/15 flex items-center justify-center">
                        <Bomb className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[7px] text-on-surface-variant/50 font-black uppercase tracking-[0.2em] leading-none">Mines</span>
                        <span className="text-xl font-black text-on-surface tabular-nums leading-none mt-0.5">{MINE_COUNT - flagCount}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 bg-surface-container-high/50 backdrop-blur-2xl px-3.5 py-2 rounded-2xl border border-outline/10 shadow-lg">
                    <div className="flex flex-col items-center">
                        <span className="text-[7px] text-on-surface-variant/50 font-black uppercase tracking-[0.2em] leading-none">Time</span>
                        <span className="text-xl font-black text-on-surface tabular-nums leading-none mt-0.5">{timer}s</span>
                    </div>
                </div>

                <button
                    onClick={initGrid}
                    className="w-10 h-10 flex items-center justify-center bg-surface-container-high/50 backdrop-blur-2xl rounded-xl border border-outline/10 hover:bg-primary hover:text-on-primary transition-all shadow-lg"
                    title="Restart"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {/* Grid Area — compact cells */}
            <div className="relative p-2 bg-surface-container-low/30 rounded-[1.5rem] border border-outline/8 backdrop-blur-xl shadow-2xl">
                <div className="grid grid-cols-8 gap-[3px]">
                    {grid.map((row, r) => row.map((cell, c) => (
                        <button
                            key={`${r}-${c}`}
                            onClick={() => revealCell(r, c)}
                            onContextMenu={(e) => toggleFlag(e, r, c)}
                            className={`
                                w-7 h-7 lg:w-8 lg:h-8 rounded-md flex items-center justify-center font-black transition-colors duration-100
                                ${cell.isRevealed
                                    ? cell.isMine
                                        ? 'bg-gradient-to-br from-error to-rose-700 text-white shadow-md shadow-error/30'
                                        : 'bg-surface-container-highest/12 border border-outline/5'
                                    : 'bg-gradient-to-br from-indigo-500/20 to-blue-500/12 hover:from-indigo-500/30 hover:to-blue-500/20 border border-indigo-400/12 active:scale-90 shadow-sm'
                                }
                            `}
                        >
                            {cell.isRevealed ? (
                                cell.isMine ? <Bomb className="w-3.5 h-3.5 drop-shadow-md" /> : (
                                    cell.neighborMines > 0 ? (
                                        <span className={`${getNumberColor(cell.neighborMines)} font-black text-[11px] lg:text-xs`}>
                                            {cell.neighborMines}
                                        </span>
                                    ) : ''
                                )
                            ) : (
                                cell.isFlagged ? <Flag className="w-3 h-3 text-rose-400 drop-shadow-md" /> : null
                            )}
                        </button>
                    )))}
                </div>

                {/* Overlays */}
                <AnimatePresence>
                    {gameState !== 'playing' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-0 z-10 flex items-center justify-center bg-black/35 backdrop-blur-md rounded-[1.5rem] p-4"
                        >
                            <div className="bg-surface-container-high/95 border border-outline/15 rounded-[2rem] p-7 shadow-2xl flex flex-col items-center text-center w-full max-w-[240px]">
                                {gameState === 'won' ? (
                                    <>
                                        <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mb-3">
                                            <Trophy className="w-7 h-7 text-primary" />
                                        </div>
                                        <h3 className="text-xl font-black bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent mb-1 uppercase italic tracking-tight">{t('game.mines.win_title')}</h3>
                                        <p className="text-sm font-bold text-on-surface-variant mb-5">{t('game.mines.win_subtitle', { timer })}</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-14 h-14 rounded-2xl bg-error/15 flex items-center justify-center mb-3">
                                            <Bomb className="w-7 h-7 text-error" />
                                        </div>
                                        <h3 className="text-xl font-black text-error mb-1 uppercase italic tracking-tight">{t('game.mines.lose_title')}</h3>
                                        <p className="text-sm font-bold text-on-surface-variant mb-5">{t('game.mines.lose_subtitle')}</p>
                                    </>
                                )}
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={initGrid}
                                    className="w-full py-3 bg-gradient-to-r from-primary to-tertiary text-on-primary rounded-xl font-black uppercase tracking-wider text-[10px] shadow-lg"
                                >
                                    {t('game.try_again')}
                                </motion.button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Instructions */}
            <div className="flex items-center justify-center gap-5 text-[9px] font-black text-on-surface-variant/35 uppercase tracking-[0.15em]">
                <div className="flex items-center gap-1.5">
                    <MousePointer2 className="w-3 h-3" /> {t('game.mines.hint_reveal')}
                </div>
                <div className="flex items-center gap-1.5">
                    <Flag className="w-3 h-3" /> {t('game.mines.hint_flag')}
                </div>
            </div>
        </div>
    );
};
