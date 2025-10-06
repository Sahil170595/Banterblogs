export type Theme = "default" | "banterpacks" | "chimera";

export function routeToTheme(pathname: string): Theme {
  if (pathname.includes("/banterpacks")) {
    return "banterpacks";
  }
  if (pathname.includes("/chimera")) {
    return "chimera";
  }
  return "default";
}

export function frontmatterToTheme(v?: string): Theme {
  if (v === "banterpacks" || v === "chimera") {
    return v;
  }
  return "default";
}
