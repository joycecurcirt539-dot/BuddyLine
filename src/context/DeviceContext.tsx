import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import {
    detectOS,
    detectTouch,
    isMobileUserAgent,
    detectStandalone,
    detectInputMethod,
    resolveDeviceType
} from '../utils/deviceUtils';
import type { DeviceType, OperatingSystem, InputMethod, DeviceInfo } from '../utils/deviceUtils';

const DeviceContext = createContext<DeviceInfo | undefined>(undefined);

export const DeviceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [viewportWidth, setViewportWidth] = useState(
        typeof window !== 'undefined' ? window.innerWidth : 1024
    );

    const staticInfo = useMemo(() => {
        if (typeof window === 'undefined') return null;
        return {
            os: detectOS(),
            isTouch: detectTouch(),
            isMobileUA: isMobileUserAgent(),
            isStandalone: detectStandalone(),
            inputMethod: detectInputMethod(),
            pixelRatio: window.devicePixelRatio || 1,
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleResize = () => {
            const newWidth = window.innerWidth;
            // Threshold to avoid re-renders on mobile address bar scroll
            setViewportWidth(prev => Math.abs(prev - newWidth) > 20 ? newWidth : prev);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const value = useMemo(() => {
        if (!staticInfo) {
            return {
                deviceType: 'desktop' as DeviceType,
                os: 'unknown' as OperatingSystem,
                inputMethod: 'mouse' as InputMethod,
                isMobile: false,
                isTablet: false,
                isDesktop: true,
                isTouch: false,
                isStandalone: false,
                viewportWidth: 1024,
                pixelRatio: 1,
            };
        }

        const deviceType = resolveDeviceType(
            staticInfo.os,
            staticInfo.inputMethod,
            staticInfo.isTouch,
            staticInfo.isMobileUA,
            viewportWidth
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
    }, [staticInfo, viewportWidth]);

    return (
        <DeviceContext.Provider value={value}>
            {children}
        </DeviceContext.Provider>
    );
};

export const useDevice = () => {
    const context = useContext(DeviceContext);
    if (context === undefined) {
        throw new Error('useDevice must be used within a DeviceProvider');
    }
    return context;
};
