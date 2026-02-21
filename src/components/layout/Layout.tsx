import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { MiniGame } from '../ui/MiniGame';
import { CallOverlay } from './CallOverlay';
import { IncomingCallModal } from './IncomingCallModal';

export const Layout = () => {
    const location = useLocation();
    const [isGameOpen, setIsGameOpen] = useState(false);

    const isChatOpen = location.pathname.startsWith('/chat') && new URLSearchParams(location.search).get('id');
    const isComposerOpen = new URLSearchParams(location.search).get('composer') === 'true';

    return (
        <div className="flex h-full w-full overflow-hidden bg-surface text-on-surface transition-colors duration-300">
            <Sidebar onLogoClick={() => setIsGameOpen(true)} />

            <CallOverlay />
            <IncomingCallModal />

            <MiniGame isOpen={isGameOpen} onClose={() => setIsGameOpen(false)} />

            <main className={clsx(
                "flex-1 lg:pl-72 h-full overflow-hidden flex flex-col",
                (isChatOpen || isComposerOpen) ? "pb-0" : "pb-16 lg:pb-0"
            )}>
                <div className={clsx(
                    "w-full h-full overflow-y-auto overflow-x-hidden",
                    isChatOpen ? "px-0 py-0" : "px-4 lg:px-8 py-4 lg:py-8"
                )}>
                    <div className="h-full flex flex-col">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={location.pathname}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{
                                    duration: 0.15,
                                    ease: "linear"
                                }}
                                className="flex-1 flex flex-col min-h-0 accelerate"
                            >
                                <Outlet context={{ onLogoClick: () => setIsGameOpen(true) }} />
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </main>

            <BottomNav />
        </div>
    );
};