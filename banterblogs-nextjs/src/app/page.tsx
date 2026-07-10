import { GalacticHero } from '@/components/galactic/GalacticHero';
import ErrorBoundary from '@/components/ErrorBoundary';

// Landing: the full-page galactic center. No scroll — the universe is the
// homepage. The black hole is Chimera; the nine orbiting systems are the
// repos. The classic scrollable overview lives at /home.

export default function LandingPage() {
  return (
    <ErrorBoundary>
      <GalacticHero />
    </ErrorBoundary>
  );
}
