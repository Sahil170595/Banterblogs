'use client';

import { useEffect, useState } from 'react';

export function ThemeBanner() {
  const [theme, setTheme] = useState<string>('default');

  useEffect(() => {
    const updateTheme = () => {
      const themeElement = document.querySelector('[data-theme]') as HTMLElement;
      const currentTheme = themeElement?.dataset.theme || 'default';
      setTheme(currentTheme);
    };

    updateTheme();
    
    // Watch for theme changes
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => observer.disconnect();
  }, []);

  const getBannerText = (theme: string) => {
    switch (theme) {
      case 'banterpacks':
        return 'Building Banterpacks';
      case 'chimera':
        return 'Building Chimera Engine';
      default:
        return 'Exploring the Banterverse';
    }
  };

  return (
    <div className="fixed top-4 right-5 z-50 text-xs italic opacity-80 pointer-events-none tracking-wide">
      {getBannerText(theme)}
    </div>
  );
}
