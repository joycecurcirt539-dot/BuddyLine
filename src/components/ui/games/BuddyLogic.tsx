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

export const BuddyLogic: React.FC = () => {
    const { t } = useTranslation();
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
        <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto p-4 select-none">
            {/* Stats */}
            <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-2.5 bg-surface-container-high/50 backdrop-blur-2xl px-3.5 py-2 rounded-2xl border border-outline/10 shadow-lg">
                    <div className="w-6 h-6 rounded-lg bg-primary/15 flex items-center justify-center">
                        <Zap className="w-3.5 h-3.5 text-primary" />
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

                {/* Lives */}
                <div className="flex items-center gap-2 bg-surface-container-high/50 backdrop-blur-2xl px-3 py-2.5 rounded-2xl border border-outline/10 shadow-lg">
                    {[...Array(3)].map((_, i) => (
                        <motion.div
                            key={i}
                            animate={{
                                scale: i < lives ? 1 : 0.6,
                                opacity: i < lives ? 1 : 0.2,
                            }}
                            transition={{ type: 'spring', stiffness: 300 }}
                            className={`w-3 h-3 rounded-full transition-colors ${i < lives ? 'bg-gradient-to-br from-primary to-tertiary shadow-md shadow-primary/30' : 'bg-on-surface-variant/15'}`}
                        />
                    ))}
                </div>

                <div className="flex items-center gap-2.5 bg-surface-container-high/50 backdrop-blur-2xl px-3.5 py-2 rounded-2xl border border-outline/10 shadow-lg">
                    <Trophy className="w-4 h-4 text-primary/60" />
                    <div className="flex flex-col items-end">
                        <span className="text-[7px] text-on-surface-variant/50 font-black uppercase tracking-[0.2em] leading-none">{t('game.best')}</span>
                        <span className="text-lg font-black text-on-surface/60 tabular-nums leading-none mt-0.5">{bestScore}</span>
                    </div>
                </div>
            </div>

            {/* Main Area */}
            <div className="relative aspect-square w-full bg-surface-container-low/30 rounded-[2rem] border border-outline/8 backdrop-blur-xl p-4 flex flex-col items-center justify-center overflow-hidden shadow-2xl">
                <AnimatePresence mode="wait">
                    {gameState === 'start' ? (
                        <motion.div
                            key="start"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.2 }}
                            className="flex flex-col items-center text-center"
                        >
                            <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-primary/20 to-tertiary/20 flex items-center justify-center mb-5 shadow-xl">
                                <HelpCircle className="w-10 h-10 text-primary" />
                            </div>
                            <h3 className="text-2xl font-black bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent mb-2 uppercase italic tracking-tight">BuddyLogic</h3>
                            <p className="text-xs font-bold text-on-surface-variant/50 mb-7 max-w-[200px] leading-relaxed">
                                {t('game.logic.instruction')}
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
                    ) : gameState === 'gameover' ? (
                        <motion.div
                            key="gameover"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center text-center p-6"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-error/15 flex items-center justify-center mb-3">
                                <Brain className="w-7 h-7 text-error" />
                            </div>
                            <h3 className="text-2xl font-black text-error mb-1 uppercase italic tracking-tight">{t('game.logic.fail')}</h3>
                            <div className="flex flex-col mb-5">
                                <span className="text-[8px] text-on-surface-variant/50 font-black uppercase tracking-[0.2em] mb-1">{t('game.solve.final_score')}</span>
                                <span className="text-4xl font-black bg-gradient-to-b from-on-surface to-on-surface/50 bg-clip-text text-transparent">{score}</span>
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={startGame}
                                className="w-full py-3.5 bg-gradient-to-r from-primary to-tertiary text-on-primary rounded-xl font-black uppercase tracking-wider text-[10px] shadow-lg"
                            >
                                {t('game.logic.recalibrate')}
                            </motion.button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="playing"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="w-full h-full flex flex-col justify-center gap-10 py-2"
                        >
                            <div className="flex flex-col items-center gap-5">
                                <span className="text-[9px] font-black text-primary/40 uppercase tracking-[0.3em] font-mono">
                                    {t('game.logic.sequence_type', { type: sequence?.type })}
                                </span>

                                <div className="flex items-center justify-center gap-1.5 lg:gap-2.5 w-full">
                                    {sequence?.items.map((item, i) => (
                                        <div key={i} className="flex items-center gap-1 lg:gap-2">
                                            <motion.div
                                                initial={{ scale: 0, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                transition={{ delay: i * 0.1 }}
                                                className="w-10 h-10 lg:w-13 lg:h-13 bg-surface-container-high/50 backdrop-blur-xl border border-outline/10 rounded-xl flex items-center justify-center text-sm lg:text-base font-black text-on-surface shadow-lg"
                                            >
                                                {item}
                                            </motion.div>
                                            {i < 3 && <span className="text-on-surface-variant/15 font-black text-xs">→</span>}
                                        </div>
                                    ))}
                                    <span className="text-on-surface-variant/15 font-black text-xs">→</span>
                                    <motion.div
                                        animate={{ borderColor: ['rgba(var(--primary-rgb),0.2)', 'rgba(var(--primary-rgb),0.5)', 'rgba(var(--primary-rgb),0.2)'] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="w-10 h-10 lg:w-13 lg:h-13 bg-primary/8 border-2 border-dashed border-primary/30 rounded-xl flex items-center justify-center text-sm lg:text-base font-black text-primary shadow-xl shadow-primary/10"
                                    >
                                        ?
                                    </motion.div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5 w-full pb-2">
                                {sequence?.options.map((opt, i) => {
                                    const isCorrect = opt === sequence.answer;
                                    const isSelected = opt === selectedAnswer;

                                    let buttonStyle = 'bg-surface-container-high/50 border-outline/10 text-on-surface hover:bg-surface-container-highest/80 backdrop-blur-xl shadow-lg';
                                    if (feedback) {
                                        if (isCorrect) {
                                            buttonStyle = 'bg-green-500/20 border-green-500/40 text-green-400 shadow-[0_0_25px_rgba(34,197,94,0.15)]';
                                        } else if (isSelected && !isCorrect) {
                                            buttonStyle = 'bg-error/20 border-error/40 text-error shadow-[0_0_25px_rgba(239,68,68,0.15)]';
                                        } else {
                                            buttonStyle = 'bg-surface-container-high/20 border-outline/5 text-on-surface/15 opacity-30';
                                        }
                                    }

                                    return (
                                        <motion.button
                                            key={`${sequence.type}-${i}`}
                                            whileHover={!feedback ? { scale: 1.03, y: -2 } : {}}
                                            whileTap={!feedback ? { scale: 0.97 } : {}}
                                            onClick={() => handleAnswer(opt)}
                                            disabled={!!feedback}
                                            className={`
                                                h-14 lg:h-16 rounded-xl flex items-center justify-center text-lg lg:text-xl font-black transition-all duration-300 border
                                                ${buttonStyle}
                                            `}
                                        >
                                            {opt}
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {gameState === 'playing' && (
                <div className="text-[9px] font-medium text-on-surface-variant/30 italic flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-primary/40" />
                    {t('game.logic.hint')}
                </div>
            )}
        </div>
    );
};
