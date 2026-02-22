import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ArrowUp, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePerformanceMode } from '../../../hooks/usePerformanceMode';
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
        <div className="flex flex-col items-center gap-6 lg:gap-8 w-full max-w-[320px] lg:max-w-[380px] mx-auto p-4 select-none accelerate">
            {/* HUD */}
            <div className="flex justify-between items-center w-full px-1">
                <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="flex items-center gap-2.5 bg-surface-container-high/40 backdrop-blur-3xl px-3 py-2 rounded-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                >
                    <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center shadow-lg shadow-primary/20">
                        <ArrowUp className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[8px] text-primary/70 font-black uppercase tracking-[0.2em] leading-none mb-1">{t('game.jump.height')}</span>
                        <motion.span
                            key={score}
                            initial={{ y: -5, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="text-xl font-black text-on-surface tabular-nums leading-none tracking-tight"
                        >
                            {score}<span className="text-[10px] opacity-50 ml-0.5">m</span>
                        </motion.span>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="flex items-center gap-2.5 bg-surface-container-high/40 backdrop-blur-3xl px-3 py-2 rounded-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                >
                    <div className="w-8 h-8 rounded-xl bg-tertiary/20 flex items-center justify-center shadow-lg shadow-tertiary/20">
                        <Trophy className="w-4 h-4 text-tertiary" />
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[8px] text-tertiary/70 font-black uppercase tracking-[0.2em] leading-none mb-1">{t('game.jump.max')}</span>
                        <span className="text-lg font-black text-on-surface/80 tabular-nums leading-none mt-0.5">{highScore}m</span>
                    </div>
                </motion.div>
            </div>

            {/* Game Canvas */}
            <div
                ref={containerRef}
                onMouseMove={handleInput}
                onTouchMove={handleInput}
                className={`touch-none relative overflow-hidden bg-gradient-to-b from-surface-container-low/40 to-surface-container-low/80 border border-white/10 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] cursor-crosshair group aspect-[3/4] w-full ${reduceEffects ? '' : 'backdrop-blur-xl'} h-auto accelerate overflow-hidden`}
            >
                {/* Background Objects - Enhanced */}
                <div
                    className="absolute inset-0 transition-transform duration-1000"
                    style={{ transform: `translateY(${-cameraY * 0.15}px)` }}
                >
                    <div className="absolute top-[10%] left-[5%] w-48 h-48 bg-primary/10 blur-[80px] rounded-full animate-pulse" />
                    <div className="absolute top-[40%] right-[10%] w-64 h-64 bg-tertiary/10 blur-[100px] rounded-full" />
                    <div className="absolute top-[70%] left-[15%] w-40 h-40 bg-secondary/10 blur-[60px] rounded-full" />
                </div>

                {/* Animated Scanline effect */}
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] z-0 bg-[length:100%_4px,3px_100%]" />

                {/* Depth grid lines - Liquid style */}
                <div className="absolute inset-0 opacity-[0.05]"
                    style={{ transform: `translateY(${-cameraY * 0.4}px)` }}>
                    {Array.from({ length: 40 }).map((_, i) => (
                        <div key={i} className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-on-surface to-transparent"
                            style={{ top: `${i * 40}px` }} />
                    ))}
                </div>

                <AnimatePresence>
                    {gameState === 'start' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-xl p-6"
                        >
                            <div className="bg-surface-container-high/90 border border-white/10 rounded-[2.5rem] p-6 shadow-2xl flex flex-col items-center justify-center aspect-square text-center w-full max-w-[220px] relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-tertiary/5" />
                                <div className="w-12 h-12 rounded-[1rem] bg-gradient-to-br from-primary/30 to-tertiary/30 flex items-center justify-center mb-4 shadow-xl shadow-primary/20 relative z-10">
                                    <ArrowUp className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-xl font-black text-on-surface mb-6 uppercase italic leading-tight tracking-tight relative z-10">{t('game.jump.ready')}</h3>
                                <motion.button
                                    whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(99,102,241,0.4)' }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={initGame}
                                    className="w-full py-4 bg-gradient-to-r from-primary to-tertiary text-white rounded-2xl font-black uppercase tracking-[0.15em] text-xs shadow-xl shadow-primary/25 relative z-10"
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
                            className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-xl p-6"
                        >
                            <div className="bg-surface-container-high/90 border border-error/20 rounded-[2.5rem] p-6 shadow-2xl flex flex-col items-center justify-center aspect-square text-center w-full max-w-[220px] relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-error/5 to-transparent" />
                                <div className="w-12 h-12 rounded-[1rem] bg-error/20 flex items-center justify-center mb-4 shadow-xl shadow-error/20 relative z-10">
                                    <img src="/logo.png" className="w-[60%] h-[60%] object-contain brightness-200" alt="logo" />
                                </div>
                                <h3 className="text-xl font-black text-error mb-2 uppercase italic tracking-tight relative z-10">{t('game.jump.fail')}</h3>
                                <div className="flex flex-col items-center gap-1 mb-6 relative z-10">
                                    <span className="text-[9px] font-black text-on-surface/40 uppercase tracking-[0.2em]">{t('game.jump.height')}</span>
                                    <span className="text-3xl font-black text-on-surface">{score}m</span>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(239,68,68,0.3)' }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={initGame}
                                    className="flex items-center justify-center gap-3 w-full py-4 bg-error text-white rounded-2xl font-black uppercase tracking-[0.1em] text-xs shadow-xl shadow-error/25 relative z-10"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    {t('game.try_again')}
                                </motion.button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Platforms - High contrast glass style */}
                <div className="absolute inset-0"
                    style={{ transform: `translateY(${-cameraY}px)` }}>
                    {platforms.map(plat => (
                        <div
                            key={plat.id}
                            className="absolute h-[16px] rounded-full transition-all duration-300"
                            style={{
                                left: `${(plat.x / GAME_WIDTH) * 100}%`,
                                top: `${plat.y}px`,
                                width: `${(plat.width / GAME_WIDTH) * 100}%`
                            }}
                        >
                            <div className="w-full h-full bg-gradient-to-r from-primary/50 via-primary to-primary/50 rounded-full shadow-[0_4px_16px_rgba(99,102,241,0.4)] border border-white/20" />
                            {/* Inner glow effect */}
                            <div className="absolute inset-0 rounded-full bg-white/20 blur-[2px] scale-x-[0.9] scale-y-[0.3] translate-y-[-2px]" />
                        </div>
                    ))}
                </div>

                {/* Player - Dynamic Orb */}
                <div
                    style={{
                        position: 'absolute',
                        left: `${(player.x / GAME_WIDTH) * 100}%`,
                        top: `${player.y - cameraY}px`,
                        width: '14%',
                        aspectRatio: '1/1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: 'translate(-50%, -100%)',
                        willChange: 'left, top',
                        zIndex: 10
                    }}
                >
                    {/* Player trail / propulsion */}
                    <AnimatePresence>
                        {player.vy < 0 && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute top-[80%] left-1/2 -translate-x-1/2 w-8 h-16 bg-gradient-to-b from-primary/50 to-transparent rounded-full blur-md z-0"
                            />
                        )}
                    </AnimatePresence>

                    <motion.div
                        animate={{
                            scale: player.vy < 0 ? [1, 1.2, 1] : 1,
                            rotate: player.vy * 3,
                            y: player.vy < 0 ? [-2, 0] : [0, 2]
                        }}
                        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                        className="w-full h-full bg-gradient-to-br from-primary via-tertiary to-primary rounded-2xl shadow-[0_0_32px_rgba(99,102,241,0.6)] flex items-center justify-center border border-white/30 relative z-10"
                    >
                        {/* Shimmer on player */}
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-white/30 to-transparent pointer-events-none" />
                        <img src="/logo.png" className="w-[70%] h-[70%] object-contain relative z-10" alt="" />
                    </motion.div>
                </div>
            </div>
        </div>
    );
};
