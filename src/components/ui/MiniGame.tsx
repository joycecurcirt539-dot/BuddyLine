import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { X, Gamepad2, MousePointer2, Swords, ArrowUpCircle, Grid3X3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BuddyTap } from './games/BuddyTap';
import { BuddyMatch } from './games/BuddyMatch';
import { BuddyMerge } from './games/BuddyMerge';
import { BuddyJump } from './games/BuddyJump';
import { BuddySnake } from './games/BuddySnake';
import { BuddySolve } from './games/BuddySolve';
import { BuddyMines } from './games/BuddyMines';
import { BuddyLogic } from './games/BuddyLogic';
import { BuddyFlow } from './games/BuddyFlow';
import type { WallMode } from './games/BuddySnake';
import { Share2, Brain, Flag, Calculator } from 'lucide-react';
import { usePerformanceMode } from '../../hooks/usePerformanceMode';

interface GameHubProps {
    isOpen: boolean;
    onClose: () => void;
}

type GameId = 'tap' | 'match' | 'jump' | 'merge' | 'snake' | 'solve' | 'mines' | 'logic' | 'flow' | null;

interface GameConfig {
    id: GameId;
    titleKey: string;
    descKey: string;
    icon: React.ElementType;
    color: string;
    component: React.FC;
}

