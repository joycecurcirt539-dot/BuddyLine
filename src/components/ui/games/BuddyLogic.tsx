import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Trophy, Zap, HelpCircle } from 'lucide-react';
import { playSound } from '../../../utils/sounds';


interface Sequence {
    items: string[];
    answer: string;
    options: string[];
    type: string;
}

import { usePerformanceMode } from '../../../hooks/usePerformanceMode';

export const BuddyLogic: React.FC = () => {
    const { t } = useTranslation();
    const { reduceEffects } = usePerformanceMode();
    const [score, setScore] = useState(0);
    const [bestScore, setBestScore] = useState(() => {
        const saved = localStorage.getItem('buddyline_highscore_logic');
        return saved ? parseInt(saved) : 0;
    });
    const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
    const [sequence, setSequence] = useState<Sequence | null>(null);
    const [lives, setLives] = useState(3);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

    const generateSequence = useCallback(() => {
        const types = ['arithmetic', 'geometric', 'fibonacci', 'square'];
        const type = types[Math.floor(Math.random() * types.length)];
        let items: (number | string)[] = [];
        let answer: number | string = '';

        switch (type) {
            case 'arithmetic': {
                const start = Math.floor(Math.random() * 20);
                const step = Math.floor(Math.random() * 10) + 1;
                items = [start, start + step, start + 2 * step, start + 3 * step];
                answer = start + 4 * step;
                break;
            }
            case 'geometric': {
                const start = Math.floor(Math.random() * 5) + 1;
                const ratio = Math.floor(Math.random() * 3) + 2;
                items = [start, start * ratio, start * ratio * ratio, start * Math.pow(ratio, 3)];
                answer = start * Math.pow(ratio, 4);
                break;
            }
            case 'fibonacci': {
                const start1 = Math.floor(Math.random() * 5);
                const start2 = Math.floor(Math.random() * 5) + 1;
                items = [start1, start2, start1 + start2, start1 + 2 * start2];
                answer = 2 * start1 + 3 * start2;
                break;
            }
            case 'square': {
                const start = Math.floor(Math.random() * 5) + 1;
                items = [start * start, (start + 1) * (start + 1), (start + 2) * (start + 2), (start + 3) * (start + 3)];
                answer = (start + 4) * (start + 4);
                break;
            }
            default:
                break;
        }

        const options = [answer.toString()];
        while (options.length < 4) {
            let wrong;
            if (typeof answer === 'number') {
                wrong = (answer + (Math.floor(Math.random() * 10) - 5)).toString();
            } else {
                wrong = (parseInt(answer) + (Math.floor(Math.random() * 10) - 5)).toString();
            }
            if (!options.includes(wrong.toString())) options.push(wrong.toString());
        }

        setSelectedAnswer(null);
        setSequence({
            items: items.map(i => i.toString()),
            answer: answer.toString(),
            options: options.sort(() => Math.random() - 0.5),
            type: type.toUpperCase()
        });
    }, []);

    const startGame = () => {
        setScore(0);
        setLives(3);
        setGameState('playing');
        setFeedback(null);
        setSelectedAnswer(null);
        generateSequence();
    };

    const handleAnswer = (selected: string) => {
        if (gameState !== 'playing' || !sequence || feedback) return;

        setSelectedAnswer(selected);
        if (selected === sequence.answer) {
            playSound('correct', 0.5);
            setScore(prev => prev + 1);
            setFeedback('correct');
            setTimeout(() => {
                setFeedback(null);
                generateSequence();
            }, 1000);
        } else {
            setLives(prev => {
                const next = prev - 1;
                if (next <= 0) {
                    setTimeout(() => {
                        setGameState('gameover');
                        if (score > bestScore) {
                            setBestScore(score);
                            localStorage.setItem('buddyline_highscore_logic', score.toString());
                        }
                    }, 1000);
                }
                return next;
            });
            playSound('lose_life', 0.5);
            setFeedback('wrong');
            setTimeout(() => {
                setFeedback(null);
                if (lives > 1) {
                    generateSequence();
                }
            }, 1000);
        }
    };

    return (
        <div className="flex flex-col items-center gap-8 lg:gap-12 w-full max-w-md mx-auto p-4 select-none accelerate">
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
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shadow-lg shadow-primary/20">
                            <Zap className="w-4 h-4 text-primary" />
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

                {/* Lives - Glowing Pearls */}
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-surface-container-high/40 backdrop-blur-3xl px-6 py-4 rounded-[2.5rem] border border-white/10 shadow-xl flex items-center gap-4"
                >
                    {[...Array(3)].map((_, i) => (
                        <motion.div
                            key={i}
                            animate={{
                                scale: i < lives ? [1, 1.2, 1] : 0.6,
                                opacity: i < lives ? 1 : 0.15,
                                filter: i < lives ? 'brightness(1.5)' : 'brightness(1)',
                            }}
                            transition={{
                                type: 'spring',
                                stiffness: 300,
                                duration: 2,
                                repeat: i < lives ? Infinity : 0,
                                repeatType: "reverse"
                            }}
                            className={`w-4 h-4 rounded-full relative transition-colors ${i < lives ? 'bg-gradient-to-br from-white via-primary to-primary shadow-[0_0_20px_rgba(99,102,241,0.6)]' : 'bg-on-surface/20'}`}
                        >
                            {i < lives && (
                                <div className="absolute inset-0 rounded-full bg-white/40 blur-[1px] scale-50 -translate-y-[2px]" />
                            )}
                        </motion.div>
                    ))}
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

            {/* Main Area - Liquid Glass Container */}
            <div style={{ touchAction: 'none' }} className={`relative aspect-square w-full bg-gradient-to-br from-surface-container-low/40 to-transparent rounded-[3rem] lg:rounded-[4rem] border border-white/10 ${reduceEffects ? '' : 'backdrop-blur-3xl'} p-8 flex flex-col items-center justify-center overflow-hidden shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)] accelerate`}>
                <AnimatePresence mode="wait">
                    {gameState === 'start' ? (
                        <motion.div
                            key="start"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            className="flex flex-col items-center text-center px-4 relative z-10"
                        >
                            <div className="w-24 h-24 rounded-[2.5rem] bg-gradient-to-br from-primary to-tertiary flex items-center justify-center mb-8 shadow-2xl shadow-primary/40 relative">
                                <HelpCircle className="w-12 h-12 text-white" />
                                <div className="absolute inset-0 rounded-[2.5rem] border border-white/30" />
                            </div>
                            <h3 className="text-4xl font-black bg-gradient-to-r from-primary via-white to-tertiary bg-clip-text text-transparent mb-3 uppercase italic tracking-tighter">BuddyLogic</h3>
                            <p className="text-sm font-bold text-on-surface-variant/70 mb-10 max-w-[240px] leading-relaxed">
                                {t('game.logic.instruction')}
                            </p>
                            <motion.button
                                whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(99,102,241,0.5)' }}
                                whileTap={{ scale: 0.95 }}
                                onClick={startGame}
                                className="px-14 py-5 bg-gradient-to-r from-primary to-tertiary text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs shadow-xl relative overflow-hidden group"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                                {t('game.start')}
                            </motion.button>
                        </motion.div>
                    ) : gameState === 'gameover' ? (
                        <motion.div
                            key="gameover"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center text-center p-10 bg-surface-container-highest/60 rounded-[3.5rem] border border-white/15 backdrop-blur-2xl shadow-[0_0_100px_rgba(0,0,0,0.5)] relative overflow-hidden max-w-[320px]"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-error/20 via-transparent to-transparent pointer-events-none" />
                            <div className="w-20 h-20 rounded-[2rem] bg-error/20 flex items-center justify-center mb-6 shadow-xl shadow-error/10">
                                <Brain className="w-10 h-10 text-error" />
                            </div>
                            <h3 className="text-3xl font-black text-error mb-2 uppercase italic tracking-tighter">{t('game.logic.fail')}</h3>
                            <div className="flex flex-col mb-10">
                                <span className="text-[10px] text-on-surface-variant/50 font-black uppercase tracking-[0.25em] mb-1">{t('game.solve.final_score')}</span>
                                <span className="text-7xl font-black bg-gradient-to-b from-white to-on-surface/30 bg-clip-text text-transparent tracking-tighter tabular-nums leading-none">{score}</span>
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={startGame}
                                className="w-full py-5 bg-gradient-to-r from-primary to-tertiary text-white rounded-[1.5rem] font-black uppercase tracking-[0.15em] text-xs shadow-xl shadow-primary/30"
                            >
                                {t('game.logic.recalibrate')}
                            </motion.button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="playing"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="w-full h-full flex flex-col justify-between py-2"
                        >
                            <div className="flex flex-col items-center gap-8">
                                <div className="bg-primary/10 border border-primary/20 px-6 py-2 rounded-full shadow-lg shadow-primary/5">
                                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em] font-mono leading-none">
                                        {t('game.logic.sequence_type', { type: sequence?.type })}
                                    </span>
                                </div>

                                <div className="flex items-center justify-center gap-3 lg:gap-5 w-full">
                                    {sequence?.items.map((item, i) => (
                                        <div key={i} className="flex items-center gap-2 lg:gap-4 group">
                                            <motion.div
                                                initial={{ scale: 0, y: 20 }}
                                                animate={{ scale: 1, y: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                                className="w-12 h-12 lg:w-16 lg:h-16 bg-surface-container-high/40 backdrop-blur-3xl border border-white/10 rounded-2xl flex items-center justify-center text-xl lg:text-3xl font-black text-on-surface shadow-[0_10px_30px_rgba(0,0,0,0.3)] relative overflow-hidden"
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
                                                {item}
                                            </motion.div>
                                            {i < 3 && (
                                                <motion.div
                                                    animate={{ x: [0, 5, 0], opacity: [0.3, 1, 0.3] }}
                                                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                                                    className="w-4 lg:w-6 h-[2px] bg-gradient-to-r from-primary/50 to-transparent rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                                                />
                                            )}
                                        </div>
                                    ))}
                                    <div className="w-4 lg:w-6 h-[2px] bg-gradient-to-r from-primary/50 to-transparent rounded-full opacity-30" />
                                    <motion.div
                                        animate={{
                                            borderColor: ['rgba(255,255,255,0.1)', 'rgba(99,102,241,0.5)', 'rgba(255,255,255,0.1)'],
                                            boxShadow: ['0 0 0px rgba(99,102,241,0)', '0 0 30px rgba(99,102,241,0.3)', '0 0 0px rgba(99,102,241,0)']
                                        }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="w-12 h-12 lg:w-16 lg:h-16 bg-primary/10 border-2 border-dashed border-primary/30 rounded-2xl flex items-center justify-center text-xl lg:text-3xl font-black text-primary relative overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                                        ?
                                    </motion.div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 w-full relative z-10 pb-4">
                                {sequence?.options.map((opt, i) => {
                                    const isCorrect = opt === sequence.answer;
                                    const isSelected = opt === selectedAnswer;

                                    let buttonStyle = 'bg-surface-container-high/40 border-white/10 text-on-surface hover:bg-surface-container-highest/60 hover:y-[-4px] backdrop-blur-3xl shadow-xl shadow-black/20';
                                    if (feedback) {
                                        if (isCorrect) {
                                            buttonStyle = 'bg-green-500/20 border-green-500/40 text-green-400 shadow-[0_0_40px_rgba(34,197,94,0.2)] scale-105 z-10';
                                        } else if (isSelected && !isCorrect) {
                                            buttonStyle = 'bg-error/20 border-error/40 text-error shadow-[0_0_40px_rgba(239,68,68,0.2)] animate-shake';
                                        } else {
                                            buttonStyle = 'bg-surface-container-high/10 border-white/5 text-on-surface/20 opacity-30 scale-95';
                                        }
                                    }

                                    return (
                                        <motion.button
                                            key={`${sequence.type}-${i}`}
                                            whileHover={!feedback ? { scale: 1.05, y: -4, backgroundColor: 'rgba(255,255,255,0.1)' } : {}}
                                            whileTap={!feedback ? { scale: 0.95 } : {}}
                                            onClick={() => handleAnswer(opt)}
                                            disabled={!!feedback}
                                            className={`
                                                h-20 lg:h-24 rounded-[2rem] flex items-center justify-center text-2xl lg:text-3xl font-black transition-all duration-300 border relative overflow-hidden
                                                ${buttonStyle}
                                            `}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
                                            <span className="relative z-10">{opt}</span>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {gameState === 'playing' && (
                <div className="bg-surface-container-high/30 backdrop-blur-3xl px-8 py-3 rounded-full border border-white/5 text-[10px] font-black text-primary/40 uppercase tracking-[0.4em] italic shadow-lg">
                    {t('game.logic.hint')}
                </div>
            )}
        </div>
    );
};
