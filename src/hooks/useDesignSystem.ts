import { useDeviceDetection } from './useDeviceDetection';

export type DesignSystem = 'material' | 'twitter';

export interface DesignTokens {
    system: DesignSystem;
    borderRadius: {
        sm: string;
        md: string;
        lg: string;
        full: string;
    };
    shadow: {
        sm: string;
        md: string;
        lg: string;
    };
    spacing: {
        compact: boolean;
    };
}

export const useDesignSystem = (): DesignTokens => {
    const { isMobile, isTablet, os } = useDeviceDetection();

    // Mobile & tablet devices get Material Design 3
    // Desktop devices get Twitter/X style
    const useMaterial = isMobile || isTablet || os === 'ios' || os === 'android';

    if (useMaterial) {
        return {
            system: 'material',
            borderRadius: {
                sm: 'rounded-xl',
                md: 'rounded-2xl',
                lg: 'rounded-3xl',
                full: 'rounded-full',
            },
            shadow: {
                sm: 'shadow-md',
                md: 'shadow-lg',
                lg: 'shadow-xl',
            },
            spacing: {
                compact: false,
            },
        };
    } else {
        return {
            system: 'twitter',
            borderRadius: {
                sm: 'rounded-none',
                md: 'rounded-sm',
                lg: 'rounded-md',
                full: 'rounded-full',
            },
            shadow: {
                sm: 'shadow-sm',
                md: 'shadow',
                lg: 'shadow-md',
            },
            spacing: {
                compact: true,
            },
        };
    }
};
