export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type OperatingSystem = 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown';
export type InputMethod = 'touch' | 'mouse' | 'hybrid';

export interface DeviceInfo {
    deviceType: DeviceType;
    os: OperatingSystem;
    inputMethod: InputMethod;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    isTouch: boolean;
    isStandalone: boolean;
    viewportWidth: number;
    pixelRatio: number;
}

/** Parse OS from user agent and platform */
export function detectOS(): OperatingSystem {
    if (typeof window === 'undefined') return 'unknown';
    const ua = navigator.userAgent.toLowerCase();
    const platform = (navigator.platform || '').toLowerCase();

    if (/iphone|ipod/.test(ua)) return 'ios';
    if (/ipad/.test(ua)) return 'ios';
    if (platform === 'macintel' && navigator.maxTouchPoints > 1) return 'ios';
    if (/android/.test(ua)) return 'android';
    if (/win/.test(platform) || /windows/.test(ua)) return 'windows';
    if (/mac/.test(platform)) return 'macos';
    if (/linux/.test(platform) || /linux/.test(ua)) return 'linux';
    return 'unknown';
}

/** Detect if UA indicates a mobile device */
export function isMobileUserAgent(): boolean {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(ua);
}

/** Detect touch capability */
export function detectTouch(): boolean {
    if (typeof window === 'undefined') return false;
    return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-expect-error - legacy check for older browsers
        (window.DocumentTouch && document instanceof window.DocumentTouch)
    );
}

/** Check if running as installed PWA */
export function detectStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        // @ts-expect-error - iOS Safari
        window.navigator.standalone === true
    );
}

/** Detect primary input method */
export function detectInputMethod(): InputMethod {
    if (typeof window === 'undefined') return 'mouse';
    const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
    const canHover = window.matchMedia('(hover: hover)').matches;

    if (hasCoarsePointer && !hasFinePointer && !canHover) return 'touch';
    if (hasFinePointer && canHover && !hasCoarsePointer) return 'mouse';
    return 'hybrid';
}

/** Resolve the final device type */
export function resolveDeviceType(
    os: OperatingSystem,
    inputMethod: InputMethod,
    isTouch: boolean,
    isMobileUA: boolean,
    viewportWidth: number
): DeviceType {
    const mobileOS = os === 'ios' || os === 'android';

    if (mobileOS) {
        const isLargeScreen = viewportWidth >= 768;
        const isTabletUA = /ipad|tablet/i.test(navigator.userAgent);

        if (isTabletUA || (isLargeScreen && os === 'ios' && navigator.maxTouchPoints > 1)) {
            return 'tablet';
        }
        if (isLargeScreen && os === 'android') {
            const pixelRatio = window.devicePixelRatio || 1;
            const physicalWidth = viewportWidth / pixelRatio;
            if (physicalWidth >= 600) return 'tablet';
        }
        return 'mobile';
    }

    if ((os === 'windows' || os === 'macos' || os === 'linux') && isTouch) {
        if (inputMethod === 'touch' && viewportWidth < 1024) {
            return 'tablet';
        }
        return 'desktop';
    }

    if (isMobileUA) {
        if (viewportWidth >= 768) return 'tablet';
        return 'mobile';
    }

    if (viewportWidth < 768) return 'mobile';
    if (viewportWidth < 1024 && isTouch) return 'tablet';

    return 'desktop';
}
