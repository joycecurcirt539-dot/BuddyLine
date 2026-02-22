import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, RotateCcw, Trophy, Zap } from 'lucide-react';
import { playSound } from '../../../utils/sounds';
import { usePerformanceMode } from '../../../hooks/usePerformanceMode';

interface Node {
    r: number;
    c: number;
    color: string;
    id: string;
}

interface Path {
    color: string;
    cells: { r: number, c: number }[];
}

const GRID_SIZE = 7;

const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
const LINE_COUNT = 5;

const generateSolvableLevel = () => {
    let attempts = 0;
    while (attempts < 50) {
        attempts++;
        const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
        const generatedNodes: { r: number, c: number, color: string }[] = [];

        let success = true;
        for (let i = 0; i < LINE_COUNT; i++) {
            const color = COLORS[i];

            const emptyCells = [];
            for (let r = 0; r < GRID_SIZE; r++) {
                for (let c = 0; c < GRID_SIZE; c++) {
                    if (grid[r][c] === null) emptyCells.push({ r, c });
                }
            }

            if (emptyCells.length === 0) { success = false; break; }

            let current = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            const path = [current];
            grid[current.r][current.c] = color;

            const length = Math.floor(Math.random() * 8) + 3;
            for (let s = 0; s < length; s++) {
                const neighbors = [
                    { r: current.r - 1, c: current.c },
                    { r: current.r + 1, c: current.c },
                    { r: current.r, c: current.c - 1 },
                    { r: current.r, c: current.c + 1 },
                ].filter(n =>
                    n.r >= 0 && n.r < GRID_SIZE &&
                    n.c >= 0 && n.c < GRID_SIZE &&
                    grid[n.r][n.c] === null
                );

                if (neighbors.length === 0) break;

                current = neighbors[Math.floor(Math.random() * neighbors.length)];
                path.push(current);
                grid[current.r][current.c] = color;
            }

            if (path.length < 2) { success = false; break; }

            generatedNodes.push({ r: path[0].r, c: path[0].c, color });
            generatedNodes.push({ r: path[path.length - 1].r, c: path[path.length - 1].c, color });
        }

        if (success && generatedNodes.length === LINE_COUNT * 2) {
            return generatedNodes;
        }
    }
    return [
        { r: 0, c: 0, color: '#ef4444' }, { r: 6, c: 0, color: '#ef4444' },
        { r: 0, c: 1, color: '#3b82f6' }, { r: 6, c: 1, color: '#3b82f6' },
        { r: 0, c: 2, color: '#10b981' }, { r: 6, c: 2, color: '#10b981' },
        { r: 0, c: 3, color: '#f59e0b' }, { r: 6, c: 3, color: '#f59e0b' },
        { r: 0, c: 4, color: '#8b5cf6' }, { r: 6, c: 4, color: '#8b5cf6' },
    ];
};

