import { useEffect, useState } from 'react';
import { useDeviceDetection } from './useDeviceDetection';

interface PerformanceMode {
    reduceMotion: boolean;
    reduceEffects: boolean;
}

export const usePerformanceMode = (): PerformanceMode => {
    const device = useDeviceDetection();
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;

        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

        updatePreference();

        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', updatePreference);
        } else {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error - older Safari
            mediaQuery.addListener(updatePreference);
        }

        return () => {
            if (mediaQuery.removeEventListener) {
                mediaQuery.removeEventListener('change', updatePreference);
            } else {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error - older Safari
                mediaQuery.removeListener(updatePreference);
            }
        };
    }, []);

    const isLikelyLowEndMobile =
        device.isMobile &&
        device.pixelRatio <= 2 &&
        device.viewportWidth <= 420;

    const reduceMotion = prefersReducedMotion || isLikelyLowEndMobile;
    const reduceEffects =
        reduceMotion ||
        (device.isMobile && !device.isStandalone);

    return {
        reduceMotion,
        reduceEffects,
    };
};

