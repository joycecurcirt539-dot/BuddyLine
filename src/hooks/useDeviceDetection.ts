import { useDevice } from '../context/DeviceContext';
export type { DeviceType, OperatingSystem, InputMethod, DeviceInfo } from '../utils/deviceUtils';

/**
 * Hook to consume device detection information.
 * Refactored to use centralized DeviceContext.
 */
export const useDeviceDetection = () => {
    return useDevice();
};