export const BuddyFlow: React.FC = () => {
    const { t } = useTranslation();
    const [nodes, setNodes] = useState<Node[]>([]);
    const [paths, setPaths] = useState<Path[]>([]);
    const [currentPath, setCurrentPath] = useState<Path | null>(null);
    const [score, setScore] = useState(0);
    const [bestScore, setBestScore] = useState(() => {
        const saved = localStorage.getItem('buddyline_highscore_flow');
        return saved ? parseInt(saved) : 0;
    });
    const [isWon, setIsWon] = useState(false);
    const gridRef = useRef<HTMLDivElement>(null);
    const { reduceEffects } = usePerformanceMode();

    const initLevel = useCallback(() => {
        const generated = generateSolvableLevel();
        const newNodes: Node[] = generated.map((n, i) => ({
            ...n,
            id: `${n.color}-${i % 2 === 0 ? 'A' : 'B'}`
        }));
        setNodes(newNodes);
        setPaths([]);
        setCurrentPath(null);
        setIsWon(false);
    }, []);

    useEffect(() => {
        if (nodes.length === 0) {
            const timer = setTimeout(() => initLevel(), 0);
            return () => clearTimeout(timer);
        }
    }, [initLevel, nodes.length]);

    const getCellFromEvent = (e: React.MouseEvent | React.TouchEvent) => {
        if (!gridRef.current) return null;
        const rect = gridRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        const c = Math.floor((x / rect.width) * GRID_SIZE);
        const r = Math.floor((y / rect.height) * GRID_SIZE);

        if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) return { r, c };
        return null;
    };

    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
        const cell = getCellFromEvent(e);
        if (!cell) return;

        const node = nodes.find(n => n.r === cell.r && n.c === cell.c);
        if (!node) return;

        setPaths(prev => prev.filter(p => p.color !== node.color));
        setCurrentPath({ color: node.color, cells: [cell] });
    };

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!currentPath) return;
        const cell = getCellFromEvent(e);
        if (!cell) return;

        const last = currentPath.cells[currentPath.cells.length - 1];
        if (last.r === cell.r && last.c === cell.c) return;

        const dr = Math.abs(cell.r - last.r);
        const dc = Math.abs(cell.c - last.c);
        if (dr + dc !== 1) return;

        const otherNode = nodes.find(n => n.r === cell.r && n.c === cell.c);
        if (otherNode && otherNode.color !== currentPath.color) return;

        const isOccupiedByOthers = paths.some(p => p.cells.some(c => c.r === cell.r && c.c === cell.c));
        if (isOccupiedByOthers) return;

        if (currentPath.cells.some(c => c.r === cell.r && c.c === cell.c)) {
            const idx = currentPath.cells.findIndex(c => c.r === cell.r && c.c === cell.c);
            setCurrentPath({ ...currentPath, cells: currentPath.cells.slice(0, idx + 1) });
            return;
        }

        const newCells = [...currentPath.cells, cell];
        setCurrentPath({ ...currentPath, cells: newCells });
        if (!reduceEffects) {
            playSound('flow_step', 0.3);
        }

        if (otherNode && otherNode.color === currentPath.color && newCells.length > 1) {
            const completedPath = { ...currentPath, cells: newCells };
            const newPaths = [...paths, completedPath];
            setPaths(newPaths);
            setCurrentPath(null);
            checkWin(newPaths);
        }
    };

    const handleEnd = () => {
        setCurrentPath(null);
    };

    const checkWin = (allPaths: Path[]) => {
        const uniqueColors = new Set(nodes.map(n => n.color));
        const completePaths = allPaths.filter(path => {
            const first = path.cells[0];
            const last = path.cells[path.cells.length - 1];
            const hasStart = nodes.some(n => n.r === first.r && n.c === first.c && n.color === path.color);
            const hasEnd = nodes.some(n => n.r === last.r && n.c === last.c && n.color === path.color);
            return hasStart && hasEnd && path.cells.length > 1;
        });

        if (completePaths.length === uniqueColors.size) {
            if (!reduceEffects) {
                playSound('merge', 0.6);
            }
            setIsWon(true);
            setScore(prev => prev + 1);
            if (score + 1 > bestScore) {
                setBestScore(score + 1);
                localStorage.setItem('buddyline_highscore_flow', (score + 1).toString());
            }
        }
    };

    // Build a set of all cells covered by completed paths + current drawing
    const allPathCells = new Set<string>();
    paths.forEach(p => p.cells.forEach(c => allPathCells.add(`${c.r}-${c.c}`)));
    if (currentPath) currentPath.cells.forEach(c => allPathCells.add(`${c.r}-${c.c}`));

    // Get the color for a cell if it's on a path
    const getCellColor = (r: number, c: number): string | null => {
        if (currentPath) {
            if (currentPath.cells.some(cell => cell.r === r && cell.c === c)) return currentPath.color;
        }
        for (const p of paths) {
            if (p.cells.some(cell => cell.r === r && cell.c === c)) return p.color;
        }
        return null;
    };

    return (
        <div className="flex flex-col items-center gap-8 lg:gap-12 w-full max-w-md mx-auto p-4 select-none accelerate">
            {/* Stats Bar - Premium Glass */}
            <div className="flex justify-between items-center w-full px-2">
                <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="flex items-center gap-3 bg-surface-container-high/40 backdrop-blur-3xl px-5 py-3 rounded-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] accelerate"
                >
                    <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center shadow-lg shadow-primary/20">
                        <Zap className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] text-primary/70 font-black uppercase tracking-[0.25em] leading-none mb-1">{t('game.flow.solved')}</span>
                        <motion.span
                            key={score}
                            className="text-2xl font-black text-on-surface tabular-nums leading-none tracking-tight"
                        >
                            {score}
                        </motion.span>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="flex items-center gap-3 bg-surface-container-high/40 backdrop-blur-3xl px-5 py-3 rounded-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] accelerate"
                >
                    <div className="w-9 h-9 rounded-xl bg-tertiary/20 flex items-center justify-center shadow-lg shadow-tertiary/20">
                        <Trophy className="w-5 h-5 text-tertiary" />
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] text-tertiary/70 font-black uppercase tracking-[0.25em] leading-none mb-1">{t('game.best')}</span>
                        <span className="text-xl font-black text-on-surface/60 tabular-nums leading-none mt-0.5">{bestScore}</span>
                    </div>
                </motion.div>
            </div>

            {/* Grid Area — Liquid Glass Container */}
            <div
                ref={gridRef}
                onMouseDown={handleStart}
                onMouseMove={handleMove}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                onTouchStart={handleStart}
                onTouchMove={handleMove}
                onTouchEnd={handleEnd}
                className={`touch-none relative aspect-square w-full bg-gradient-to-br from-surface-container-low/40 to-transparent rounded-[3rem] lg:rounded-[4rem] border border-white/10 ${reduceEffects ? '' : 'backdrop-blur-xl'} grid grid-cols-7 grid-rows-7 gap-1 p-3 cursor-crosshair overflow-hidden shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)] accelerate`}
            >
                {/* Background depth items */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute -top-10 -left-10 w-48 h-48 bg-primary/30 blur-[60px] rounded-full animate-pulse" />
                    <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-tertiary/30 blur-[60px] rounded-full" />
                </div>

                {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
                    const r = Math.floor(i / GRID_SIZE);
                    const c = i % GRID_SIZE;
                    const node = nodes.find(n => n.r === r && n.c === c);
                    const pathColor = getCellColor(r, c);

                    return (
                        <div
                            key={i}
                            className="rounded-xl relative flex items-center justify-center overflow-hidden transition-colors duration-500"
                            style={{
                                backgroundColor: pathColor ? `${pathColor}20` : 'rgba(255,255,255,0.02)',
                            }}
                        >
                            {/* Path Fill block with glow */}
                            {pathColor && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="absolute inset-[1px] rounded-[10px]"
                                    style={{
                                        background: `linear-gradient(135deg, ${pathColor}40, ${pathColor}10)`,
                                        boxShadow: `inset 0 0 15px ${pathColor}30`
                                    }}
                                />
                            )}

                            {/* Node Sphere — Liquid Glass Effect */}
                            {node && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="w-6 h-6 lg:w-8 lg:h-8 rounded-full z-10 border border-white/50 shadow-2xl relative"
                                    style={{
                                        backgroundColor: node.color,
                                        boxShadow: `0 0 25px ${node.color}80, inset 0 -4px 8px rgba(0,0,0,0.3), inset 0 4px 8px rgba(255,255,255,0.4)`
                                    }}
                                >
                                    {/* Glass Highlight and Logo */}
                                    <div className="absolute top-1 left-1.5 w-1/3 h-1/3 bg-white/40 rounded-full blur-[1px]" />
                                    <img src="/logo.png" className="absolute inset-0 m-auto w-[60%] h-[60%] object-contain opacity-40 brightness-200 grayscale" alt="" />
                                </motion.div>
                            )}
                        </div>
                    );
                })}

                {/* Win Overlay - Premium Glass */}
                <AnimatePresence>
                    {isWon && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-2xl rounded-[3rem] p-6"
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                className="bg-surface-container-high/90 border border-white/15 rounded-[2.5rem] p-6 shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center aspect-square text-center relative overflow-hidden w-full max-w-[220px]"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-tertiary/20 pointer-events-none" />

                                <div className="w-12 h-12 rounded-[1.5rem] bg-gradient-to-br from-primary to-tertiary flex items-center justify-center mb-4 shadow-2xl shadow-primary/40">
                                    <Share2 className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-xl font-black bg-gradient-to-r from-primary via-white to-tertiary bg-clip-text text-transparent mb-6 uppercase italic tracking-tighter">{t('game.flow.win_title')}</h3>

                                <motion.button
                                    whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(99,102,241,0.4)' }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={initLevel}
                                    className="w-full py-4 bg-gradient-to-r from-primary to-tertiary text-white rounded-2xl font-black uppercase tracking-[0.1em] text-xs shadow-xl shadow-primary/30 relative z-10"
                                >
                                    {t('game.flow.next')}
                                </motion.button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-col items-center gap-6 w-full">
                <motion.button
                    whileHover={{ scale: 1.05, backgroundColor: 'rgba(99,102,241,0.1)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={initLevel}
                    className="flex items-center gap-3 px-10 py-4 bg-surface-container-high/40 hover:text-primary text-on-surface-variant/80 border border-white/10 rounded-full font-black uppercase tracking-[0.2em] text-xs transition-all duration-300 shadow-xl backdrop-blur-3xl px-8"
                >
                    <RotateCcw className="w-4 h-4" />
                    {t('game.flow.reset')}
                </motion.button>
            </div>
        </div>
    );
};
