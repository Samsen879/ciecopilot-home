import { useState, useEffect } from 'react';

// Breakpoint values matching our CSS design system
const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
};

export const useBreakpoint = () => {
  const [currentBreakpoint, setCurrentBreakpoint] = useState('xs');
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setWindowSize({ width, height });

      // Determine current breakpoint
      if (width >= breakpoints['2xl']) {
        setCurrentBreakpoint('2xl');
      } else if (width >= breakpoints.xl) {
        setCurrentBreakpoint('xl');
      } else if (width >= breakpoints.lg) {
        setCurrentBreakpoint('lg');
      } else if (width >= breakpoints.md) {
        setCurrentBreakpoint('md');
      } else if (width >= breakpoints.sm) {
        setCurrentBreakpoint('sm');
      } else {
        setCurrentBreakpoint('xs');
      }
    };

    // Set initial values
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Helper functions
  const isAbove = (breakpoint) => {
    const breakpointValue = breakpoints[breakpoint];
    return windowSize.width >= breakpointValue;
  };

  const isBelow = (breakpoint) => {
    const breakpointValue = breakpoints[breakpoint];
    return windowSize.width < breakpointValue;
  };

  const isBetween = (minBreakpoint, maxBreakpoint) => {
    const minValue = breakpoints[minBreakpoint];
    const maxValue = breakpoints[maxBreakpoint];
    return windowSize.width >= minValue && windowSize.width < maxValue;
  };

  return {
    currentBreakpoint,
    windowSize,
    isXs: currentBreakpoint === 'xs',
    isSm: currentBreakpoint === 'sm',
    isMd: currentBreakpoint === 'md',
    isLg: currentBreakpoint === 'lg',
    isXl: currentBreakpoint === 'xl',
    is2Xl: currentBreakpoint === '2xl',
    isAbove,
    isBelow,
    isBetween,
    isMobile: windowSize.width < breakpoints.md,
    isTablet: isBetween('md', 'lg'),
    isDesktop: windowSize.width >= breakpoints.lg
  };
};

export default useBreakpoint;