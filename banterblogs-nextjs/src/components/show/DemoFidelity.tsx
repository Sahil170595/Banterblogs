import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

/**
 * How faithful a /show scene is to the code it demonstrates: the one limit
 * that matters in plain words, the engineering detail folded beneath it
 * (the .more-details disclosure /work uses).
 */
export function DemoFidelity({ statement, children }: { statement: ReactNode; children: ReactNode }) {
  return (
    <div>
      <p className="text-sm md:text-base text-foreground/85 leading-relaxed">{statement}</p>
      <details className="more-details">
        <summary>
          <ChevronRight aria-hidden="true" className="more-chevron h-3.5 w-3.5" />
          How faithful is this demo?
        </summary>
        <div className="mt-3 space-y-3">{children}</div>
      </details>
    </div>
  );
}