export const MiniGame: React.FC<GameHubProps> = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const [activeGame, setActiveGame] = useState<GameId>(null);
    const [snakeMode, setSnakeMode] = useState<WallMode>('solid');
    const { reduceMotion, reduceEffects } = usePerformanceMode();

    const games: GameConfig[] = [
        { id: 'tap', titleKey: 'game.tap.title', descKey: 'game.tap.desc', icon: MousePointer2, color: 'from-blue-500 to-indigo-600', component: BuddyTap },
        { id: 'match', titleKey: 'game.match.title', descKey: 'game.match.desc', icon: Grid3X3, color: 'from-purple-500 to-pink-600', component: BuddyMatch },
        { id: 'jump', titleKey: 'game.jump.title', descKey: 'game.jump.desc', icon: ArrowUpCircle, color: 'from-green-500 to-emerald-600', component: BuddyJump },
        { id: 'merge', titleKey: 'game.merge.title', descKey: 'game.merge.desc', icon: Grid3X3, color: 'from-orange-500 to-red-600', component: BuddyMerge },
        { id: 'snake', titleKey: 'game.snake.title', descKey: 'game.snake.desc', icon: Swords, color: 'from-yellow-500 to-orange-600', component: BuddySnake },
        { id: 'solve', titleKey: 'game.solve.title', descKey: 'game.solve.desc', icon: Calculator, color: 'from-cyan-500 to-blue-600', component: BuddySolve },
        { id: 'mines', titleKey: 'game.mines.title', descKey: 'game.mines.desc', icon: Flag, color: 'from-red-500 to-rose-600', component: BuddyMines },
        { id: 'logic', titleKey: 'game.logic.title', descKey: 'game.logic.desc', icon: Brain, color: 'from-indigo-500 to-purple-600', component: BuddyLogic },
        { id: 'flow', titleKey: 'game.flow.title', descKey: 'game.flow.desc', icon: Share2, color: 'from-teal-500 to-emerald-600', component: BuddyFlow },
    ];

    if (!isOpen) return null;

    const ActiveGameComponent = activeGame ? games.find(g => g.id === activeGame)?.component : null;
    const activeGameConfig = activeGame ? games.find(g => g.id === activeGame) : null;

    return (
        <AnimatePresence initial={!reduceMotion}>
            <motion.div
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.18 }}
                className={clsx(
                    'fixed inset-0 z-[100] flex flex-col overflow-hidden select-none accelerate',
                    reduceEffects ? 'bg-surface/98' : 'bg-surface/95 backdrop-blur-3xl'
                )}
            >
                {/* Background Decor */}
                {!reduceEffects && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40">
                        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[150px] rounded-full" />
                        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/20 blur-[150px] rounded-full" />
                    </div>
                )}

                {/* ─── HEADER ─── */}
                <div className="relative z-10 flex-shrink-0 flex items-center justify-between px-4 lg:px-8 pt-4 lg:pt-6 pb-3 lg:pb-4">
                    {/* Left: Back / Title */}
                    <div className="flex items-center gap-3 min-w-0">
                        {activeGame && (
                            <motion.button
                                initial={reduceMotion ? false : { x: -10, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                onClick={() => setActiveGame(null)}
                                className="flex-shrink-0 px-3 py-2 bg-surface-container-high/60 border border-outline/10 rounded-xl backdrop-blur-xl text-xs font-black text-on-surface hover:bg-surface-container-highest transition-all flex items-center gap-1.5"
                            >
                                <Gamepad2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{t('common.back')}</span>
                            </motion.button>
                        )}
                        <div className="min-w-0">
                            <h2 className="text-lg lg:text-2xl font-black text-primary italic uppercase tracking-tighter leading-none truncate">
                                {activeGame ? t(activeGameConfig?.titleKey || '') : 'BuddyLabs'}
                            </h2>
                            <p className="text-on-surface-variant/40 text-[9px] lg:text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5 mt-0.5">
                                <Swords className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{t('game.terminal_active')}</span>
                            </p>
                        </div>
                    </div>

                    {/* Right: Close */}
                    <motion.button
                        whileHover={reduceMotion ? undefined : { scale: 1.05, rotate: 90 }}
                        whileTap={reduceMotion ? undefined : { scale: 0.95 }}
                        onClick={onClose}
                        className="flex-shrink-0 p-2.5 lg:p-3 bg-error/10 text-error rounded-xl lg:rounded-2xl border border-error/20 backdrop-blur-xl hover:bg-error hover:text-white transition-all duration-300 ml-3"
                    >
                        <X className="w-5 h-5 lg:w-6 lg:h-6" />
                    </motion.button>
                </div>

                {/* ─── CONTENT ─── */}
                <div className="relative z-10 flex-1 min-h-0 overflow-hidden">
                    <AnimatePresence mode="wait" initial={!reduceMotion}>
                        {!activeGame ? (
                            /* ═══ GAME LIST ═══ */
                            <motion.div
                                key="menu"
                                initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={reduceMotion ? undefined : { opacity: 0, y: -20 }}
                                className="h-full overflow-y-auto overscroll-contain px-3 lg:px-8 pb-8"
                            >
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-5 max-w-6xl mx-auto pt-2 lg:pt-4">
                                    {games.map((game, idx) => (
                                        <motion.button
                                            key={game.id}
                                            initial={reduceMotion ? false : { opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={reduceMotion
                                                ? { duration: 0.15 }
                                                : { delay: Math.min(idx * 0.04, 0.2), duration: 0.25 }
                                            }
                                            whileHover={reduceMotion ? undefined : { scale: 1.02, y: -2 }}
                                            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                                            onClick={() => setActiveGame(game.id)}
                                            className="group relative flex items-center gap-3.5 p-3.5 lg:p-5 rounded-2xl lg:rounded-[1.8rem] bg-surface-container-high/30 border border-outline/5 backdrop-blur-xl hover:bg-surface-container-highest/40 hover:border-primary/15 transition-all text-left overflow-hidden"
                                        >
                                            {/* Glow */}
                                            <div
                                                className={`absolute top-0 right-0 bg-gradient-to-br ${game.color} opacity-0 group-hover:opacity-20 transition-opacity`}
                                                style={{
                                                    width: reduceEffects ? '4.5rem' : '6rem',
                                                    height: reduceEffects ? '4.5rem' : '6rem',
                                                    filter: reduceEffects ? 'blur(28px)' : 'blur(50px)',
                                                    transitionDuration: reduceMotion ? '250ms' : '500ms',
                                                }}
                                            />

                                            {/* Icon */}
                                            <div className={`relative flex-shrink-0 w-11 h-11 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl bg-gradient-to-br ${game.color} flex items-center justify-center shadow-lg ${reduceMotion ? '' : 'group-hover:scale-105'} transition-transform duration-300`}>
                                                <game.icon className="w-5 h-5 lg:w-7 lg:h-7 text-white" />
                                            </div>

                                            {/* Text */}
                                            <div className="relative min-w-0 flex-1">
                                                <h3 className="text-sm lg:text-base font-black text-on-surface uppercase italic tracking-tight group-hover:text-primary transition-colors truncate">
                                                    {t(game.titleKey)}
                                                </h3>
                                                <p className="text-[10px] lg:text-xs font-medium text-on-surface-variant/50 leading-snug mt-0.5 line-clamp-2">
                                                    {t(game.descKey)}
                                                </p>
                                            </div>

                                            {/* Arrow */}
                                            <div className="relative flex-shrink-0 text-primary/30 group-hover:text-primary/80 transition-colors">
                                                <span className="text-lg font-black">›</span>
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>
                            </motion.div>
                        ) : (
                            /* ═══ ACTIVE GAME ═══ */
                            <motion.div
                                key="game-content"
                                initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={reduceMotion ? undefined : { opacity: 0, scale: 1.03 }}
                                className="h-full overflow-y-auto overscroll-contain flex flex-col lg:flex-row items-start lg:items-center justify-center gap-3 lg:gap-10 px-3 lg:px-8 pb-8"
                            >
                                {/* Info Panel (compact on mobile) */}
                                <div className="flex-shrink-0 w-full lg:w-72 flex flex-col gap-2 lg:gap-3">
                                    {/* Snake mode toggle */}
                                    {activeGame === 'snake' && (
                                        <div className="p-0.5 bg-surface-container-high/40 rounded-xl border border-outline/5 backdrop-blur-xl flex gap-1">
                                            {(['solid', 'portal'] as WallMode[]).map(mode => (
                                                <button
                                                    key={mode}
                                                    onClick={() => setSnakeMode(mode)}
                                                    className={`flex-1 py-1.5 lg:py-2 px-3 rounded-lg text-[9px] lg:text-[10px] font-black uppercase tracking-widest transition-all ${snakeMode === mode
                                                        ? 'bg-primary text-on-primary shadow-lg'
                                                        : 'text-on-surface-variant/50 hover:text-on-surface-variant hover:bg-white/5'
                                                        }`}
                                                >
                                                    {t(`game.snake.mode_${mode}`)}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Game description card */}
                                    <div className="p-3 lg:p-5 rounded-xl lg:rounded-2xl bg-surface-container-high/20 backdrop-blur-xl border border-outline/10">
                                        <div className="flex items-center gap-2 lg:gap-3 mb-1 lg:mb-3">
                                            <div className={`w-7 h-7 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl bg-gradient-to-br ${activeGameConfig?.color} flex items-center justify-center shadow-lg`}>
                                                {React.createElement(activeGameConfig?.icon || Gamepad2, { className: "w-3.5 h-3.5 lg:w-5 lg:h-5 text-white" })}
                                            </div>
                                            <h4 className="text-xs lg:text-base font-black text-on-surface uppercase italic">
                                                {t(activeGameConfig?.titleKey || '')}
                                            </h4>
                                        </div>
                                        <p className="text-[10px] lg:text-sm font-medium text-on-surface-variant/60 leading-snug">
                                            {t(activeGameConfig?.descKey || '')}
                                        </p>
                                    </div>
                                </div>

                                {/* Game Area */}
                                <div className="flex-1 w-full max-w-4xl flex items-center justify-center">
                                    {activeGame === 'snake' ? (
                                        <BuddySnake wallMode={snakeMode} />
                                    ) : (
                                        ActiveGameComponent && <ActiveGameComponent />
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
