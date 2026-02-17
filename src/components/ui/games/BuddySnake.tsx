import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, RefreshCw, MessageSquare, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { playSound } from '../../../utils/sounds';

type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const GRID_SIZE = 14;
const CELL_SIZE_PCT = 100 / GRID_SIZE; // percentage per cell
const INITIAL_SPEED = 150;
const MIN_SPEED = 80;

export type WallMode = 'solid' | 'portal';

interface BuddySnakeProps {
    wallMode?: WallMode;
}

export const BuddySnake: React.FC<BuddySnakeProps> = ({ wallMode = 'solid' }) => {
    const { t } = useTranslation();
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
        <div className="flex flex-col items-center gap-2 lg:gap-5 w-full max-w-[260px] lg:max-w-[340px] mx-auto">
            {/* Stats */}
            <div className="flex justify-between items-center w-full px-1">
                <div className="flex items-center gap-2 bg-surface-container-high/50 backdrop-blur-2xl px-3 py-1.5 rounded-2xl border border-outline/10 shadow-lg">
                    <div className="w-5 h-5 rounded-md bg-primary/15 flex items-center justify-center">
                        <span className="text-[9px] font-black text-primary">#</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[7px] text-on-surface-variant/50 font-black uppercase tracking-[0.2em] leading-none">{t('game.score')}</span>
                        <span className="text-lg font-black text-on-surface tabular-nums leading-none mt-0.5">{score}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-surface-container-high/50 backdrop-blur-2xl px-3 py-1.5 rounded-2xl border border-outline/10 shadow-lg">
                    <Trophy className="w-3.5 h-3.5 text-primary/60" />
                    <div className="flex flex-col items-end">
                        <span className="text-[7px] text-on-surface-variant/50 font-black uppercase tracking-[0.2em] leading-none">{t('game.high_score')}</span>
                        <span className="text-base font-black text-on-surface/60 tabular-nums leading-none mt-0.5">{highScore}</span>
                    </div>
                </div>
            </div>

            {/* Canvas — absolute-positioned segments for smooth visuals */}
            <div className="relative w-full aspect-square bg-surface-container-low/30 border border-outline/8 rounded-2xl lg:rounded-[2rem] shadow-2xl overflow-hidden backdrop-blur-xl">
                {/* Subtle grid lines */}
                <div className="absolute inset-0 pointer-events-none">
                    {Array.from({ length: GRID_SIZE - 1 }).map((_, i) => (
                        <React.Fragment key={i}>
                            <div className="absolute bg-on-surface/[0.03]" style={{ left: 0, right: 0, top: `${(i + 1) * CELL_SIZE_PCT}%`, height: 1 }} />
                            <div className="absolute bg-on-surface/[0.03]" style={{ top: 0, bottom: 0, left: `${(i + 1) * CELL_SIZE_PCT}%`, width: 1 }} />
                        </React.Fragment>
                    ))}
                </div>

                {/* Snake segments */}
                {snake.map((seg, i) => {
                    const isHead = i === 0;
                    const opacity = isHead ? 1 : Math.max(0.3, 1 - (i / snake.length) * 0.65);
                    return (
                        <div
                            key={i}
                            className={`absolute p-px ${isHead ? 'z-10' : ''}`}
                            style={{
                                left: `${seg.x * CELL_SIZE_PCT}%`,
                                top: `${seg.y * CELL_SIZE_PCT}%`,
                                width: `${CELL_SIZE_PCT}%`,
                                height: `${CELL_SIZE_PCT}%`,
                            }}
                        >
                            <div
                                className={`w-full h-full rounded-sm bg-primary ${isHead ? 'shadow-lg shadow-primary/50 rounded-[3px]' : ''}`}
                                style={{ opacity }}
                            />
                        </div>
                    );
                })}

                {/* Food */}
                <div
                    className="absolute z-20 flex items-center justify-center pointer-events-none"
                    style={{
                        left: `${food.x * CELL_SIZE_PCT}%`,
                        top: `${food.y * CELL_SIZE_PCT}%`,
                        width: `${CELL_SIZE_PCT}%`,
                        height: `${CELL_SIZE_PCT}%`,
                        padding: '1px',
                    }}
                >
                    <div className="w-full h-full rounded-full bg-tertiary shadow-lg shadow-tertiary/40 flex items-center justify-center animate-pulse scale-90">
                        <MessageSquare className="w-[55%] h-[55%] text-on-tertiary" strokeWidth={2.5} />
                    </div>
                </div>

                {/* Game Over */}
                <AnimatePresence>
                    {isGameOver && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 backdrop-blur-md p-4"
                        >
                            <div className="bg-surface-container-high/95 border border-outline/15 rounded-[2rem] p-6 shadow-2xl flex flex-col items-center text-center w-full max-w-[220px]">
                                <div className="w-12 h-12 rounded-2xl bg-error/15 flex items-center justify-center mb-3">
                                    <span className="text-xl">💥</span>
                                </div>
                                <h3 className="text-base font-black text-error mb-0.5 uppercase italic tracking-tight">{t('game.system_error')}</h3>
                                <p className="text-sm font-bold text-on-surface-variant mb-4">{t('game.snake.lost').toUpperCase()} {score}</p>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={resetGame}
                                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-gradient-to-r from-primary to-tertiary text-on-primary rounded-xl font-black uppercase tracking-wider text-[10px] shadow-lg shadow-primary/20"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    {t('game.reconnect')}
                                </motion.button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Mobile Controls */}
            <div className="grid grid-cols-3 gap-1 lg:hidden w-full max-w-[160px]">
                <div />
                <button onClick={() => changeDir('UP')} title="Up" className="p-2.5 bg-surface-container-high/50 backdrop-blur-xl rounded-xl border border-outline/10 flex items-center justify-center active:bg-primary active:text-on-primary transition-colors shadow-md">
                    <ChevronUp className="w-5 h-5" />
                </button>
                <div />
                <button onClick={() => changeDir('LEFT')} title="Left" className="p-2.5 bg-surface-container-high/50 backdrop-blur-xl rounded-xl border border-outline/10 flex items-center justify-center active:bg-primary active:text-on-primary transition-colors shadow-md">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={() => changeDir('DOWN')} title="Down" className="p-2.5 bg-surface-container-high/50 backdrop-blur-xl rounded-xl border border-outline/10 flex items-center justify-center active:bg-primary active:text-on-primary transition-colors shadow-md">
                    <ChevronDown className="w-5 h-5" />
                </button>
                <button onClick={() => changeDir('RIGHT')} title="Right" className="p-2.5 bg-surface-container-high/50 backdrop-blur-xl rounded-xl border border-outline/10 flex items-center justify-center active:bg-primary active:text-on-primary transition-colors shadow-md">
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};
