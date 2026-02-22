import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';

interface FABProps {
    onClick: () => void;
}

export const FAB = ({ onClick }: FABProps) => {

    return (
        <motion.button
            onClick={onClick}
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed bottom-28 right-6 w-16 h-16 liquid-glass text-primary flex items-center justify-center rounded-[1.5rem] shadow-2xl border-white/20 hover:border-primary/40 lg:hidden z-40 transition-colors"
            aria-label="Create new post"
        >
            <Plus size={32} />
        </motion.button>
    );
};
