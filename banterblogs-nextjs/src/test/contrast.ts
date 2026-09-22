import fs from 'node:fs';
import path from 'node:path';

// WCAG 2 contrast from the globals.css colour tokens, for tests. A token is
// `H S% L%`; a Tailwind `text-token/NN` is that colour at NN% over what lies
// beneath it.

export type Rgb = [number, number, number];

export const GLOBALS_CSS = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8');

/** the `H S% L%` value of a :root token */
export function tokenOf(name: string, css = GLOBALS_CSS): string {
  const value = new RegExp(`--${name}:\\s*([\\d.]+ [\\d.]+% [\\d.]+%)`).exec(css)?.[1];
  if (!value) throw new Error(`no --${name} token in globals.css`);
  return value;
}

/** sRGB channels, 0-1 */
export function hslToRgb(hsl: string): Rgb {
  const [h, s, l] = hsl.split(/\s+/).map((part) => parseFloat(part));
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    return l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [channel(0), channel(8), channel(4)];
}

/** `top` at `alpha` over `under` */
export function over(top: Rgb, alpha: number, under: Rgb): Rgb {
  return [0, 1, 2].map((i) => top[i] * alpha + under[i] * (1 - alpha)) as Rgb;
}

export function luminance([r, g, b]: Rgb): number {
  const linear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

export function contrast(a: Rgb, b: Rgb): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** a token as an sRGB colour */
export const token = (name: string): Rgb => hslToRgb(tokenOf(name));
