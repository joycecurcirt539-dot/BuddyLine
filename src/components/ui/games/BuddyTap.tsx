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
        <div
            style={{ touchAction: 'none' }}
            className="relative w-full h-full flex flex-col items-center justify-center pb-20 lg:pb-28 accelerate"
        >
            {/* Floating Stats */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
                <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">{t('game.score')}</span>
                    <div className={`flex items-center gap-2 ${reduceEffects ? '' : 'backdrop-blur-2xl'} px-3.5 py-2 rounded-2xl border border-outline/10 shadow-lg accelerate`}>
                        <Zap className="w-4 h-4 text-primary" />
                        <motion.span
                            key={score}
                            initial={{ y: -8, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="text-xl font-black text-on-surface tabular-nums"
                        >
                            {score}
                        </motion.span>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                    <span className="text-[8px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">{t('game.best')}</span>
                    <div className={`flex items-center gap-2 ${reduceEffects ? '' : 'backdrop-blur-2xl'} px-3.5 py-2 rounded-2xl border border-outline/10 shadow-lg accelerate`}>
                        <Trophy className="w-3.5 h-3.5 text-primary/60" />
                        <span className="text-lg font-black text-on-surface/60 tabular-nums">{highScore}</span>
                    </div>
                </div>
            </div>

            {/* Main Game Area */}
            <div className="relative flex flex-col items-center gap-6">
                {/* Big Score */}
                <div className="flex flex-col items-center gap-2">
                    <motion.div
                        key={score}
                        initial={{ scale: 0.85, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                        className="text-8xl md:text-9xl font-black bg-gradient-to-b from-primary via-primary to-primary/40 bg-clip-text text-transparent tracking-tighter drop-shadow-[0_0_40px_rgba(var(--primary-rgb),0.25)] tabular-nums leading-none select-none"
                    >
                        {score}
                    </motion.div>

                    {/* Combo Meter */}
                    <AnimatePresence>
                        {combo > 5 ? (
                            <motion.div
                                initial={{ scale: 0, opacity: 0, y: -10 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0, opacity: 0, y: -10 }}
                                className="flex flex-col items-center gap-1.5"
                            >
                                <div className="bg-gradient-to-r from-primary to-tertiary text-on-primary px-5 py-1.5 rounded-full text-sm font-black italic flex items-center gap-2 shadow-xl shadow-primary/30">
                                    <Zap className="w-4 h-4 fill-current" />
                                    {combo}x {t('game.combo')}
                                </div>
                                {/* Combo progress bar */}
                                <div className="w-32 h-1 bg-outline/10 rounded-full overflow-hidden">
                                    <motion.div
                                        animate={{ width: `${comboProgress * 100}%` }}
                                        className="h-full bg-gradient-to-r from-primary to-tertiary rounded-full"
                                    />
                                </div>
                            </motion.div>
                        ) : (
                            <div className="h-10" />
                        )}
                    </AnimatePresence>
                </div>

                {/* Tap Button */}
                <motion.div
                    className="relative group cursor-pointer"
                    onMouseDown={handleTap}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.88 }}
                >
                    {/* Outer Pulse Ring */}
                    <motion.div
                        animate={reduceMotion ? undefined : {
                            opacity: [0.05, 0.15, 0.05],
                            scale: [1, 1.35, 1],
                        }}
                        transition={reduceMotion ? undefined : { duration: 4, repeat: Infinity }}
                        className="absolute inset-[-70px] bg-primary/20 blur-[90px] rounded-full pointer-events-none"
                    />
                    {/* Inner Glow */}
                    <motion.div
                        animate={reduceMotion ? undefined : {
                            opacity: [0.15, 0.35, 0.15],
                            scale: [1, 1.12, 1],
                        }}
                        transition={reduceMotion ? undefined : { duration: 2.5, repeat: Infinity }}
                        className="absolute inset-[-25px] bg-primary/25 blur-[45px] rounded-full pointer-events-none"
                    />

                    <div className="w-44 h-44 md:w-56 md:h-56 rounded-full bg-gradient-to-br from-primary via-primary to-tertiary p-[3px] shadow-2xl shadow-primary/40 relative">
                        <div className="w-full h-full rounded-full bg-surface/80 backdrop-blur-2xl border border-white/10 flex items-center justify-center relative overflow-hidden">
                            {/* Inner ring glow */}
                            <div className="absolute inset-2 rounded-full border border-primary/20" />
                            <img
                                src="/logo.png"
                                alt="BuddyLine"
                                className="w-20 h-20 md:w-28 md:h-28 object-contain opacity-90 relative z-10"
                            />
                        </div>
                    </div>

                    <motion.div
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute bottom-[-55px] left-1/2 -translate-x-1/2 flex items-center gap-2 text-on-surface-variant font-bold text-xs tracking-widest opacity-40 text-center whitespace-nowrap uppercase"
                    >
                        <MousePointer2 className="w-3.5 h-3.5 shrink-0" />
                        {t('game.tap_to_connect')}
                    </motion.div>
                </motion.div>
            </div>

            {/* Particles */}
            {particles.map(particle => (
                <motion.div
                    key={particle.id}
                    initial={{
                        x: particle.x - 10,
                        y: particle.y - 10,
                        opacity: 1,
                        scale: 0.5,
                        rotate: 0
                    }}
                    animate={{
                        y: particle.y + particle.vy,
                        x: particle.x - 10 + particle.vx,
                        opacity: 0,
                        scale: 1.5,
                        rotate: particle.vr
                    }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="fixed pointer-events-none z-[110]"
                >
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary/40 to-tertiary/30 backdrop-blur-sm border border-primary/30 flex items-center justify-center p-1.5">
                        <img src="/logo.png" className="w-full h-full object-contain" alt="+" />
                    </div>
                </motion.div>
            ))}
        </div>
    );
};
