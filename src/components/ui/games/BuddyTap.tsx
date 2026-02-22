import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, MousePointer2, Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { playSound } from '../../../utils/sounds';
import { usePerformanceMode } from '../../../hooks/usePerformanceMode';

interface Particle {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    vr: number;
}

export const BuddyTap: React.FC = () => {
    const { t } = useTranslation();
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => {
        const saved = localStorage.getItem('buddyline_highscore_tap');
        return saved ? parseInt(saved) : 0;
    });
    const [particles, setParticles] = useState<Particle[]>([]);
    const [combo, setCombo] = useState(0);
    const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { reduceMotion, reduceEffects } = usePerformanceMode();

    const handleTap = (e: React.MouseEvent | React.TouchEvent) => {
        playSound('click', reduceEffects ? 0.25 : 0.4);
        const bonus = Math.floor(combo / 10);
        const newScore = score + 1 + bonus;

        setScore(newScore);
        setCombo(prev => prev + 1);

        if (newScore > highScore) {
            setHighScore(newScore);
            localStorage.setItem('buddyline_highscore_tap', newScore.toString());
        }

        if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
        comboTimerRef.current = setTimeout(() => setCombo(0), 1000);

        const clientX = 'clientX' in e ? e.clientX : (e as React.TouchEvent).touches[0].clientX;
        const clientY = 'clientY' in e ? e.clientY : (e as React.TouchEvent).touches[0].clientY;

        if (!reduceEffects) {
            const newParticle: Particle = {
                id: Date.now(),
                x: clientX,
                y: clientY,
                vx: (Math.random() - 0.5) * 100,
                vy: -150 - Math.random() * 50,
                vr: (Math.random() - 0.5) * 360
            };

            setParticles(prev => [...prev, newParticle].slice(-12));
        }
    };

    useEffect(() => {
        if (reduceEffects) return;
        const timer = setInterval(() => {
            setParticles(prev => prev.filter(p => Date.now() - p.id < 800));
        }, 120);
        return () => clearInterval(timer);
    }, [reduceEffects]);

    const comboProgress = Math.min(combo / 50, 1);

    return (
        <div className="flex flex-col items-center gap-8 lg:gap-10 w-full max-w-md mx-auto p-4 select-none accelerate">
            {/* Background depth items */}
            <div className="absolute inset-0 opacity-15 pointer-events-none overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-tertiary/20 blur-[80px] rounded-full" />
            </div>

            {/* Stats Bar - Premium Glass */}
            <div className="flex justify-between items-center w-full px-2 relative z-10">
                <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="flex flex-col gap-1.5"
                >
                    <span className="text-[10px] font-black text-primary/70 uppercase tracking-[0.25em] ml-1">{t('game.score')}</span>
                    <div className="flex items-center gap-3 bg-surface-container-high/40 backdrop-blur-3xl px-5 py-3 rounded-[2rem] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] accelerate">
                        <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center shadow-lg shadow-primary/20">
                            <Zap className="w-4 h-4 text-primary" />
                        </div>
                        <motion.span
                            key={score}
                            initial={{ scale: 1.2, color: '#6366f1' }}
                            animate={{ scale: 1, color: 'inherit' }}
                            className="text-2xl font-black text-on-surface tabular-nums tracking-tight"
                        >
                            {score}
                        </motion.span>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="flex flex-col items-end gap-1.5"
                >
                    <span className="text-[10px] font-black text-tertiary/70 uppercase tracking-[0.25em] mr-1">{t('game.best')}</span>
                    <div className="flex items-center gap-3 bg-surface-container-high/40 backdrop-blur-3xl px-5 py-3 rounded-[2rem] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] accelerate">
                        <Trophy className="w-4 h-4 text-tertiary" />
                        <span className="text-xl font-black text-on-surface/60 tabular-nums tracking-tight">{highScore}</span>
                    </div>
                </motion.div>
            </div>

            {/* Main Clicker Content */}
            <div className="relative w-full flex flex-col items-center gap-12 lg:gap-16 py-8">
                {/* Big Score Display */}
                <div className="flex flex-col items-center gap-4 relative">
                    <motion.div
                        key={score}
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-8xl md:text-9xl font-black bg-gradient-to-b from-white via-on-surface to-on-surface/30 bg-clip-text text-transparent tracking-tighter drop-shadow-[0_20px_50px_rgba(0,0,0,0.3)] tabular-nums leading-none select-none relative z-10"
                    >
                        {score}
                    </motion.div>

                    {/* Combo Label */}
                    <AnimatePresence>
                        {combo > 5 && (
                            <motion.div
                                initial={{ scale: 0, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0, opacity: 0, y: 20 }}
                                className="flex flex-col items-center gap-3 relative z-20"
                            >
                                <div className="bg-gradient-to-r from-primary to-tertiary text-white px-8 py-2 rounded-full text-sm font-black italic flex items-center gap-3 shadow-[0_0_40px_rgba(99,102,241,0.5)] border border-white/20">
                                    <Zap className="w-5 h-5 fill-current animate-pulse" />
                                    {combo}x {t('game.combo')}
                                </div>
                                <div className="w-40 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/10">
                                    <motion.div
                                        animate={{ width: `${comboProgress * 100}%` }}
                                        className="h-full bg-gradient-to-r from-primary via-white to-tertiary"
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* The "Liquid" Tap Button */}
                <motion.div
                    className="relative group cursor-pointer"
                    onMouseDown={handleTap}
                    onTouchStart={handleTap}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.92 }}
                >
                    {/* Multi-layered Glows */}
                    <div className="absolute inset-[-100px] bg-primary/10 blur-[120px] rounded-full pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity duration-700" />

                    <motion.div
                        animate={reduceMotion ? undefined : {
                            scale: [1, 1.25, 1],
                            opacity: [0.1, 0.2, 0.1],
                        }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-[-40px] bg-gradient-to-tr from-primary to-tertiary blur-[60px] rounded-full pointer-events-none"
                    />

                    <div className="w-48 h-48 md:w-56 md:h-56 rounded-full p-[2px] bg-gradient-to-br from-white/30 via-primary to-tertiary/30 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)] relative overflow-hidden group">
                        {/* Liquid Background Effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-surface-container-high/90 to-surface-container-low/95 backdrop-blur-3xl rounded-full" />

                        {/* Glass Reflections */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent pointer-events-none" />
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-3/4 h-1/4 bg-gradient-to-b from-white/20 to-transparent rounded-full blur-md opacity-50" />

                        {/* Center Icon/Logo */}
                        <div className="absolute inset-0 flex items-center justify-center p-14 md:p-16">
                            <motion.div
                                animate={combo > 10 ? {
                                    filter: ['brightness(1)', 'brightness(1.5)', 'brightness(1)'],
                                    scale: [1, 1.05, 1]
                                } : {}}
                                transition={{ duration: 0.5, repeat: Infinity }}
                                className="relative"
                            >
                                <img
                                    src="/logo.png"
                                    alt="BuddyLine"
                                    className={`w-full h-full object-contain transition-all duration-300 ${combo > 20 ? 'drop-shadow-[0_0_25px_rgba(255,255,255,0.6)]' : 'opacity-80'}`}
                                />
                                {combo > 15 && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: [0, 1, 0] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="absolute inset-0 bg-primary/30 blur-2xl rounded-full -z-10"
                                    />
                                )}
                            </motion.div>
                        </div>

                        {/* Animated Inner Ring */}
                        <div className="absolute inset-4 rounded-full border border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
                    </div>

                    <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute bottom-[-60px] left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30 hover:opacity-100 transition-opacity"
                    >
                        <MousePointer2 className="w-5 h-5 text-on-surface-variant" />
                    </motion.div>
                </motion.div>
            </div>

            {/* Particles - Refined Glass Shards/Splashes */}
            <AnimatePresence>
                {particles.map(particle => (
                    <motion.div
                        key={particle.id}
                        initial={{
                            x: particle.x,
                            y: particle.y,
                            opacity: 1,
                            scale: 0.3,
                            rotate: 0,
                            filter: 'blur(0px)'
                        }}
                        animate={{
                            y: particle.y + particle.vy,
                            x: particle.x + particle.vx,
                            opacity: 0,
                            scale: 2,
                            rotate: particle.vr,
                            filter: 'blur(4px)'
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
                        className="fixed pointer-events-none z-[110]"
                    >
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-white/40 via-primary/20 to-transparent backdrop-blur-md border border-white/20 flex items-center justify-center p-2 shadow-xl shadow-primary/20">
                            <Zap className="w-full h-full text-white fill-current" />
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};
