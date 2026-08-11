import { useState, useEffect } from 'react';

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  screenWidth: number;
  screenHeight: number;
  orientation: 'portrait' | 'landscape';
}

/**
 * Smart device detection utility based on User Agent, Touch capability, and Screen Dimensions.
 */
export const getDeviceInfo = (): DeviceInfo => {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isTouchDevice: false,
      screenWidth: 1280,
      screenHeight: 800,
      orientation: 'landscape'
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  
  const mobileRegex = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;
  const tabletRegex = /iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i;

  const isMobileUA = mobileRegex.test(userAgent);
  const isTabletUA = tabletRegex.test(userAgent);
  const touchCapable = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

  const isMobileSize = width < 768;
  const isTabletSize = width >= 768 && width < 1024;
  const isDesktopSize = width >= 1024;

  const isMobile = isMobileUA || (isMobileSize && touchCapable);
  const isTablet = !isMobile && (isTabletUA || isTabletSize);
  const isDesktop = !isMobile && !isTablet && isDesktopSize;

  return {
    isMobile,
    isTablet,
    isDesktop: isDesktop || (!isMobile && !isTablet),
    isTouchDevice: touchCapable,
    screenWidth: width,
    screenHeight: height,
    orientation: width < height ? 'portrait' : 'landscape'
  };
};

/**
 * React Hook for real-time, debounced device detection and viewport changes.
 */
export const useDeviceDetect = (): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(getDeviceInfo());

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(timeoutId);
      // Debounce by 150ms to prevent performance degradation / lag during active window resizing
      timeoutId = setTimeout(() => {
        setDeviceInfo(getDeviceInfo());
      }, 150);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return deviceInfo;
};
