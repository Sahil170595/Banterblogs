import type { Metadata } from 'next';
import { GalacticHero } from '@/components/galactic/GalacticHero';
import ErrorBoundary from '@/components/ErrorBoundary';
import { MEASUREMENTS, REPORTS } from '@/lib/constants';

// Landing: the full-page galactic center. No scroll — the universe is the
// homepage. The black hole is Chimera; the nine orbiting systems are the
// repos. The classic scrollable overview lives at /home.

export const metadata: Metadata = {
  description:
    `Nine repositories orbiting one constitutional AI core — an interactive galactic map of the Chimera ecosystem. ` +
    `${REPORTS.DISPLAY} technical reports, ${MEASUREMENTS.DISPLAY} measurements.`,
};

export default function LandingPage() {
  return (
    <ErrorBoundary>
      <GalacticHero />
    </ErrorBoundary>
  );
}
