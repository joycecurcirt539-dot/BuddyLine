import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ArrowUp, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { usePerformanceMode } from '../../../hooks/usePerformanceMode';
import { playSound } from '../../../utils/sounds';

interface Platform {
    id: number;
    x: number;
    y: number;
    width: number;
    type?: 'normal' | 'moving';
}

const GAME_WIDTH = 300;
const GAME_HEIGHT = 400;
const GRAVITY = 0.4;
const JUMP_FORCE = -12;
const PLATFORM_SPACING = 120;
const PLATFORM_COUNT = 6;
const PLATFORM_WIDTH = 80;
const PLAYER_SIZE = 36;

export const BuddyJump: React.FC = () => {
    const { t } = useTranslation();
    const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');

    // HUD state (lower frequency updates)
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => {
        const saved = localStorage.getItem('buddyline_highscore_jump');
        return saved ? parseInt(saved) : 0;
    });

    const [platforms, setPlatforms] = useState<Platform[]>([]);

    const gameLoopRef = useRef<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const playerElRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<HTMLDivElement>(null);

    // High-frequency game state refs
    const playerRef = useRef({ x: 200, y: 250, vy: JUMP_FORCE });
    const platformsRef = useRef<Platform[]>([]);
    const cameraYRef = useRef(0);
    const scoreRef = useRef(0);
    const gameStateRef = useRef<'start' | 'playing' | 'gameover'>(gameState);

    // Sync ref with state
    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    // Direct DOM manipulation for butter-smooth movement
    const updateDOM = useCallback(() => {
        if (!playerElRef.current || !sceneRef.current) return;

        // Update player position
        const p = playerRef.current;
        playerElRef.current.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;

        // Update camera (scene scroll)
        const camY = cameraYRef.current;
        sceneRef.current.style.transform = `translate3d(0, ${-camY}px, 0)`;

        // Update HUD elements that don't need full React re-renders every frame
        // (Though we still use state for the score display below)
    }, []);

    const initGame = useCallback(() => {
        const initialPlatforms: Platform[] = [];
        for (let i = 0; i < PLATFORM_COUNT; i++) {
            initialPlatforms.push({
                id: i,
                x: Math.random() * (GAME_WIDTH - PLATFORM_WIDTH),
                y: GAME_HEIGHT - (i * PLATFORM_SPACING) - 100,
                width: PLATFORM_WIDTH,
                type: Math.random() > 0.8 ? 'moving' : 'normal'
            });
        }

        platformsRef.current = initialPlatforms;
        playerRef.current = { x: 200, y: 250, vy: JUMP_FORCE };
        scoreRef.current = 0;
        cameraYRef.current = 0;

        setPlatforms(initialPlatforms);
        setScore(0);
        updateDOM();
        setHighScore(prev => {
            const saved = localStorage.getItem('buddyline_highscore_jump');
            return saved ? parseInt(saved) : prev;
        });
        setGameState('playing');
    }, [updateDOM]);

    useLayoutEffect(() => {
        if (gameState === 'playing') {
            initGame();
        }
    }, [gameState, initGame]);

    const handleInput = useCallback((e: MouseEvent | TouchEvent) => {
        if (gameStateRef.current !== 'playing') return;

        let clientX: number;
        if ('touches' in e) {
            if (e.cancelable) e.preventDefault(); // BLOCK BROWSER GESTURES
            clientX = e.touches[0].clientX;
        } else {
            clientX = (e as MouseEvent).clientX;
        }

        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
            const x = clientX - rect.left;
            playerRef.current.x = Math.max(0, Math.min(GAME_WIDTH - PLAYER_SIZE, x - PLAYER_SIZE / 2));
            updateDOM();
        }
    }, [updateDOM]);

    // Native event listeners to ensure passive: false and proper blocking
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const handleTouch = ((e: TouchEvent) => handleInput(e)) as EventListener;
        const handleMouse = ((e: MouseEvent) => handleInput(e)) as EventListener;

        const opts: AddEventListenerOptions = { passive: false };
        el.addEventListener('touchstart', handleTouch, opts);
        el.addEventListener('touchmove', handleTouch, opts);
        el.addEventListener('mousemove', handleMouse);

        return () => {
            el.removeEventListener('touchstart', handleTouch, opts);
            el.removeEventListener('touchmove', handleTouch, opts);
            el.removeEventListener('mousemove', handleMouse);
        };
    }, [handleInput]);

    useEffect(() => {
        if (gameState !== 'playing') return;

        const loop = () => {
            if (gameStateRef.current !== 'playing') return;

            const p = playerRef.current;
            let newY = p.y + p.vy;
            let newVy = p.vy + GRAVITY;

            // Collision detection
            if (newVy > 0) {
                const platform = platformsRef.current.find(plat =>
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

            // Camera follow
            if (newY < cameraYRef.current + 150) {
                cameraYRef.current = newY - 150;
            }

            // Score logic
            const heightVal = Math.floor(Math.abs(newY - 250) / 10);
            if (heightVal > scoreRef.current) {
                scoreRef.current = heightVal;
                // Throttled score update for UI
                if (heightVal % 2 === 0) setScore(heightVal);
            }

            // Game over
            if (newY > cameraYRef.current + GAME_HEIGHT + 100) {
                playSound('fall', 0.6);
                setGameState('gameover');
                setScore(heightVal);
                if (heightVal > highScore) {
                    setHighScore(heightVal);
                    localStorage.setItem('buddyline_highscore_jump', heightVal.toString());
                }
                return;
            }

            playerRef.current = { ...p, y: newY, vy: newVy };
            updateDOM();

            // Continuous platform generation
            const currentPlatforms = platformsRef.current;
            const filtered = currentPlatforms.filter(plat => plat.y < cameraYRef.current + GAME_HEIGHT + 200);
            const highest = filtered.reduce((min, plat) => Math.min(min, plat.y), cameraYRef.current + GAME_HEIGHT);

            if (highest > cameraYRef.current - 100) {
                filtered.push({
                    id: Date.now() + Math.random(),
                    x: Math.random() * (GAME_WIDTH - PLATFORM_WIDTH),
                    y: highest - PLATFORM_SPACING,
                    width: PLATFORM_WIDTH,
                    type: Math.random() > 0.8 ? 'moving' : 'normal'
                });
                platformsRef.current = filtered;
                setPlatforms([...filtered]);
            } else if (filtered.length !== currentPlatforms.length) {
                platformsRef.current = filtered;
                setPlatforms([...filtered]);
            }

            gameLoopRef.current = requestAnimationFrame(loop);
        };

        gameLoopRef.current = requestAnimationFrame(loop);
        return () => {
            if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
        };
    }, [gameState, highScore, updateDOM]);

    return (
        <div className="flex flex-col items-center gap-3 lg:gap-5 w-full max-w-md mx-auto h-full">
            {/* HUD */}
            <div className="flex justify-between items-center w-full px-3 flex-shrink-0">
                <div className="flex items-center gap-2.5 bg-surface-container-high/50 backdrop-blur-2xl px-3.5 py-2 rounded-2xl border border-outline/10 shadow-lg">
                    <div className="w-6 h-6 rounded-lg bg-primary/15 flex items-center justify-center">
                        <ArrowUp className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[7px] text-on-surface-variant/50 font-black uppercase tracking-[0.2em] leading-none">{t('game.jump.height')}</span>
                        <span className="text-xl font-black text-on-surface tabular-nums leading-none mt-0.5">{score}m</span>
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
                style={{ touchAction: 'none' }}
                className="relative overflow-hidden bg-gradient-to-b from-surface-container-low/60 to-surface-container-low border border-outline/10 rounded-2xl lg:rounded-[2rem] shadow-2xl cursor-crosshair group aspect-[3/4] w-full max-w-[280px] h-full"
            >
                {/* Scene Wrapper */}
                <div ref={sceneRef} className="absolute inset-0 will-change-transform">
                    {/* Background Detail */}
                    <div className="absolute inset-0 opacity-15 overflow-hidden">
                        <div className="absolute top-20 left-10 w-24 h-24 bg-primary blur-[50px] rounded-full" />
                        <div className="absolute top-[400px] right-10 w-36 h-36 bg-tertiary blur-[70px] rounded-full" />
                    </div>

                    {/* Infinite Grid Lines */}
                    <div className="absolute inset-0 opacity-[0.03]">
                        {Array.from({ length: 20 }).map((_, i) => (
                            <div key={i} className="absolute left-0 right-0 h-px bg-on-surface" style={{ top: i * 50 }} />
                        ))}
                    </div>

                    {/* Platforms */}
                    {platforms.map(p => (
                        <div
                            key={p.id}
                            className={clsx(
                                "absolute rounded-full h-3 shadow-lg transition-transform",
                                p.type === 'moving'
                                    ? "bg-gradient-to-r from-purple-400 to-pink-400"
                                    : "bg-gradient-to-r from-blue-400 to-indigo-400"
                            )}
                            style={{
                                width: PLATFORM_WIDTH,
                                left: p.x,
                                top: p.y,
                            }}
                        />
                    ))}

                    {/* Player */}
                    <div
                        ref={playerElRef}
                        className="absolute flex items-center justify-center will-change-transform"
                        style={{
                            width: PLAYER_SIZE,
                            height: PLAYER_SIZE,
                            transform: `translate3d(200px, 250px, 0)`,
                            marginLeft: -PLAYER_SIZE / 2,
                            marginTop: -PLAYER_SIZE
                        }}
                    >
                        <div className="player-inner w-full h-full bg-gradient-to-br from-primary to-tertiary rounded-xl shadow-lg shadow-primary/30 flex items-center justify-center">
                            <img src="/logo.png" className="w-[80%] h-[80%] object-contain" alt="" />
                        </div>
                    </div>
                </div>

                {/* Overlays */}
                <AnimatePresence>
                    {gameState === 'start' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-10 flex items-center justify-center bg-black/25 backdrop-blur-md p-4"
                        >
                            <div className="bg-surface-container-high/95 border border-outline/15 rounded-[2rem] p-6 shadow-2xl flex flex-col items-center text-center w-full max-w-[240px]">
                                <ArrowUp className="w-14 h-14 text-primary mb-3" />
                                <h3 className="text-xl font-black text-on-surface mb-1 uppercase leading-tight italic">{t('game.jump.ready')}</h3>
                                <p className="text-[10px] font-bold text-on-surface-variant/60 mb-5 leading-relaxed">
                                    {t('game.jump.instruction')}
                                </p>
                                <button
                                    onClick={initGame}
                                    className="w-full py-3 bg-gradient-to-r from-primary to-tertiary text-on-primary rounded-xl font-black uppercase tracking-wider text-xs"
                                >
                                    {t('game.start')}
                                </button>
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
                                <h3 className="text-xl font-black text-error mb-0.5 uppercase tracking-tight italic">{t('game.jump.fail')}</h3>
                                <div className="text-3xl font-black text-on-surface mb-4">{score}m</div>
                                <button
                                    onClick={initGame}
                                    className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-primary to-tertiary text-on-primary rounded-xl font-black uppercase tracking-wider text-[10px]"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    {t('game.try_again')}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
