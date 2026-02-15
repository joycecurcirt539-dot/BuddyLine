import { useEffect, useState, useMemo } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type OperatingSystem = 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown';
export type InputMethod = 'touch' | 'mouse' | 'hybrid';

interface DeviceInfo {
    /** Final resolved device type */
    deviceType: DeviceType;
    /** Detected operating system */
    os: OperatingSystem;
    /** Primary input method */
    inputMethod: InputMethod;
    /** True if running on a phone */
    isMobile: boolean;
    /** True if running on a tablet */
    isTablet: boolean;
    /** True if running on desktop */
    isDesktop: boolean;
    /** True if device has touch capability */
    isTouch: boolean;
    /** True if device is likely using a standalone browser (PWA) */
    isStandalone: boolean;
    /** Current viewport width */
    viewportWidth: number;
    /** Device pixel ratio */
    pixelRatio: number;
}

/** Parse OS from user agent and platform */
function detectOS(): OperatingSystem {
    const ua = navigator.userAgent.toLowerCase();
    const platform = (navigator.platform || '').toLowerCase();

    // iOS detection: includes iPhone, iPad, iPod
    // Also detect iPad on iOS 13+ which reports as MacIntel with touch
    if (/iphone|ipod/.test(ua)) return 'ios';
    if (/ipad/.test(ua)) return 'ios';
    if (platform === 'macintel' && navigator.maxTouchPoints > 1) return 'ios'; // iPad OS 13+

    // Android
    if (/android/.test(ua)) return 'android';

    // Windows
    if (/win/.test(platform) || /windows/.test(ua)) return 'windows';

    // macOS (after iPad check)
    if (/mac/.test(platform)) return 'macos';

    // Linux (after Android check since Android UA also contains Linux)
    if (/linux/.test(platform) || /linux/.test(ua)) return 'linux';

    return 'unknown';
}

/** Detect if UA indicates a mobile device */
function isMobileUserAgent(): boolean {
    const ua = navigator.userAgent;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(ua);
}

/** Detect touch capability from multiple signals */
function detectTouch(): boolean {
    return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-expect-error - legacy check for older browsers
        (window.DocumentTouch && document instanceof window.DocumentTouch)
    );
}

/** Check if running as installed PWA */
function detectStandalone(): boolean {
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        // @ts-expect-error - iOS Safari
        window.navigator.standalone === true
    );
}

/** Detect primary input method using media queries */
function detectInputMethod(): InputMethod {
    const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
    const canHover = window.matchMedia('(hover: hover)').matches;

    if (hasCoarsePointer && !hasFinePointer && !canHover) return 'touch';
    if (hasFinePointer && canHover && !hasCoarsePointer) return 'mouse';
    return 'hybrid'; // e.g., touch-enabled laptops
}

/** Resolve the final device type from all available signals */
function resolveDeviceType(
    os: OperatingSystem,
    inputMethod: InputMethod,
    isTouch: boolean,
    isMobileUA: boolean,
    viewportWidth: number
): DeviceType {
    // Strong signals: OS-based detection
    const mobileOS = os === 'ios' || os === 'android';

    // If mobile OS detected
    if (mobileOS) {
        // Distinguish phone from tablet by screen size and pixel ratio
        const isLargeScreen = viewportWidth >= 768;
        const isTabletUA = /ipad|tablet/i.test(navigator.userAgent);

        if (isTabletUA || (isLargeScreen && os === 'ios' && navigator.maxTouchPoints > 1)) {
            return 'tablet';
        }
        if (isLargeScreen && os === 'android') {
            // Large Android could be tablet
            const pixelRatio = window.devicePixelRatio || 1;
            const physicalWidth = viewportWidth / pixelRatio;
            if (physicalWidth >= 600) return 'tablet';
        }
        return 'mobile';
    }

    // Desktop OS with touch (e.g., Surface, touch-enabled laptop)
    if ((os === 'windows' || os === 'macos' || os === 'linux') && isTouch) {
        // If input is primarily touch and screen is small, treat as tablet
        if (inputMethod === 'touch' && viewportWidth < 1024) {
            return 'tablet';
        }
        return 'desktop'; // Touch laptop
    }

    // Fallback: UA-based detection
    if (isMobileUA) {
        if (viewportWidth >= 768) return 'tablet';
        return 'mobile';
    }

    // Screen size fallback (least reliable)
    if (viewportWidth < 768) return 'mobile';
    if (viewportWidth < 1024 && isTouch) return 'tablet';

    return 'desktop';
}

export const useDeviceDetection = (): DeviceInfo => {
    const [viewportWidth, setViewportWidth] = useState(
        typeof window !== 'undefined' ? window.innerWidth : 1024
    );

    // Static values — computed once (don't change without page reload)
    const staticInfo = useMemo(() => {
        if (typeof window === 'undefined') {
            return {
                os: 'unknown' as OperatingSystem,
                isTouch: false,
                isMobileUA: false,
                isStandalone: false,
                inputMethod: 'mouse' as InputMethod,
                pixelRatio: 1,
            };
        }

        return {
            os: detectOS(),
            isTouch: detectTouch(),
            isMobileUA: isMobileUserAgent(),
            isStandalone: detectStandalone(),
            inputMethod: detectInputMethod(),
            pixelRatio: window.devicePixelRatio || 1,
        };
    }, []);

    // Listen for viewport changes
    useEffect(() => {
        const handleResize = () => setViewportWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Resolve device type from all signals
    const deviceType = useMemo(
        () =>
            resolveDeviceType(
                staticInfo.os,
                staticInfo.inputMethod,
                staticInfo.isTouch,
                staticInfo.isMobileUA,
                viewportWidth
            ),
        [staticInfo, viewportWidth]
    );

    return {
        deviceType,
        os: staticInfo.os,
        inputMethod: staticInfo.inputMethod,
        isMobile: deviceType === 'mobile',
        isTablet: deviceType === 'tablet',
        isDesktop: deviceType === 'desktop',
        isTouch: staticInfo.isTouch,
        isStandalone: staticInfo.isStandalone,
        viewportWidth,
        pixelRatio: staticInfo.pixelRatio,
    };
};
