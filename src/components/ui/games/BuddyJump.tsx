import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ArrowUp, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { playSound } from '../../../utils/sounds';

interface Platform {
    id: number;
    x: number;
    y: number;
    width: number;
}

const GAME_WIDTH = 300;
const GAME_HEIGHT = 400;
const GRAVITY = 0.4;
const JUMP_FORCE = -12;
const PLATFORM_GAP = 120;

import { usePerformanceMode } from '../../../hooks/usePerformanceMode';

export const BuddyJump: React.FC = () => {
    const { t } = useTranslation();
    const { reduceEffects } = usePerformanceMode();
    const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => {
        const saved = localStorage.getItem('buddyline_highscore_jump');
        return saved ? parseInt(saved) : 0;
    });

    const [player, setPlayer] = useState({ x: 200, y: 250, vy: 0 });
    const [platforms, setPlatforms] = useState<Platform[]>([]);
    const [cameraY, setCameraY] = useState(0);

    const gameLoopRef = useRef<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const initGame = useCallback(() => {
        const initialPlatforms: Platform[] = [];
        for (let i = 0; i < 6; i++) {
            initialPlatforms.push({
                id: i,
                x: i === 0 ? 100 : Math.random() * (GAME_WIDTH - 80),
                y: GAME_HEIGHT - i * PLATFORM_GAP,
                width: 80
            });
        }
        setPlatforms(initialPlatforms);
        setPlayer({ x: 200, y: 250, vy: JUMP_FORCE });
        setScore(0);
        setCameraY(0);
        setGameState('playing');
    }, []);

    const handleInput = useCallback((e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        if (gameState !== 'playing') return;

        let clientX: number;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
        } else {
            clientX = (e as MouseEvent).clientX;
        }

        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const x = ((clientX - rect.left) / rect.width) * GAME_WIDTH;
            // Use ref for position to avoid state-update lag in the loop if needed, 
            // but for now let's just ensure touch-action is blocked.
            setPlayer(prev => ({ ...prev, x }));
        }
    }, [gameState]);

    useEffect(() => {
        if (gameState !== 'playing') return;

        const loop = () => {
            setPlayer(p => {
                let newY = p.y + p.vy;
                let newVy = p.vy + GRAVITY;

                if (newVy > 0) {
                    const platform = platforms.find(plat =>
                        p.y <= plat.y &&
                        newY >= plat.y &&
                        p.x >= plat.x - 20 &&
                        p.x <= plat.x + plat.width + 20
                    );

                    if (platform) {
                        playSound('jump', 0.4);
                        newVy = JUMP_FORCE;
                        newY = platform.y;
                    }
                }

                if (newY < cameraY + 150) {
                    setCameraY(newY - 150);
                }

                const heightVal = Math.floor(Math.abs(newY - 250) / 10);
                if (heightVal > score) setScore(heightVal);

                if (newY > cameraY + GAME_HEIGHT + 100) {
                    playSound('fall', 0.6);
                    setGameState('gameover');
                    // Check against heightVal as it's the latest score
                    if (heightVal > highScore) {
                        setHighScore(heightVal);
                        localStorage.setItem('buddyline_highscore_jump', heightVal.toString());
                    }
                    return p;
                }

                return { ...p, y: newY, vy: newVy };
            });

            setPlatforms(prev => {
                const filtered = prev.filter(p => p.y < cameraY + GAME_HEIGHT + 200);
                const highest = filtered.reduce((min, p) => p.y < min ? p.y : min, cameraY + GAME_HEIGHT);

                if (highest > cameraY - 100) {
                    filtered.push({
                        id: Date.now() + Math.random(),
                        x: Math.random() * (GAME_WIDTH - 80),
                        y: highest - PLATFORM_GAP,
                        width: 60 + Math.random() * 40
                    });
                }
                return filtered;
            });

            gameLoopRef.current = requestAnimationFrame(loop);
        };

        gameLoopRef.current = requestAnimationFrame(loop);
        return () => {
            if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
        };
    }, [gameState, platforms, cameraY, score, highScore]);



    return (
        <div className="flex flex-col items-center gap-3 lg:gap-5 w-full max-w-md mx-auto">
            {/* HUD */}
            <div className="flex justify-between items-center w-full px-3">
                <div className="flex items-center gap-2.5 bg-surface-container-high/50 backdrop-blur-2xl px-3.5 py-2 rounded-2xl border border-outline/10 shadow-lg">
                    <div className="w-6 h-6 rounded-lg bg-primary/15 flex items-center justify-center">
                        <ArrowUp className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[7px] text-on-surface-variant/50 font-black uppercase tracking-[0.2em] leading-none">{t('game.jump.height')}</span>
                        <motion.span
                            key={score}
                            initial={{ y: -5, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="text-xl font-black text-on-surface tabular-nums leading-none mt-0.5"
                        >
                            {score}m
                        </motion.span>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 bg-surface-container-high/50 backdrop-blur-2xl px-3.5 py-2 rounded-2xl border border-outline/10 shadow-lg">
                    <Trophy className="w-4 h-4 text-primary/60" />
                    <div className="flex flex-col items-end">
                        <span className="text-[7px] text-on-surface-variant/50 font-black uppercase tracking-[0.2em] leading-none">{t('game.jump.max')}</span>
                        <span className="text-lg font-black text-on-surface/60 tabular-nums leading-none mt-0.5">{highScore}m</span>
                    </div>
                </div>
            </div>

            {/* Game Canvas */}
            <div
                ref={containerRef}
                onMouseMove={handleInput}
                onTouchMove={handleInput}
                style={{ touchAction: 'none' }}
                className={`relative overflow-hidden bg-gradient-to-b from-surface-container-low/60 to-surface-container-low border border-outline/10 rounded-2xl lg:rounded-[2rem] shadow-2xl cursor-crosshair group aspect-[3/4] w-full max-w-[280px] ${reduceEffects ? '' : 'backdrop-blur-xl'} h-auto accelerate`}
            >
                {/* Background Objects */}
                <div
                    className="absolute inset-0 opacity-15 transition-transform duration-1000"
                    style={{ transform: `translateY(${-cameraY * 0.2}px)` }}
                >
                    <div className="absolute top-20 left-10 w-24 h-24 bg-primary blur-[50px] rounded-full" />
                    <div className="absolute top-[400px] right-10 w-36 h-36 bg-tertiary blur-[70px] rounded-full" />
                    <div className="absolute top-[200px] left-1/2 w-20 h-20 bg-secondary blur-[40px] rounded-full" />
                </div>

                {/* Depth grid lines (subtle) */}
                <div className="absolute inset-0 opacity-[0.03]" style={{ transform: `translateY(${-cameraY * 0.5}px)` }}>
                    {Array.from({ length: 30 }).map((_, i) => (
                        <div key={i} className="absolute left-0 right-0 h-px bg-on-surface" style={{ top: `${i * 50}px` }} />
                    ))}
                </div>

                <AnimatePresence>
                    {gameState === 'start' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-0 z-10 flex items-center justify-center bg-black/25 backdrop-blur-md p-4"
                        >
                            <div className="bg-surface-container-high/95 border border-outline/15 rounded-[2rem] p-6 shadow-2xl flex flex-col items-center text-center w-full max-w-[240px]">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-tertiary/20 flex items-center justify-center mb-3">
                                    <ArrowUp className="w-7 h-7 text-primary" />
                                </div>
                                <h3 className="text-xl font-black text-on-surface mb-1 uppercase italic leading-tight">{t('game.jump.ready')}</h3>
                                <p className="text-[10px] font-bold text-on-surface-variant/60 mb-5 leading-relaxed px-2">
                                    {t('game.jump.instruction')}
                                </p>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={initGame}
                                    className="w-full py-3 bg-gradient-to-r from-primary to-tertiary text-on-primary rounded-xl font-black uppercase tracking-wider text-xs shadow-lg shadow-primary/20"
                                >
                                    {t('game.start')}
                                </motion.button>
                            </div>
                        </motion.div>
                    )}

                    {gameState === 'gameover' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute inset-0 z-10 flex items-center justify-center bg-black/25 backdrop-blur-md p-4"
                        >
                            <div className="bg-surface-container-high/95 border border-outline/15 rounded-[2rem] p-6 shadow-2xl flex flex-col items-center text-center w-full max-w-[240px]">
                                <div className="w-14 h-14 rounded-2xl bg-error/15 flex items-center justify-center mb-3">
                                    <span className="text-2xl">🪂</span>
                                </div>
                                <h3 className="text-xl font-black text-error mb-0.5 uppercase italic tracking-tight">{t('game.jump.fail')}</h3>
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="text-3xl font-black text-on-surface">{score}m</span>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={initGame}
                                    className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-primary to-tertiary text-on-primary rounded-xl font-black uppercase tracking-wider text-[10px] shadow-lg shadow-primary/20"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    {t('game.try_again')}
                                </motion.button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Platforms */}
                {platforms.map(plat => (
                    <div
                        key={plat.id}
                        className="absolute h-[4%] rounded-full overflow-hidden"
                        style={{
                            left: `${(plat.x / GAME_WIDTH) * 100}%`,
                            top: `${((plat.y - cameraY - 40) / GAME_HEIGHT) * 100}%`,
                            width: `${(plat.width / GAME_WIDTH) * 100}%`
                        }}
                    >
                        <div className="w-full h-full bg-gradient-to-r from-primary/40 via-primary/60 to-primary/40 rounded-full shadow-lg shadow-primary/20 border border-primary/20" />
                    </div>
                ))}

                {/* Player */}
                <div
                    style={{
                        position: 'absolute',
                        left: `${(player.x / GAME_WIDTH) * 100}%`,
                        top: `${((player.y - cameraY) / GAME_HEIGHT) * 100}%`,
                        width: '12%',
                        aspectRatio: '1/1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: 'translate(-50%, -100%)',
                        willChange: 'left, top'
                    }}
                >
                    {/* Player trail */}
                    {player.vy < 0 && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-3 h-8 bg-gradient-to-b from-primary/30 to-transparent rounded-full blur-sm" />
                    )}
                    <motion.div
                        animate={{
                            scale: player.vy < 0 ? [1, 1.15, 1] : 1,
                            rotate: player.vy * 2
                        }}
                        className="w-full h-full bg-gradient-to-br from-primary to-tertiary rounded-xl shadow-lg shadow-primary/30 flex items-center justify-center"
                    >
                        <img src="/logo.png" className="w-[80%] h-[80%] object-contain" alt="" />
                    </motion.div>
                </div>
            </div>
        </div>
    );
};
