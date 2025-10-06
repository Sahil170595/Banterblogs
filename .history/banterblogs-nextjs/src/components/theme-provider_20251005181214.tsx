import type { ReactNode } from "react";
import { frontmatterToTheme, routeToTheme, type Theme } from "@/lib/theme";

interface ThemeProviderProps {
  children: ReactNode;
  pathname: string;
  frontmatterTheme?: string;
}

export function ThemeProvider({ children, pathname, frontmatterTheme }: ThemeProviderProps) {
  const theme: Theme = frontmatterToTheme(frontmatterTheme) ?? routeToTheme(pathname);
  
  return (
    <div data-theme={theme} className="min-h-screen bg-[color:var(--bg-start)] text-[color:var(--text)]">
      {children}
    </div>
  );
}

export function getResolvedTheme(pathname: string, frontmatterTheme?: string): Theme {
  return frontmatterToTheme(frontmatterTheme) ?? routeToTheme(pathname);
}
