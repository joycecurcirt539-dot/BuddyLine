import React from 'react';
import { clsx } from 'clsx';
import { useDesignSystem } from '../../hooks/useDesignSystem';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
        const design = useDesignSystem();
        const isMaterial = design.system === 'material';

        const variants = {
            primary: 'bg-primary text-on-primary hover:bg-primary/90 shadow-sm',
            secondary: 'bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80',
            danger: 'bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 hover:bg-red-100',
            ghost: 'hover:bg-surface-variant/20 text-on-surface-variant',
        };

        const sizes = {
            sm: 'px-3 h-8 text-xs',
            md: 'px-6 h-10 text-sm',
            lg: 'px-8 h-12 text-base',
        };

        return (
            <button
                ref={ref}
                className={clsx(
                    'font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center rounded-full',
                    variants[variant],
                    sizes[size],
                    className
                )}
                disabled={disabled || loading}
                {...props}
            >
                {loading ? 'Loading...' : children}
            </button>
        );
    }
);

Button.displayName = 'Button';
