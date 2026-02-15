import { Plus } from 'lucide-react';

interface FABProps {
    onClick: () => void;
}

export const FAB = ({ onClick }: FABProps) => {

    return (
        <button
            onClick={onClick}
            className="fixed bottom-24 right-8 w-16 h-16 bg-primary-container text-on-primary-container flex items-center justify-center rounded-2xl shadow-lg hover:shadow-xl transition-all lg:hidden z-40"
            aria-label="Create new post"
        >
            <Plus size={28} />
        </button>
    );
};
