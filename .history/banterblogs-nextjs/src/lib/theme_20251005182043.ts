export type Theme = "default" | "banterpacks" | "chimera";

export function getThemeFromPathname(pathname: string): Theme {
  if (pathname.includes("/banterpacks")) {
    return "banterpacks";
  } else if (pathname.includes("/chimera")) {
    return "chimera";
  }
  return "default";
}

export function setTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "default") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
  localStorage.setItem("theme", theme);
}

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "default";
  return (localStorage.getItem("theme") as Theme) || "default";
}
