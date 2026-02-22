import React from 'react';
import { clsx } from 'clsx';
import { motion, type HTMLMotionProps } from 'framer-motion';

interface ButtonProps extends HTMLMotionProps<'button'> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'glass';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {

        const variants = {
            primary: 'bg-primary text-on-primary shadow-xl shadow-primary/20 border border-white/10',
            secondary: 'bg-white/60 dark:bg-white/5 backdrop-blur-xl text-on-surface border border-white/20 hover:bg-white/80 dark:hover:bg-white/10 shadow-lg',
            danger: 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white shadow-lg shadow-red-500/10',
            ghost: 'hover:bg-primary/10 text-on-surface-variant hover:text-primary',
            glass: 'liquid-glass border-white/30 text-on-surface hover:border-primary/40 shadow-2xl',
        };

        const sizes = {
            sm: 'px-4 h-9 text-[10px] font-black uppercase tracking-widest rounded-xl',
            md: 'px-7 h-12 text-xs font-black uppercase tracking-widest rounded-2xl',
            lg: 'px-10 h-14 text-sm font-black uppercase tracking-widest rounded-3xl',
        };

        return (
            <motion.button
                ref={ref}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={clsx(
                    'transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 select-none relative overflow-hidden',
                    variants[variant],
                    sizes[size],
                    className
                )}
                disabled={disabled || loading}
                {...props}
            >
                {loading ? (
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        <span>{children as React.ReactNode}</span>
                    </div>
                ) : (children as React.ReactNode)}
            </motion.button>
        );
    }
);

Button.displayName = 'Button';
