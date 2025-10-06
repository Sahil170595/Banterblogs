'use client';

export function DevThemeToggle() {
  if (process.env.NEXT_PUBLIC_SHOW_THEME_TOGGLE !== "1") {
    return null;
  }

  const themes = ['default', 'banterpacks', 'chimera'] as const;
  
  const cycleTheme = () => {
    const currentTheme = document.documentElement.dataset.theme || 'default';
    const currentIndex = themes.indexOf(currentTheme as any);
    const nextIndex = (currentIndex + 1) % themes.length;
    document.documentElement.dataset.theme = themes[nextIndex];
  };

  return (
    <button
      onClick={cycleTheme}
      className="fixed bottom-4 right-4 z-50 bg-black/20 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-xs hover:bg-black/40 transition-colors"
    >
      Theme
    </button>
  );
}
