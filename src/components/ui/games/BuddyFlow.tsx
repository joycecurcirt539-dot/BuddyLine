import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, RotateCcw, Trophy, Zap, MousePointer2 } from 'lucide-react';
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
    const { reduceMotion, reduceEffects } = usePerformanceMode();

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
        <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto p-4 select-none">
            {/* Stats */}
            <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-2.5 bg-surface-container-high/50 backdrop-blur-2xl px-3.5 py-2 rounded-2xl border border-outline/10 shadow-lg">
                    <div className="w-6 h-6 rounded-lg bg-primary/15 flex items-center justify-center">
                        <Zap className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[7px] text-on-surface-variant/50 font-black uppercase tracking-[0.2em] leading-none">{t('game.flow.solved')}</span>
                        <span className="text-xl font-black text-on-surface tabular-nums leading-none mt-0.5">{score}</span>
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

            {/* Grid Area */}
            <div
                ref={gridRef}
                onMouseDown={handleStart}
                onMouseMove={handleMove}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                onTouchStart={handleStart}
                onTouchMove={handleMove}
                onTouchEnd={handleEnd}
                className="relative aspect-square w-full bg-surface-container-low/30 rounded-[1.8rem] border border-outline/8 backdrop-blur-xl grid grid-cols-7 grid-rows-7 gap-[2px] p-1 cursor-crosshair touch-none overflow-hidden shadow-2xl"
            >
                {/* Cells rendered directly — no SVG, no animation delays */}
                {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
                    const r = Math.floor(i / GRID_SIZE);
                    const c = i % GRID_SIZE;
                    const node = nodes.find(n => n.r === r && n.c === c);
                    const pathColor = getCellColor(r, c);

                    return (
                        <div
                            key={i}
                            className="rounded-[4px] relative flex items-center justify-center"
                            style={{
                                backgroundColor: pathColor
                                    ? `${pathColor}30`
                                    : 'rgba(var(--surface-container-high-rgb, 128,128,128), 0.04)',
                                borderTop: pathColor ? undefined : '1px solid rgba(var(--outline-rgb, 128,128,128), 0.04)',
                                borderLeft: pathColor ? undefined : '1px solid rgba(var(--outline-rgb, 128,128,128), 0.04)',
                            }}
                        >
                            {/* Path fill block */}
                            {pathColor && (
                                <div
                                    className="absolute inset-0 rounded-[4px]"
                                    style={{
                                        background: `${pathColor}25`,
                                        boxShadow: `inset 0 0 8px ${pathColor}20`
                                    }}
                                />
                            )}

                            {/* Node dot */}
                            {node && (
                                <div
                                    className="w-5 h-5 lg:w-6 lg:h-6 rounded-full z-10 border-2 border-white/30"
                                    style={{
                                        backgroundColor: node.color,
                                        boxShadow: `0 0 10px ${node.color}50, 0 2px 6px ${node.color}30`
                                    }}
                                />
                            )}
                        </div>
                    );
                })}

                {/* Win Overlay */}
                <AnimatePresence>
                    {isWon && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-0 z-20 flex items-center justify-center bg-black/35 backdrop-blur-md rounded-[1.8rem] p-4"
                        >
                            <div className="bg-surface-container-high/95 border border-outline/15 rounded-[2rem] p-7 shadow-2xl flex flex-col items-center text-center">
                                <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mb-3">
                                    <Share2 className="w-7 h-7 text-primary" />
                                </div>
                                <h3 className="text-xl font-black bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent mb-1 uppercase italic tracking-tight">{t('game.flow.win_title')}</h3>
                                <p className="text-sm font-bold text-on-surface-variant mb-5">{t('game.flow.win_subtitle')}</p>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={initLevel}
                                    className="w-full px-12 py-3 bg-gradient-to-r from-primary to-tertiary text-on-primary rounded-xl font-black uppercase tracking-wider text-[10px] shadow-lg"
                                >
                                    {t('game.flow.next')}
                                </motion.button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={initLevel}
                className="flex items-center gap-2 px-6 py-2.5 bg-surface-container-high/50 hover:bg-primary hover:text-on-primary text-on-surface-variant border border-outline/10 rounded-full font-black uppercase tracking-wider text-[9px] transition-all duration-300 shadow-lg backdrop-blur-xl"
            >
                <RotateCcw className="w-3.5 h-3.5" />
                {t('game.flow.reset')}
            </motion.button>

            <div className="flex items-center gap-2 text-[9px] font-black text-on-surface-variant/30 uppercase tracking-[0.15em]">
                <MousePointer2 className="w-3 h-3" /> {t('game.flow.hint')}
            </div>
        </div>
    );
};
