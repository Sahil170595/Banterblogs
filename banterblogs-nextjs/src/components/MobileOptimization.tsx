'use client';

import { useEffect, useState, type ReactNode, type TouchEvent as ReactTouchEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Smartphone,
  Tablet,
  Monitor,
  Wifi,
  WifiOff,
  Battery,
  BatteryLow,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';

interface TouchInteractionProps {
  children: ReactNode;
  className?: string;
}

export function TouchInteraction({ children, className = '' }: TouchInteractionProps) {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: ReactTouchEvent<HTMLDivElement>) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const onTouchMove = (e: ReactTouchEvent<HTMLDivElement>) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;
    const isUpSwipe = distanceY > minSwipeDistance;
    const isDownSwipe = distanceY < -minSwipeDistance;

    if (isLeftSwipe || isRightSwipe || isUpSwipe || isDownSwipe) {
      // Handle swipe gestures
      handleSwipe(isLeftSwipe, isRightSwipe, isUpSwipe, isDownSwipe);
    }
  };

  const handleSwipe = (left: boolean, right: boolean, up: boolean, down: boolean) => {
    if (left) {
      // Navigate to next episode
      const nextButton = document.querySelector('[data-navigation="next"]') as HTMLElement;
      nextButton?.click();
    } else if (right) {
      // Navigate to previous episode
      const prevButton = document.querySelector('[data-navigation="prev"]') as HTMLElement;
      prevButton?.click();
    } else if (up) {
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (down) {
      // Scroll to bottom
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
  };

  return (
    <div
      className={`touch-interaction ${className}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        touchAction: 'pan-y pinch-zoom',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none'
      }}
    >
      {children}
    </div>
  );
}

interface DeviceDetectorProps {
  className?: string;
}

export function DeviceDetector({ className = '' }: DeviceDetectorProps) {
  const [deviceInfo, setDeviceInfo] = useState({
    type: 'desktop' as 'mobile' | 'tablet' | 'desktop',
    isOnline: true,
    batteryLevel: 100,
    isLowBattery: false
  });

  useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth;
      const type = width < 768 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';

      setDeviceInfo(prev => ({
        ...prev,
        type,
        isOnline: navigator.onLine
      }));
    };

    const updateBattery = async () => {
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery();
          setDeviceInfo(prev => ({
            ...prev,
            batteryLevel: Math.round(battery.level * 100),
            isLowBattery: battery.level < 0.2
          }));
        } catch (error) {
          console.error('Failed to fetch battery status', error);
        }
      }
    };

    const handleOnline = () => setDeviceInfo(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setDeviceInfo(prev => ({ ...prev, isOnline: false }));

    updateDeviceInfo();
    updateBattery();

    window.addEventListener('resize', updateDeviceInfo);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getDeviceIcon = () => {
    switch (deviceInfo.type) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Tablet className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`fixed top-6 right-6 z-40 bg-background/90 backdrop-blur-xl border border-border/50 rounded-lg p-3 shadow-lg ${className}`}
    >
      <div className="flex items-center gap-3 text-sm">
        <div className="flex items-center gap-1 text-muted-foreground">
          {getDeviceIcon()}
          <span className="capitalize">{deviceInfo.type}</span>
        </div>

        <div className="flex items-center gap-1">
          {deviceInfo.isOnline ? (
            <Wifi className="h-4 w-4 text-green-400" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-400" />
          )}
        </div>

        {deviceInfo.batteryLevel < 100 && (
          <div className="flex items-center gap-1">
            {deviceInfo.isLowBattery ? (
              <BatteryLow className="h-4 w-4 text-red-400" />
            ) : (
              <Battery className="h-4 w-4 text-green-400" />
            )}
            <span className="text-xs text-muted-foreground">
              {deviceInfo.batteryLevel}%
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface MobileNavigationProps {
  prevEpisode?: { slug: string; title: string } | null;
  nextEpisode?: { slug: string; title: string } | null;
  className?: string;
}

export function MobileNavigation({ prevEpisode, nextEpisode, className = '' }: MobileNavigationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // Show navigation when scrolled past 20% and not at the very bottom
      setIsVisible(scrollTop > windowHeight * 0.2 && scrollTop < documentHeight - windowHeight * 0.8);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 md:hidden ${className}`}
        >
          <div className="flex items-center gap-2 bg-background/90 backdrop-blur-xl border border-border/50 rounded-full px-4 py-2 shadow-2xl">
            {prevEpisode && (
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href={`/episodes/${prevEpisode.slug}`}
                data-navigation="prev"
                className="flex items-center gap-1 px-3 py-1 rounded-full bg-muted/50 text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-xs">Prev</span>
              </motion.a>
            )}

            <div className="w-px h-4 bg-border/50" />

            {nextEpisode && (
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href={`/episodes/${nextEpisode.slug}`}
                data-navigation="next"
                className="flex items-center gap-1 px-3 py-1 rounded-full bg-muted/50 text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors"
              >
                <span className="text-xs">Next</span>
                <ArrowRight className="h-4 w-4" />
              </motion.a>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface TouchFeedbackProps {
  children: ReactNode;
  onTap?: () => void;
  className?: string;
}

export function TouchFeedback({ children, onTap, className = '' }: TouchFeedbackProps) {
  const [isPressed, setIsPressed] = useState(false);

  const handleTouchStart = () => {
    setIsPressed(true);
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
    onTap?.();
  };

  return (
    <motion.div
      className={`touch-feedback ${className}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      animate={{
        scale: isPressed ? 0.95 : 1,
        opacity: isPressed ? 0.8 : 1
      }}
      transition={{ duration: 0.1 }}
      style={{
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation'
      }}
    >
      {children}
    </motion.div>
  );
}
