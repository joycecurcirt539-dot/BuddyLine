import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bomb, Flag, RefreshCw, Trophy, Settings2, Move } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { playSound } from '../../../utils/sounds';
import { usePerformanceMode } from '../../../hooks/usePerformanceMode';

interface Cell {
    r: number;
    c: number;
    isMine: boolean;
    isRevealed: boolean;
    isFlagged: boolean;
    neighborMines: number;
}

interface GameConfig {
    rows: number;
    cols: number;
    mines: number;
}

export const BuddyMines: React.FC = () => {
    const { t } = useTranslation();
    const { reduceEffects } = usePerformanceMode();
    const [config, setConfig] = useState<GameConfig>({ rows: 10, cols: 10, mines: 15 });
    const [grid, setGrid] = useState<Cell[][]>([]);
    const [gameState, setGameState] = useState<'setup' | 'playing' | 'won' | 'lost'>('setup');
    const [flagCount, setFlagCount] = useState(0);
    const [timer, setTimer] = useState(0);
    const [isFirstClick, setIsFirstClick] = useState(true);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const viewportRef = useRef<HTMLDivElement>(null);

    const initGrid = useCallback((customConfig?: GameConfig) => {
        const activeConfig = customConfig || config;
        const newGrid: Cell[][] = [];
        for (let r = 0; r < activeConfig.rows; r++) {
            const row: Cell[] = [];
            for (let c = 0; c < activeConfig.cols; c++) {
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
    }, [config]);

    useEffect(() => {
        if (gameState === 'playing' && !isFirstClick) {
            timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
        }
        return () => {
            if (timerRef.current !== null) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [gameState, isFirstClick]);

    const revealCell = useCallback((r: number, c: number) => {
        if (gameState !== 'playing' || grid[r][c].isRevealed || grid[r][c].isFlagged) return;

        const newGrid = [...grid.map(row => [...row])];

        if (isFirstClick) {
            let minesPlaced = 0;
            // Cap mines check to ensure game is playable
            const maxAllowedMines = Math.min(config.mines, (config.rows * config.cols) - 9);
            while (minesPlaced < maxAllowedMines) {
                const randomR = Math.floor(Math.random() * config.rows);
                const randomC = Math.floor(Math.random() * config.cols);

                const isNearFirstClick = Math.abs(randomR - r) <= 1 && Math.abs(randomC - c) <= 1;

                if (!isNearFirstClick && !newGrid[randomR][randomC].isMine) {
                    newGrid[randomR][randomC].isMine = true;
                    minesPlaced++;
                }
            }

            for (let row = 0; row < config.rows; row++) {
                for (let col = 0; col < config.cols; col++) {
                    if (!newGrid[row][col].isMine) {
                        let count = 0;
                        for (let dr = -1; dr <= 1; dr++) {
                            for (let dc = -1; dc <= 1; dc++) {
                                const nr = row + dr;
                                const nc = col + dc;
                                if (nr >= 0 && nr < config.rows && nc >= 0 && nc < config.cols && newGrid[nr][nc].isMine) {
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
            if (row < 0 || row >= config.rows || col < 0 || col >= config.cols || newGrid[row][col].isRevealed) return;
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
    }, [grid, gameState, isFirstClick, config]);

    const toggleFlag = useCallback((e: React.MouseEvent, r: number, c: number) => {
        e.preventDefault();
        if (gameState !== 'playing' || grid[r][c].isRevealed) return;

        const newGrid = [...grid.map(row => [...row])];
        const cell = newGrid[r][c];

        if (!cell.isFlagged && flagCount >= config.mines) return;

        cell.isFlagged = !cell.isFlagged;
        playSound('mine_flag', 0.5);
        setFlagCount(prev => cell.isFlagged ? prev + 1 : prev - 1);
        setGrid(newGrid);
    }, [grid, gameState, flagCount, config.mines]);

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

    const cellSize = 44;

    return (
        <div className="flex flex-col items-center gap-4 lg:gap-6 w-full max-w-4xl mx-auto p-2 sm:p-4 select-none h-full overflow-hidden">
            {/* Header: HUD */}
            <div className="flex justify-between items-center w-full px-2 gap-2">
                <AnimatePresence mode="wait">
                    {gameState !== 'setup' && (
                        <motion.div
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -20, opacity: 0 }}
                            className="flex items-center gap-2 sm:gap-4 flex-1"
                        >
                            <div className="flex items-center gap-2 bg-surface-container-high/40 backdrop-blur-3xl px-3 py-2 rounded-2xl border border-white/10 shadow-lg">
                                <Bomb className="w-4 h-4 text-primary" />
                                <span className="text-xl font-black text-on-surface tabular-nums">{config.mines - flagCount}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-surface-container-high/40 backdrop-blur-3xl px-3 py-2 rounded-2xl border border-white/10 shadow-lg">
                                <span className="text-xl font-black text-on-surface tabular-nums">{timer}s</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex items-center gap-2">
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => gameState === 'setup' ? initGrid() : setGameState('setup')}
                        className="p-3 bg-surface-container-high/40 backdrop-blur-3xl text-on-surface/60 rounded-2xl border border-white/10 hover:text-primary transition-colors"
                    >
                        {gameState === 'setup' ? <RefreshCw className="w-5 h-5" /> : <Settings2 className="w-5 h-5" />}
                    </motion.button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="relative w-full flex-1 flex flex-col items-center justify-center min-h-[400px]">
                <AnimatePresence mode="wait">
                    {gameState === 'setup' ? (
                        <motion.div
                            key="setup"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 1.1, opacity: 0 }}
                            className="bg-surface-container-high/40 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 w-full max-w-sm shadow-2xl relative z-10"
                        >
                            <h2 className="text-2xl font-black text-on-surface mb-6 uppercase tracking-wider text-center">{t('game.mines.setup')}</h2>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-on-surface/40 tracking-[0.2em] px-2">{t('game.mines.grid_size')} ({config.rows}x{config.cols})</label>
                                    <input
                                        type="range" min="5" max="10" value={config.rows}
                                        onChange={(e) => setConfig({ ...config, rows: parseInt(e.target.value), cols: parseInt(e.target.value) })}
                                        className="w-full accent-primary h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-on-surface/40 tracking-[0.2em] px-2">{t('game.mines.mines')} ({config.mines})</label>
                                    <input
                                        type="range" min="5" max="50" value={config.mines}
                                        onChange={(e) => setConfig({ ...config, mines: parseInt(e.target.value) })}
                                        className="w-full accent-primary h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                                    />
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => initGrid()}
                                    className="w-full py-5 bg-gradient-to-r from-primary to-tertiary text-white rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20 mt-8"
                                >
                                    {t('game.mines.start')}
                                </motion.button>
                            </div>
                        </motion.div>
                    ) : (
                        <div
                            key="grid"
                            className="w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden rounded-[2rem] sm:rounded-[4rem] border border-white/5 bg-black/20"
                            ref={viewportRef}
                        >
                            {/* Draggable Grid Area */}
                            <motion.div
                                drag
                                dragMomentum={false}
                                initial={{ x: 0, y: 0 }}
                                className="inline-grid p-20"
                                style={{
                                    gridTemplateColumns: `repeat(${config.cols}, ${cellSize}px)`,
                                    gridTemplateRows: `repeat(${config.rows}, ${cellSize}px)`,
                                    gap: '4px',
                                }}
                            >
                                {grid.map((row, r) => row.map((cell, c) => (
                                    <button
                                        key={`${r}-${c}`}
                                        onClick={() => revealCell(r, c)}
                                        onContextMenu={(e) => toggleFlag(e, r, c)}
                                        style={{ width: cellSize, height: cellSize }}
                                        className={`
                                            rounded-lg lg:rounded-xl flex items-center justify-center font-black transition-all duration-200 relative overflow-hidden backdrop-blur-sm shadow-md active:scale-95
                                            ${cell.isRevealed
                                                ? cell.isMine
                                                    ? 'bg-gradient-to-br from-error to-rose-700 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] border-transparent'
                                                    : 'bg-white/[0.05] border border-white/10 shadow-inner'
                                                : 'bg-gradient-to-br from-white/15 to-white/[0.02] border border-white/20 hover:border-white/40'
                                            }
                                        `}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
                                        {cell.isRevealed ? (
                                            cell.isMine ? (
                                                <Bomb size={18} className="drop-shadow-md" />
                                            ) : (
                                                cell.neighborMines > 0 ? (
                                                    <span
                                                        style={{ fontSize: '14px' }}
                                                        className={`${getNumberColor(cell.neighborMines)} font-black drop-shadow-sm`}
                                                    >
                                                        {cell.neighborMines}
                                                    </span>
                                                ) : null
                                            )
                                        ) : (
                                            cell.isFlagged ? (
                                                <Flag size={14} className="text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.5)]" />
                                            ) : null
                                        )}
                                    </button>
                                )))}
                            </motion.div>

                            {/* Help indicator for panning */}
                            {gameState === 'playing' && isFirstClick && (
                                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 pointer-events-none opacity-60">
                                    <Move size={14} className="text-on-surface/60" />
                                    <span className="text-[10px] font-black uppercase text-on-surface/60 tracking-wider">{t('game.mines.drag_to_explore')}</span>
                                </div>
                            )}

                            {/* Status Overlays */}
                            <AnimatePresence>
                                {gameState !== 'playing' && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6"
                                    >
                                        <div className="bg-surface-container-high/90 border border-white/10 rounded-[3rem] p-8 shadow-2xl flex flex-col items-center justify-center text-center w-full max-w-[260px] relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
                                            {gameState === 'won' ? (
                                                <div className="flex flex-col items-center">
                                                    <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mb-4 shadow-xl">
                                                        <Trophy className="w-8 h-8 text-primary font-bold" />
                                                    </div>
                                                    <h3 className="text-2xl font-black text-on-surface uppercase mb-6 tracking-tight">{t('game.mines.win_title')}</h3>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center">
                                                    <div className="w-14 h-14 rounded-2xl bg-error/20 flex items-center justify-center mb-4 shadow-xl">
                                                        <Bomb className="w-8 h-8 text-error" />
                                                    </div>
                                                    <h3 className="text-2xl font-black text-error uppercase mb-6 tracking-tight">{t('game.mines.lose_title')}</h3>
                                                </div>
                                            )}

                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => setGameState('setup')}
                                                className="w-full py-4 bg-gradient-to-r from-primary to-tertiary text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/25 relative z-10"
                                            >
                                                {t('game.try_again')}
                                            </motion.button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
