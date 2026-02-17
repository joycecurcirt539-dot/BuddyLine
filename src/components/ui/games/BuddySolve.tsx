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

export const BuddySolve: React.FC = () => {
    const { t } = useTranslation();
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
    const timerRef = useRef<any>(null);

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
            setIsGameOver(true);
            setIsActive(false);
            if (score > bestScore) {
                setBestScore(score);
                localStorage.setItem('buddyline_highscore_solve', score.toString());
            }
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
        <div className="flex flex-col items-center gap-4 lg:gap-6 w-full max-w-sm mx-auto p-4 select-none">
            {/* Stats */}
            <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-2.5 bg-surface-container-high/50 backdrop-blur-2xl px-3.5 py-2 rounded-2xl border border-outline/10 shadow-lg">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${feedback === 'correct' ? 'bg-green-500/20' : 'bg-primary/15'}`}>
                        <Zap className={`w-3.5 h-3.5 transition-colors ${feedback === 'correct' ? 'text-green-500' : 'text-primary'}`} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[7px] text-on-surface-variant/50 font-black uppercase tracking-[0.2em] leading-none">{t('game.score')}</span>
                        <motion.span
                            key={score}
                            initial={{ scale: 1.3 }}
                            animate={{ scale: 1 }}
                            className="text-xl font-black text-on-surface tabular-nums leading-none mt-0.5"
                        >
                            {score}
                        </motion.span>
                    </div>
                </div>

                {/* Timer - with circular progress */}
                <div className={`flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border backdrop-blur-2xl transition-all duration-300 shadow-lg ${timeLeft < 10 ? 'bg-error/15 border-error/20' : 'bg-surface-container-high/50 border-outline/10'}`}>
                    <div className="relative w-6 h-6">
                        <svg className="w-6 h-6 -rotate-90" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" className="text-outline/10" />
                            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"
                                strokeDasharray={`${timerProgress * 62.83} 62.83`}
                                className={`transition-all duration-1000 ${timeLeft < 10 ? 'text-error' : 'text-primary'}`}
                            />
                        </svg>
                        <Timer className={`w-3 h-3 absolute inset-0 m-auto ${timeLeft < 10 ? 'text-error animate-pulse' : 'text-primary'}`} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[7px] text-on-surface-variant/50 font-black uppercase tracking-[0.2em] leading-none">{t('game.solve.time')}</span>
                        <span className={`text-xl font-black tabular-nums leading-none mt-0.5 ${timeLeft < 10 ? 'text-error' : 'text-on-surface'}`}>{timeLeft}s</span>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 bg-surface-container-high/50 backdrop-blur-2xl px-3.5 py-2 rounded-2xl border border-outline/10 shadow-lg">
                    <Trophy className="w-4 h-4 text-primary/60" />
                    <div className="flex flex-col items-end">
                        <span className="text-[7px] text-on-surface-variant/50 font-black uppercase tracking-[0.2em] leading-none">{t('game.best')}</span>
                        <span className="text-lg font-black text-on-surface/60 tabular-nums leading-none mt-0.5">{bestScore}</span>
                    </div>
                </div>
            </div>

            {/* Play Area */}
            <div className="relative aspect-square w-full bg-surface-container-low/30 rounded-[2rem] border border-outline/8 backdrop-blur-xl p-5 flex flex-col items-center justify-center overflow-hidden shadow-2xl">
                <AnimatePresence mode="wait">
                    {!isActive && !isGameOver ? (
                        <motion.div
                            key="start"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.2 }}
                            className="flex flex-col items-center text-center px-4"
                        >
                            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-tertiary/20 flex items-center justify-center mb-5 shadow-xl">
                                <Brain className="w-10 h-10 text-primary" />
                            </div>
                            <h3 className="text-2xl font-black bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent mb-2 uppercase italic tracking-tight">BuddySolve</h3>
                            <p className="text-xs font-bold text-on-surface-variant/50 mb-7 max-w-[200px] leading-relaxed">
                                {t('game.solve.instruction')}
                            </p>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={startGame}
                                className="px-10 py-3.5 bg-gradient-to-r from-primary to-tertiary text-on-primary rounded-2xl font-black uppercase tracking-wider text-xs shadow-xl shadow-primary/25"
                            >
                                {t('game.start')}
                            </motion.button>
                        </motion.div>
                    ) : isGameOver ? (
                        <motion.div
                            key="gameover"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center text-center p-6 bg-surface-container-highest/50 rounded-[2rem] border border-outline/15 backdrop-blur-2xl"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-error/15 flex items-center justify-center mb-3">
                                <span className="text-2xl">⏰</span>
                            </div>
                            <h3 className="text-2xl font-black text-error mb-1 uppercase italic tracking-tight">{t('game.solve.time_up')}</h3>
                            <div className="flex flex-col mb-5">
                                <span className="text-[8px] text-on-surface-variant/50 font-black uppercase tracking-[0.2em] mb-1">{t('game.solve.final_score')}</span>
                                <span className="text-5xl font-black bg-gradient-to-b from-on-surface to-on-surface/50 bg-clip-text text-transparent">{score}</span>
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={startGame}
                                className="w-full py-3.5 bg-gradient-to-r from-primary to-tertiary text-on-primary rounded-xl font-black uppercase tracking-wider text-[10px] shadow-lg"
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
                            <div className={`text-4xl lg:text-5xl font-black text-on-surface italic tracking-tight flex-1 flex items-center justify-center transition-colors duration-300 ${feedback === 'wrong' ? 'text-error animate-shake' : ''}`}>
                                {equation?.text}
                            </div>

                            <div className="grid grid-cols-2 gap-2.5 w-full">
                                {equation?.options.map((opt, i) => (
                                    <motion.button
                                        key={`${equation.text}-${i}`}
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => handleAnswer(opt)}
                                        className="h-16 lg:h-20 bg-surface-container-high/50 hover:bg-surface-container-highest/80 border border-outline/10 rounded-2xl flex items-center justify-center text-2xl font-black text-on-surface transition-all active:bg-gradient-to-r active:from-primary active:to-tertiary active:text-on-primary backdrop-blur-xl shadow-lg"
                                    >
                                        {opt}
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Feedback Overlays */}
                <AnimatePresence>
                    {feedback === 'correct' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5, y: 0 }}
                            animate={{ opacity: 1, scale: 1.5, y: -100 }}
                            exit={{ opacity: 0 }}
                            className="absolute pointer-events-none text-green-500 font-black text-3xl"
                        >
                            ✓ +2s
                        </motion.div>
                    )}
                    {feedback === 'wrong' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5, y: 0 }}
                            animate={{ opacity: 1, scale: 1.5, y: -50 }}
                            exit={{ opacity: 0 }}
                            className="absolute pointer-events-none text-error font-black text-3xl"
                        >
                            ✗ -5s
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {isActive && (
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setIsActive(false); setIsGameOver(true); }}
                    className="flex items-center gap-2 px-6 py-2.5 bg-error/8 text-error border border-error/15 rounded-full font-black uppercase tracking-wider text-[9px] backdrop-blur-xl"
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {t('game.solve.abandon')}
                </motion.button>
            )}
        </div>
    );
};
