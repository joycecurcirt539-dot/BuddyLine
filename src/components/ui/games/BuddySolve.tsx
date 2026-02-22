import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Timer, Trophy, RotateCcw, Brain } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { playSound } from '../../../utils/sounds';

interface Equation {
    text: string;
    answer: number;
    options: number[];
}

import { usePerformanceMode } from '../../../hooks/usePerformanceMode';

export const BuddySolve: React.FC = () => {
    const { t } = useTranslation();
    const { reduceEffects } = usePerformanceMode();
    const [score, setScore] = useState(0);
    const [bestScore, setBestScore] = useState(() => {
        const saved = localStorage.getItem('buddyline_highscore_solve');
        return saved ? parseInt(saved) : 0;
    });
    const [timeLeft, setTimeLeft] = useState(30);
    const [isActive, setIsActive] = useState(false);
    const [isGameOver, setIsGameOver] = useState(false);
    const [equation, setEquation] = useState<Equation | null>(null);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const generateEquation = useCallback(() => {
        const level = Math.floor(score / 5);
        let a, b, op, answer;
        const ops = ['+', '-', '*'];
        if (level < 2) {
            a = Math.floor(Math.random() * 15) + 1;
            b = Math.floor(Math.random() * 15) + 1;
            op = Math.random() > 0.5 ? '+' : '-';
        } else if (level < 5) {
            op = ops[Math.floor(Math.random() * 3)];
            if (op === '*') {
                a = Math.floor(Math.random() * 9) + 2;
                b = Math.floor(Math.random() * 9) + 2;
            } else {
                a = Math.floor(Math.random() * 40) + 10;
                b = Math.floor(Math.random() * 40) + 10;
            }
        } else {
            op = ops[Math.floor(Math.random() * 3)];
            if (op === '*') {
                a = Math.floor(Math.random() * 12) + 3;
                b = Math.floor(Math.random() * 12) + 3;
            } else {
                a = Math.floor(Math.random() * 100) + 20;
                b = Math.floor(Math.random() * 100) + 20;
            }
        }

        if (op === '+') answer = a + b;
        else if (op === '-') {
            if (a < b) [a, b] = [b, a];
            answer = a - b;
        } else answer = a * b;

        const options = [answer];
        while (options.length < 4) {
            const offset = Math.floor(Math.random() * 10) - 5;
            const wrong = answer + (offset === 0 ? 3 : offset);
            if (!options.includes(wrong) && wrong >= 0) options.push(wrong);
        }

        setEquation({
            text: `${a} ${op} ${b} = ?`,
            answer,
            options: options.sort(() => Math.random() - 0.5)
        });
    }, [score]);

    const startGame = () => {
        setScore(0);
        setTimeLeft(30);
        setIsActive(true);
        setIsGameOver(false);
        setFeedback(null);
        generateEquation();
    };

    const handleAnswer = (selected: number) => {
        if (!isActive || isGameOver || !equation) return;

        if (selected === equation.answer) {
            playSound('correct', 0.5);
            setScore(prev => prev + 1);
            setFeedback('correct');
            setTimeLeft(prev => Math.min(prev + 2, 30));
            generateEquation();
        } else {
            playSound('incorrect', 0.4);
            setFeedback('wrong');
            setTimeLeft(prev => Math.max(prev - 5, 0));
        }

        setTimeout(() => setFeedback(null), 300);
    };

    useEffect(() => {
        if (timeLeft === 0 && isActive) {
            const timer = setTimeout(() => {
                setIsGameOver(true);
                setIsActive(false);
                if (score > bestScore) {
                    setBestScore(score);
                    localStorage.setItem('buddyline_highscore_solve', score.toString());
                }
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [timeLeft, isActive, score, bestScore]);

    useEffect(() => {
        if (isActive && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isActive, timeLeft]);

    const timerProgress = timeLeft / 30;

    return (
        <div className="flex flex-col items-center gap-8 lg:gap-10 w-full max-w-sm lg:max-w-md mx-auto p-4 select-none accelerate">
            {/* Background depth items */}
            <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
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
                    <div className="flex items-center gap-3 bg-surface-container-high/40 backdrop-blur-3xl px-5 py-3 rounded-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] accelerate">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 shadow-lg ${feedback === 'correct' ? 'bg-green-500/20 shadow-green-500/20' : 'bg-primary/20 shadow-primary/20'}`}>
                            <Zap className={`w-5 h-5 transition-colors ${feedback === 'correct' ? 'text-green-500' : 'text-primary'}`} />
                        </div>
                        <motion.span
                            key={score}
                            initial={{ scale: 1.2 }}
                            animate={{ scale: 1 }}
                            className="text-2xl font-black text-on-surface tabular-nums tracking-tight"
                        >
                            {score}
                        </motion.span>
                    </div>
                </motion.div>

                {/* Timer - with premium circular progress */}
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex flex-col items-center gap-2"
                >
                    <div className={`relative group px-1 rounded-full px-5 py-2.5 flex items-center gap-3 transition-all duration-300 backdrop-blur-3xl border shadow-xl ${timeLeft < 10 ? 'bg-error/20 border-error/30 scale-110' : 'bg-surface-container-high/40 border-white/10'}`}>
                        <div className="relative w-7 h-7">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white/5" />
                                <motion.circle
                                    cx="12" cy="12" r="10"
                                    fill="none" stroke="currentColor" strokeWidth="2.5"
                                    strokeDasharray="62.83"
                                    initial={{ strokeDashoffset: 62.83 }}
                                    animate={{ strokeDashoffset: 62.83 * (1 - timerProgress) }}
                                    className={`transition-colors duration-300 ${timeLeft < 10 ? 'text-error' : 'text-primary'}`}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <Timer className={`w-3.5 h-3.5 absolute inset-0 m-auto ${timeLeft < 10 ? 'text-error animate-pulse' : 'text-primary'}`} />
                        </div>
                        <span className={`text-2xl font-black tabular-nums tracking-tighter ${timeLeft < 10 ? 'text-error animate-pulse' : 'text-on-surface'}`}>{timeLeft}s</span>

                        {/* Pulse effect for low time */}
                        {timeLeft < 10 && (
                            <div className="absolute inset-0 rounded-full bg-error/20 blur-xl -z-10 animate-pulse" />
                        )}
                    </div>
                </motion.div>

                <motion.div
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="flex flex-col items-end gap-1.5"
                >
                    <span className="text-[10px] font-black text-tertiary/70 uppercase tracking-[0.25em] mr-1">{t('game.best')}</span>
                    <div className="flex items-center gap-3 bg-surface-container-high/40 backdrop-blur-3xl px-5 py-3 rounded-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] accelerate">
                        <Trophy className="w-5 h-5 text-tertiary" />
                        <span className="text-xl font-black text-on-surface/60 tabular-nums tracking-tight">{bestScore}</span>
                    </div>
                </motion.div>
            </div>

            {/* Play Area - Liquid Glass Container */}
            <div
                className={`touch-none relative aspect-square w-full bg-gradient-to-br from-surface-container-low/40 to-transparent rounded-[3rem] lg:rounded-[4rem] border border-white/10 ${reduceEffects ? '' : 'backdrop-blur-3xl'} p-8 flex flex-col items-center justify-center overflow-hidden shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)] accelerate`}>

                <AnimatePresence mode="wait">
                    {!isActive && !isGameOver ? (
                        <motion.div
                            key="start"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            className="flex flex-col items-center text-center px-4 relative z-10"
                        >
                            <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-primary to-tertiary flex items-center justify-center mb-6 shadow-2xl shadow-primary/40 relative">
                                <Brain className="w-10 h-10 text-white" />
                                <div className="absolute inset-0 rounded-[2rem] border border-white/30" />
                            </div>
                            <h3 className="text-3xl font-black bg-gradient-to-r from-primary via-white to-tertiary bg-clip-text text-transparent mb-6 uppercase italic tracking-tighter">BuddySolve</h3>
                            <motion.button
                                whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(99,102,241,0.5)' }}
                                whileTap={{ scale: 0.95 }}
                                onClick={startGame}
                                className="px-10 py-4 bg-gradient-to-r from-primary to-tertiary text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs shadow-xl relative overflow-hidden group"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                                {t('game.start')}
                            </motion.button>
                        </motion.div>
                    ) : isGameOver ? (
                        <motion.div
                            key="gameover"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center justify-center text-center p-6 bg-surface-container-highest/60 rounded-[2.5rem] border border-white/15 backdrop-blur-2xl shadow-[0_0_100px_rgba(0,0,0,0.5)] relative overflow-hidden aspect-square max-w-[220px]"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-error/20 via-transparent to-transparent pointer-events-none" />
                            <div className="w-12 h-12 rounded-[1rem] bg-error/20 flex items-center justify-center mb-4 shadow-xl shadow-error/10">
                                <img src="/logo.png" className="w-[60%] h-[60%] object-contain brightness-200" alt="logo" />
                            </div>
                            <h3 className="text-xl font-black text-error mb-2 uppercase italic tracking-tighter">{t('game.solve.time_up')}</h3>
                            <div className="flex flex-col mb-6">
                                <span className="text-[9px] text-on-surface-variant/50 font-black uppercase tracking-[0.25em] mb-1">{t('game.solve.final_score')}</span>
                                <span className="text-4xl font-black bg-gradient-to-b from-white to-on-surface/30 bg-clip-text text-transparent tracking-tighter tabular-nums leading-none">{score}</span>
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={startGame}
                                className="w-full py-5 bg-gradient-to-r from-primary to-tertiary text-white rounded-[1.5rem] font-black uppercase tracking-[0.15em] text-xs shadow-xl shadow-primary/30"
                            >
                                {t('game.try_again')}
                            </motion.button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="equation"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full h-full flex flex-col items-center justify-between"
                        >
                            <div className={`flex-1 flex flex-col items-center justify-center transition-all duration-300 ${feedback === 'wrong' ? 'scale-90 opacity-50' : feedback === 'correct' ? 'scale-110' : ''}`}>
                                <div className={`text-6xl lg:text-7xl font-black bg-gradient-to-b from-white via-on-surface to-on-surface/40 bg-clip-text text-transparent italic tracking-tighter transition-colors duration-300 px-4 text-center ${feedback === 'wrong' ? 'text-error animate-shake drop-shadow-[0_0_30px_rgba(239,68,68,0.5)]' : 'drop-shadow-[0_20px_40px_rgba(0,0,0,0.3)]'}`}>
                                    {equation?.text}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 w-full relative z-10">
                                {equation?.options.map((opt, i) => (
                                    <motion.button
                                        key={`${equation.text}-${i}`}
                                        whileHover={{ scale: 1.05, y: -4, backgroundColor: 'rgba(255,255,255,0.1)' }}
                                        whileTap={{ scale: 0.92, y: 0 }}
                                        onClick={() => handleAnswer(opt)}
                                        className="h-20 lg:h-24 bg-surface-container-high/40 border border-white/10 rounded-[2rem] flex items-center justify-center text-3xl font-black text-on-surface transition-all active:bg-gradient-to-r active:from-primary active:to-tertiary active:text-white backdrop-blur-3xl shadow-xl shadow-black/20 group relative overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <span className="relative z-10">{opt}</span>
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Feedback Overlays - Refined Liquid Effect */}
                <AnimatePresence>
                    {feedback === 'correct' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5, y: 50 }}
                            animate={{ opacity: 1, scale: 1.5, y: -150 }}
                            exit={{ opacity: 0, filter: 'blur(20px)' }}
                            className="absolute pointer-events-none text-green-400 font-black text-5xl italic drop-shadow-[0_0_30px_rgba(74,222,128,0.4)] z-[50]"
                        >
                            ✓ +2s
                        </motion.div>
                    )}
                    {feedback === 'wrong' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5, y: 0 }}
                            animate={{ opacity: 1, scale: 1.8, y: -80 }}
                            exit={{ opacity: 0, filter: 'blur(20px)' }}
                            className="absolute pointer-events-none text-error font-black text-5xl italic drop-shadow-[0_0_30px_rgba(239,68,68,0.4)] z-[50]"
                        >
                            ✗ -5s
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {isActive && (
                <motion.button
                    whileHover={{ scale: 1.05, backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setIsActive(false); setIsGameOver(true); }}
                    className="flex items-center gap-3 px-10 py-4 bg-error/10 text-error border border-error/20 rounded-full font-black uppercase tracking-[0.25em] text-[10px] backdrop-blur-3xl transition-all shadow-lg"
                >
                    <RotateCcw className="w-4 h-4" />
                    {t('game.solve.abandon')}
                </motion.button>
            )}
        </div>
    );
};
