'use client';

import { useEffect, useRef, useState } from 'react';

interface MagneticCursorOptions {
  strength?: number;
  radius?: number;
  enabled?: boolean;
}

export function useMagneticCursor(options: MagneticCursorOptions = {}) {
  const { strength = 0.3, radius = 100, enabled = true } = options;
  const elementRef = useRef<HTMLElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!enabled || !elementRef.current) return;

    const element = elementRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isHovered) return;

      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const distanceX = e.clientX - centerX;
      const distanceY = e.clientY - centerY;
      const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

      if (distance < radius) {
        const force = (radius - distance) / radius;
        const moveX = distanceX * force * strength;
        const moveY = distanceY * force * strength;

        element.style.transform = `translate(${moveX}px, ${moveY}px) scale(${1 + force * 0.05})`;
        element.style.transition = 'transform 0.1s ease-out';
      } else {
        element.style.transform = 'translate(0px, 0px) scale(1)';
        element.style.transition = 'transform 0.3s cubic-bezier(0.23, 1, 0.32, 1)';
      }
    };

    const handleMouseEnter = () => {
      setIsHovered(true);
      element.style.willChange = 'transform';
    };

    const handleMouseLeave = () => {
      setIsHovered(false);
      element.style.transform = 'translate(0px, 0px) scale(1)';
      element.style.transition = 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)';
      element.style.willChange = 'auto';
    };

    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isHovered, strength, radius, enabled]);

  return elementRef;
}


