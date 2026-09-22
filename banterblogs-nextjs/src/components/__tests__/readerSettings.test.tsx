import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RootLayout, { viewport } from '@/app/layout';
import { FONT_SIZE_SCALE, FONT_SIZE_STORAGE_KEY } from '../AccessibilityPanel';
import { ReaderSettingsLauncher } from '../AccessibilityPanelClient';

vi.mock('next/font/google', () => ({
  Manrope: () => ({ variable: 'font-sans' }),
  Space_Grotesk: () => ({ variable: 'font-display' }),
  JetBrains_Mono: () => ({ variable: 'font-mono' }),
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/reports',
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@vercel/analytics/next', () => ({ Analytics: () => null }));
vi.mock('@vercel/speed-insights/next', () => ({ SpeedInsights: () => null }));
vi.mock('@/components/SearchDialog', () => ({ SearchDialog: () => null }));
// the route boundary renders the canary-only ViewTransition, which npm React lacks
vi.mock('@/components/motion/RouteTransition', () => ({ RouteTransition: ({ children }: { children: ReactNode }) => children }));

const layoutHtml = () => renderToStaticMarkup(<RootLayout>{<p>page</p>}</RootLayout>);

function prePaintScript(): string {
  const script = /<script id="reader-font-size">([\s\S]*?)<\/script>/.exec(layoutHtml())?.[1];
  if (!script) throw new Error('layout lost its reader font-size script');
  return script;
}

function hslToHex(h: number, s: number, l: number): string {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    const value = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(value * 255).toString(16).padStart(2, '0');
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

const rootFontSize = () => document.documentElement.style.fontSize;

beforeEach(() => {
  localStorage.clear();
  document.documentElement.style.removeProperty('font-size');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('root layout chrome', () => {
  it('colours the browser chrome with the page background and opts into edge-to-edge', () => {
    const css = readFileSync(path.resolve(__dirname, '../../app/globals.css'), 'utf8');
    const token = /--background:\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/.exec(css);
    expect(token).not.toBeNull();
    const [, h, s, l] = token!.map(Number);

    expect(viewport.themeColor).toBe(hslToHex(h, s, l));
    expect(viewport.colorScheme).toBe('dark');
    expect(viewport.viewportFit).toBe('cover');
  });

  it('offers reader settings as a footer button, not a floating launcher', () => {
    const html = layoutHtml();

    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toMatch(/<button[^>]*>Reader settings<\/button>/);
    // the old launcher was an icon button labelled this way on every route
    expect(html).not.toContain('aria-label="Reader settings"');
  });
});

describe('pre-paint font-size script', () => {
  it.each(Object.entries(FONT_SIZE_SCALE))('applies a stored "%s" choice as %s', (size, percent) => {
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, size);
    new Function(prePaintScript())();
    expect(rootFontSize()).toBe(percent);
  });

  it.each([null, 'medium', 'constructor'])('leaves the browser default alone for %s', (stored) => {
    if (stored) localStorage.setItem(FONT_SIZE_STORAGE_KEY, stored);
    new Function(prePaintScript())();
    expect(rootFontSize()).toBe('');
  });

  it('survives blocked storage and reports it', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect(() => new Function(prePaintScript())()).not.toThrow();
    expect(warn).toHaveBeenCalledWith('[reader-settings] stored font size unavailable', expect.any(DOMException));
  });
});

describe('reader settings panel', () => {
  const openPanel = async () => {
    const launcher = screen.getByRole('button', { name: 'Reader settings' });
    await act(async () => {
      fireEvent.click(launcher);
    });
    const panel = document.getElementById('reader-settings');
    if (!panel) throw new Error('panel did not load');
    return { launcher, panel };
  };

  it('loads on demand, writes nothing until a size is chosen, then scales by percentage', async () => {
    render(<ReaderSettingsLauncher />);
    expect(document.getElementById('reader-settings')).toBeNull();

    const { panel } = await openPanel();
    expect(panel.hasAttribute('inert')).toBe(false);
    expect(rootFontSize()).toBe('');

    fireEvent.click(screen.getByRole('button', { name: 'Large' }));
    expect(rootFontSize()).toBe(FONT_SIZE_SCALE.large);
    expect(localStorage.getItem(FONT_SIZE_STORAGE_KEY)).toBe('large');
    expect(screen.getByRole('button', { name: 'Large' }).getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Medium' }));
    expect(rootFontSize()).toBe('');
    expect(localStorage.getItem(FONT_SIZE_STORAGE_KEY)).toBeNull();
  });

  it('shows the stored choice as selected', async () => {
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, 'small');
    render(<ReaderSettingsLauncher />);
    await openPanel();

    expect(screen.getByRole('button', { name: 'Small' }).getAttribute('aria-pressed')).toBe('true');
    expect(rootFontSize()).toBe('');
  });

  it('enters and exits on the overlay tokens: a fade, a 98% scale and a 4px rise', async () => {
    render(<ReaderSettingsLauncher />);
    const { panel } = await openPanel();
    const classes = () => panel.className.split(/\s+/);

    expect(classes()).toEqual(
      expect.arrayContaining(['transition-[opacity,transform]', 'duration-base', 'ease-standard', 'opacity-100', 'scale-100', 'translate-y-0']),
    );

    fireEvent.keyDown(panel, { key: 'Escape' });

    expect(classes()).toEqual(expect.arrayContaining(['opacity-0', 'scale-[0.98]', 'translate-y-1', 'pointer-events-none']));
  });

  it('closes on Escape and hands focus back to the launcher', async () => {
    render(<ReaderSettingsLauncher />);
    const { launcher, panel } = await openPanel();
    expect(launcher.getAttribute('aria-expanded')).toBe('true');
    expect(panel.contains(document.activeElement)).toBe(true);

    fireEvent.keyDown(panel, { key: 'Escape' });

    expect(panel.hasAttribute('inert')).toBe(true);
    expect(launcher.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(launcher);
  });
});
