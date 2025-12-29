'use client';

import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Zap, Cpu, MemoryStick, Wifi, Battery } from 'lucide-react';

interface PerformanceMetrics {
  fps: number;
  memory: number;
  cpu: number;
  network: number;
  battery: number;
  renderTime: number;
}

interface PerformanceMonitorProps {
  className?: string;
  showDetails?: boolean;
}

export function PerformanceMonitor({ className = '', showDetails = false }: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memory: 0,
    cpu: 0,
    network: 0,
    battery: 100,
    renderTime: 0
  });
  
  const [isVisible, setIsVisible] = useState(false);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // FPS monitoring
    const measureFPS = () => {
      const now = performance.now();
      frameCountRef.current++;
      
      if (now - lastTimeRef.current >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / (now - lastTimeRef.current));
        setMetrics(prev => ({ ...prev, fps }));
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }
      
      animationFrameRef.current = requestAnimationFrame(measureFPS);
    };

    // Memory monitoring
    const measureMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
        setMetrics(prev => ({ ...prev, memory: usedMB }));
      }
    };

    // Network monitoring
    const measureNetwork = () => {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        const downlink = connection.downlink || 0;
        setMetrics(prev => ({ ...prev, network: downlink }));
      }
    };

    // Battery monitoring
    const measureBattery = async () => {
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery();
          const batteryLevel = Math.round(battery.level * 100);
          setMetrics(prev => ({ ...prev, battery: batteryLevel }));
        } catch {
          // Battery API not supported
        }
      }
    };

    // Render time monitoring
    const measureRenderTime = () => {
      const start = performance.now();
      requestAnimationFrame(() => {
        const renderTime = performance.now() - start;
        setMetrics(prev => ({ ...prev, renderTime: Math.round(renderTime * 100) / 100 }));
      });
    };

    // Start monitoring
    measureFPS();
    measureMemory();
    measureNetwork();
    measureBattery();
    measureRenderTime();

    // Update metrics periodically
    const interval = setInterval(() => {
      measureMemory();
      measureNetwork();
      measureBattery();
      measureRenderTime();
    }, 1000);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      clearInterval(interval);
    };
  }, []);

  const getPerformanceColor = (value: number, type: 'fps' | 'memory' | 'cpu' | 'network' | 'battery' | 'renderTime') => {
    switch (type) {
      case 'fps':
        if (value >= 55) return 'text-green-400';
        if (value >= 30) return 'text-yellow-400';
        return 'text-red-400';
      case 'memory':
        if (value < 50) return 'text-green-400';
        if (value < 100) return 'text-yellow-400';
        return 'text-red-400';
      case 'cpu':
        if (value < 30) return 'text-green-400';
        if (value < 70) return 'text-yellow-400';
        return 'text-red-400';
      case 'network':
        if (value > 10) return 'text-green-400';
        if (value > 5) return 'text-yellow-400';
        return 'text-red-400';
      case 'battery':
        if (value > 50) return 'text-green-400';
        if (value > 20) return 'text-yellow-400';
        return 'text-red-400';
      case 'renderTime':
        if (value < 16) return 'text-green-400';
        if (value < 33) return 'text-yellow-400';
        return 'text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };

  const getPerformanceIcon = (type: string) => {
    switch (type) {
      case 'fps':
        return <Activity className="h-4 w-4" />;
      case 'memory':
        return <MemoryStick className="h-4 w-4" />;
      case 'cpu':
        return <Cpu className="h-4 w-4" />;
      case 'network':
        return <Wifi className="h-4 w-4" />;
      case 'battery':
        return <Battery className="h-4 w-4" />;
      case 'renderTime':
        return <Zap className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <motion.div
      className={`fixed bottom-4 left-4 z-50 ${className}`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: isVisible ? 1 : 0, x: isVisible ? 0 : -20 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="bg-background/90 backdrop-blur-xl border border-border/60 rounded-2xl p-4 shadow-2xl"
        whileHover={{ scale: 1.02 }}
        onHoverStart={() => setIsVisible(true)}
        onHoverEnd={() => setIsVisible(false)}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm font-medium text-foreground">Performance</span>
        </div>

        <div className="space-y-2">
          <motion.div
            className="flex items-center justify-between text-xs"
            whileHover={{ x: 5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <div className="flex items-center gap-2">
              {getPerformanceIcon('fps')}
              <span className="text-muted-foreground">FPS</span>
            </div>
            <span className={`font-mono ${getPerformanceColor(metrics.fps, 'fps')}`}>
              {metrics.fps}
            </span>
          </motion.div>

          <motion.div
            className="flex items-center justify-between text-xs"
            whileHover={{ x: 5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <div className="flex items-center gap-2">
              {getPerformanceIcon('memory')}
              <span className="text-muted-foreground">Memory</span>
            </div>
            <span className={`font-mono ${getPerformanceColor(metrics.memory, 'memory')}`}>
              {metrics.memory}MB
            </span>
          </motion.div>

          <motion.div
            className="flex items-center justify-between text-xs"
            whileHover={{ x: 5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <div className="flex items-center gap-2">
              {getPerformanceIcon('renderTime')}
              <span className="text-muted-foreground">Render</span>
            </div>
            <span className={`font-mono ${getPerformanceColor(metrics.renderTime, 'renderTime')}`}>
              {metrics.renderTime}ms
            </span>
          </motion.div>

          {showDetails && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 pt-2 border-t border-border/40"
              >
                <motion.div
                  className="flex items-center justify-between text-xs"
                  whileHover={{ x: 5 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                >
                  <div className="flex items-center gap-2">
                    {getPerformanceIcon('network')}
                    <span className="text-muted-foreground">Network</span>
                  </div>
                  <span className={`font-mono ${getPerformanceColor(metrics.network, 'network')}`}>
                    {metrics.network}Mbps
                  </span>
                </motion.div>

                <motion.div
                  className="flex items-center justify-between text-xs"
                  whileHover={{ x: 5 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                >
                  <div className="flex items-center gap-2">
                    {getPerformanceIcon('battery')}
                    <span className="text-muted-foreground">Battery</span>
                  </div>
                  <span className={`font-mono ${getPerformanceColor(metrics.battery, 'battery')}`}>
                    {metrics.battery}%
                  </span>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Performance indicator */}
        <div className="mt-3 w-full h-1 bg-muted/50 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-green-400 to-yellow-400 to-red-400 rounded-full"
            style={{ width: `${Math.min((metrics.fps / 60) * 100, 100)}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

interface TouchOptimizedButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export function TouchOptimizedButton({ 
  children, 
  onClick, 
  className = '', 
  disabled = false 
}: TouchOptimizedButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: TouchEvent<HTMLButtonElement>) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setIsPressed(true);
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
    setTouchStart(null);
  };

  const handleTouchMove = (e: TouchEvent<HTMLButtonElement>) => {
    if (!touchStart) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStart.x);
    const deltaY = Math.abs(touch.clientY - touchStart.y);
    
    // If user moves too far, cancel the press
    if (deltaX > 10 || deltaY > 10) {
      setIsPressed(false);
    }
  };

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  return (
    <motion.button
      className={`touch-manipulation select-none ${className}`}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      disabled={disabled}
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none'
      }}
    >
      <motion.div
        className={`w-full h-full ${isPressed ? 'bg-primary/20' : ''}`}
        animate={{ 
          backgroundColor: isPressed ? 'rgba(34, 211, 238, 0.2)' : 'transparent' 
        }}
        transition={{ duration: 0.1 }}
      >
        {children}
      </motion.div>
    </motion.button>
  );
}

interface TouchGestureProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinch?: (scale: number) => void;
  className?: string;
}

export function TouchGesture({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onPinch,
  className = ''
}: TouchGestureProps) {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const [lastDistance, setLastDistance] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      setTouchEnd(null);
      setTouchStart({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      });
    } else if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setLastDistance(distance);
    }
  };

  const onTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      setTouchEnd({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      });
    } else if (e.touches.length === 2 && lastDistance && onPinch) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = distance / lastDistance;
      onPinch(scale);
    }
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const deltaX = touchStart.x - touchEnd.x;
    const deltaY = touchStart.y - touchEnd.y;

    const isLeftSwipe = deltaX > minSwipeDistance;
    const isRightSwipe = deltaX < -minSwipeDistance;
    const isUpSwipe = deltaY > minSwipeDistance;
    const isDownSwipe = deltaY < -minSwipeDistance;

    if (isLeftSwipe && onSwipeLeft) onSwipeLeft();
    if (isRightSwipe && onSwipeRight) onSwipeRight();
    if (isUpSwipe && onSwipeUp) onSwipeUp();
    if (isDownSwipe && onSwipeDown) onSwipeDown();

    setTouchStart(null);
    setTouchEnd(null);
    setLastDistance(null);
  };

  return (
    <div
      className={`touch-manipulation ${className}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        touchAction: 'manipulation',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none'
      }}
    >
      {children}
    </div>
  );
}






