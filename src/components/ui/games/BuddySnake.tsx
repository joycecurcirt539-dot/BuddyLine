import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, RefreshCw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { playSound } from '../../../utils/sounds';

type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const GRID_SIZE = 14;
const CELL_SIZE_PCT = 100 / GRID_SIZE; // percentage per cell
const INITIAL_SPEED = 220;
const MIN_SPEED = 140;

import { usePerformanceMode } from '../../../hooks/usePerformanceMode';

export type WallMode = 'solid' | 'portal';

interface BuddySnakeProps {
    wallMode?: WallMode;
}

export const BuddySnake: React.FC<BuddySnakeProps> = ({ wallMode = 'solid' }) => {
    const { t } = useTranslation();
    const { reduceEffects } = usePerformanceMode();
    const [snake, setSnake] = useState<Point[]>([{ x: 7, y: 7 }]);
    const [food, setFood] = useState<Point>({ x: 10, y: 10 });
    const [, setDirection] = useState<Direction>('RIGHT');
    const [isGameOver, setIsGameOver] = useState(false);
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => {
        const saved = localStorage.getItem('buddyline_highscore_snake');
        return saved ? parseInt(saved) : 0;
    });

    const dirRef = useRef<Direction>('RIGHT');
    const gameLoopRef = useRef<number | null>(null);
    const lastTickRef = useRef(0);

    const generateFood = useCallback((currentSnake: Point[]) => {
        let newFood: Point;
        do {
            newFood = {
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE)
            };
        } while (currentSnake.some(s => s.x === newFood.x && s.y === newFood.y));
        return newFood;
    }, []);

    const resetGame = useCallback(() => {
        setSnake([{ x: 7, y: 7 }]);
        setFood({ x: 10, y: 10 });
        setDirection('RIGHT');
        dirRef.current = 'RIGHT';
        setIsGameOver(false);
        setScore(0);
    }, []);

    // Use requestAnimationFrame + deltaTime for smooth tick-based movement
    const snakeRef = useRef(snake);
    const foodRef = useRef(food);
    const scoreRef = useRef(score);
    const isGameOverRef = useRef(isGameOver);
    const highScoreRef = useRef(highScore);

    useEffect(() => {
        snakeRef.current = snake;
        foodRef.current = food;
        scoreRef.current = score;
        isGameOverRef.current = isGameOver;
        highScoreRef.current = highScore;
    }, [snake, food, score, isGameOver, highScore]);

    const tick = useCallback(() => {
        playSound('move', 0.05);
        const dir = dirRef.current;
        const prevSnake = snakeRef.current;
        const head = prevSnake[0];
        const newHead = { ...head };

        switch (dir) {
            case 'UP': newHead.y -= 1; break;
            case 'DOWN': newHead.y += 1; break;
            case 'LEFT': newHead.x -= 1; break;
            case 'RIGHT': newHead.x += 1; break;
        }

        if (wallMode === 'solid') {
            if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
                playSound('collision', 0.4);
                setIsGameOver(true);
                if (scoreRef.current > highScoreRef.current) {
                    setHighScore(scoreRef.current);
                    localStorage.setItem('buddyline_highscore_snake', scoreRef.current.toString());
                }
                return;
            }
        } else {
            newHead.x = (newHead.x + GRID_SIZE) % GRID_SIZE;
            newHead.y = (newHead.y + GRID_SIZE) % GRID_SIZE;
        }

        if (prevSnake.some(s => s.x === newHead.x && s.y === newHead.y)) {
            playSound('collision', 0.4);
            setIsGameOver(true);
            if (scoreRef.current > highScoreRef.current) {
                setHighScore(scoreRef.current);
                localStorage.setItem('buddyline_highscore_snake', scoreRef.current.toString());
            }
            return;
        }

        const newSnake = [newHead, ...prevSnake];
        const currentFood = foodRef.current;

        if (newHead.x === currentFood.x && newHead.y === currentFood.y) {
            playSound('eat', 0.5);
            setScore(s => s + 10);
            setFood(generateFood(newSnake));
        } else {
            newSnake.pop();
        }

        setSnake(newSnake);
    }, [wallMode, generateFood]);

    useEffect(() => {
        if (isGameOver) {
            if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
            return;
        }

        const speed = Math.max(MIN_SPEED, INITIAL_SPEED - Math.floor(score / 50) * 10);

        const loop = (timestamp: number) => {
            if (!lastTickRef.current) lastTickRef.current = timestamp;
            const elapsed = timestamp - lastTickRef.current;

            if (elapsed >= speed) {
                lastTickRef.current = timestamp;
                tick();
            }

            gameLoopRef.current = requestAnimationFrame(loop);
        };

        lastTickRef.current = 0;
        gameLoopRef.current = requestAnimationFrame(loop);

        return () => {
            if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
        };
    }, [isGameOver, score, highScore, tick]);

    // Keyboard: update dirRef immediately for instant response
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const cur = dirRef.current;
            switch (e.key) {
                case 'ArrowUp': if (cur !== 'DOWN') { dirRef.current = 'UP'; setDirection('UP'); } break;
                case 'ArrowDown': if (cur !== 'UP') { dirRef.current = 'DOWN'; setDirection('DOWN'); } break;
                case 'ArrowLeft': if (cur !== 'RIGHT') { dirRef.current = 'LEFT'; setDirection('LEFT'); } break;
                case 'ArrowRight': if (cur !== 'LEFT') { dirRef.current = 'RIGHT'; setDirection('RIGHT'); } break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Mobile controls also use dirRef for zero-latency
    const changeDir = (newDir: Direction) => {
        const cur = dirRef.current;
        if (newDir === 'UP' && cur !== 'DOWN') { dirRef.current = 'UP'; setDirection('UP'); }
        if (newDir === 'DOWN' && cur !== 'UP') { dirRef.current = 'DOWN'; setDirection('DOWN'); }
        if (newDir === 'LEFT' && cur !== 'RIGHT') { dirRef.current = 'LEFT'; setDirection('LEFT'); }
        if (newDir === 'RIGHT' && cur !== 'LEFT') { dirRef.current = 'RIGHT'; setDirection('RIGHT'); }
    };

    return (
        <div className="flex flex-col items-center gap-4 lg:gap-8 w-full max-w-[300px] lg:max-w-[420px] mx-auto accelerate">
            {/* Stats - Premium Glass */}
            <div className="flex justify-between items-center w-full px-2">
                <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="flex items-center gap-3 bg-surface-container-high/40 backdrop-blur-3xl px-4 py-2.5 rounded-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] accelerate"
                >
                    <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center shadow-lg shadow-primary/20">
                        <span className="text-[10px] font-black text-primary">#</span>
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
                    className="flex items-center gap-3 bg-surface-container-high/40 backdrop-blur-3xl px-4 py-2.5 rounded-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] accelerate"
                >
                    <Trophy className="w-5 h-5 text-tertiary" />
                    <div className="flex flex-col items-end">
                        <span className="text-[8px] text-tertiary/70 font-black uppercase tracking-[0.2em] leading-none mb-1">{t('game.high_score')}</span>
                        <span className="text-xl font-black text-on-surface/80 tabular-nums leading-none mt-0.5">{highScore}</span>
                    </div>
                </motion.div>
            </div>

            {/* Game Grid — Liquid Glass style */}
            <div
                className={`touch-none relative w-full aspect-square bg-gradient-to-br from-surface-container-low/40 to-surface-container-high/10 border border-white/10 rounded-[2rem] lg:rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] overflow-hidden ${reduceEffects ? '' : 'backdrop-blur-xl'} accelerate`}
            >
                {/* Dynamic Background depth items */}
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary/20 blur-[60px] rounded-full animate-pulse" />
                    <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-tertiary/20 blur-[80px] rounded-full" />
                </div>

                {/* Subtle grid lines - Enhanced */}
                <div className="absolute inset-0 pointer-events-none opacity-20">
                    {Array.from({ length: GRID_SIZE - 1 }).map((_, i) => (
                        <React.Fragment key={i}>
                            {/* eslint-disable-next-line react/forbid-dom-props */}
                            <div className="absolute bg-on-surface/[0.15]" style={{ left: 0, right: 0, top: `${(i + 1) * CELL_SIZE_PCT}%`, height: 1 }} />
                            {/* eslint-disable-next-line react/forbid-dom-props */}
                            <div className="absolute bg-on-surface/[0.15]" style={{ top: 0, bottom: 0, left: `${(i + 1) * CELL_SIZE_PCT}%`, width: 1 }} />
                        </React.Fragment>
                    ))}
                </div>

                {/* Snake segments */}
                {snake.map((seg, i) => {
                    const isHead = i === 0;
                    const opacity = isHead ? 1 : Math.max(0.2, 1 - (i / snake.length) * 0.7);
                    const scale = isHead ? 1.1 : Math.max(0.7, 1 - (i / snake.length) * 0.3);

                    return (
                        <motion.div
                            key={`${seg.x}-${seg.y}-${i}`}
                            layout
                            className={`absolute p-[2px] ${isHead ? 'z-10' : ''}`}
                            style={{
                                left: `${seg.x * CELL_SIZE_PCT}%`,
                                top: `${seg.y * CELL_SIZE_PCT}%`,
                                width: `${CELL_SIZE_PCT}%`,
                                height: `${CELL_SIZE_PCT}%`,
                            }}
                        >
                            <div
                                className={`w-full h-full rounded-md shadow-lg transition-all duration-300 ${isHead
                                    ? 'bg-gradient-to-br from-primary via-primary to-tertiary shadow-primary/60 scale-110 z-20'
                                    : 'bg-primary/80 shadow-primary/10'
                                    }`}
                                style={{
                                    opacity,
                                    scale,
                                    boxShadow: isHead ? '0 0 20px 4px rgba(99,102,241,0.5)' : 'none'
                                }}
                            >
                                {isHead && (
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full shadow-sm opacity-60" />
                                )}
                            </div>
                        </motion.div>
                    );
                })}

                {/* Food - Liquid Glow Item */}
                <motion.div
                    animate={{
                        scale: [0.9, 1.1, 0.9],
                        rotate: [0, 90, 180, 270, 360]
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="absolute z-20 flex items-center justify-center pointer-events-none"
                    style={{
                        left: `${food.x * CELL_SIZE_PCT}%`,
                        top: `${food.y * CELL_SIZE_PCT}%`,
                        width: `${CELL_SIZE_PCT}%`,
                        height: `${CELL_SIZE_PCT}%`,
                        padding: '4px',
                    }}
                >
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-tertiary to-secondary shadow-[0_0_24px_8px_rgba(167,139,250,0.5)] flex items-center justify-center p-1">
                        <img src="/logo.png" className="w-full h-full object-contain drop-shadow-md brightness-200" alt="" />
                    </div>
                </motion.div>

                {/* Game Over - Premium Overlay */}
                <AnimatePresence>
                    {isGameOver && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-xl p-6"
                        >
                            <div className="bg-surface-container-high/90 border border-white/10 rounded-[2.5rem] p-6 shadow-2xl flex flex-col items-center justify-center text-center w-full max-w-[220px] aspect-square relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-tertiary/5" />
                                <div className="w-12 h-12 rounded-[1rem] bg-gradient-to-br from-primary/30 to-tertiary/30 flex items-center justify-center mb-4 shadow-xl shadow-primary/20 relative z-10 overflow-hidden">
                                    <img src="/logo.png" className="w-[60%] h-[60%] object-contain brightness-200" alt="logo" />
                                </div>
                                <h3 className="text-xl font-black text-error mb-1 uppercase tracking-tight relative z-10">{t('game.system_error')}</h3>
                                <div className="flex flex-col items-center gap-1 mb-6 relative z-10">
                                    <span className="text-[9px] font-black text-on-surface/40 uppercase tracking-[0.2em]">{t('game.score')}</span>
                                    <span className="text-3xl font-black text-on-surface">{score}</span>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(99,102,241,0.3)' }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={resetGame}
                                    className="flex items-center justify-center gap-3 w-full py-4 bg-gradient-to-r from-primary to-tertiary text-white rounded-2xl font-black uppercase tracking-[0.1em] text-xs shadow-xl shadow-primary/25 relative z-10"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    {t('game.reconnect')}
                                </motion.button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Mobile Controls - Floating Premium Buttons */}
            <div className="grid grid-cols-3 gap-3 lg:hidden w-full max-w-[220px]">
                <div />
                <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => changeDir('UP')}
                    className="aspect-square bg-surface-container-high/40 backdrop-blur-2xl rounded-[1.5rem] border border-white/10 flex items-center justify-center active:bg-primary shadow-[0_4px_24px_rgba(0,0,0,0.2)]"
                >
                    <ChevronUp className="w-8 h-8 opacity-80" />
                </motion.button>
                <div />
                <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => changeDir('LEFT')}
                    className="aspect-square bg-surface-container-high/40 backdrop-blur-2xl rounded-[1.5rem] border border-white/10 flex items-center justify-center active:bg-primary shadow-[0_4px_24px_rgba(0,0,0,0.2)]"
                >
                    <ChevronLeft className="w-8 h-8 opacity-80" />
                </motion.button>
                <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => changeDir('DOWN')}
                    className="aspect-square bg-surface-container-high/40 backdrop-blur-2xl rounded-[1.5rem] border border-white/10 flex items-center justify-center active:bg-primary shadow-[0_4px_24px_rgba(0,0,0,0.2)]"
                >
                    <ChevronDown className="w-8 h-8 opacity-80" />
                </motion.button>
                <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => changeDir('RIGHT')}
                    className="aspect-square bg-surface-container-high/40 backdrop-blur-2xl rounded-[1.5rem] border border-white/10 flex items-center justify-center active:bg-primary shadow-[0_4px_24px_rgba(0,0,0,0.2)]"
                >
                    <ChevronRight className="w-8 h-8 opacity-80" />
                </motion.button>
            </div>
        </div>
    );
};
