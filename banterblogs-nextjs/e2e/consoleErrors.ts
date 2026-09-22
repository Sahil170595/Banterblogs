import type { ConsoleMessage, Page } from '@playwright/test';

// Vercel serves its analytics scripts only on its own edge; everywhere else
// they 404, which is not a site error
const VERCEL_ONLY_PATH = /^\/_vercel\//;
const FAILED_RESOURCE = /^Failed to load resource/;

/**
 * Collects the page's console errors and uncaught exceptions from now on,
 * less the expected 404s: Vercel-only scripts, and `own404Path` (a route that
 * is meant to 404, whose document load Chrome logs as an error).
 */
export function collectErrors(page: Page, own404Path?: string): string[] {
  const errors: string[] = [];
  const expected404 = (message: ConsoleMessage) => {
    if (!FAILED_RESOURCE.test(message.text())) return false;
    const { pathname } = new URL(message.location().url || 'about:blank');
    return VERCEL_ONLY_PATH.test(pathname) || pathname === own404Path;
  };
  page.on('console', (message) => {
    if (message.type() === 'error' && !expected404(message)) {
      errors.push(`${message.text()} (${message.location().url})`);
    }
  });
  page.on('pageerror', (error) => errors.push(`uncaught: ${error.message}`));
  return errors;
}
