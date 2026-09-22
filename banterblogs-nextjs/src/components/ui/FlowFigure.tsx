import type { CSSProperties, ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface FlowStep {
  label: string;
  detail: ReactNode;
  /** io: what goes in; step: a stage or gate (the default); result: what comes out, the figure's one ember node */
  kind?: 'io' | 'step' | 'result';
}

export interface FlowLoop {
  /** the step the loop leaves (0-based) */
  from: number;
  /** the earlier step it returns to */
  to: number;
  label: ReactNode;
}

export interface FlowFigureProps {
  title: ReactNode;
  caption: ReactNode;
  steps: FlowStep[];
  loop?: FlowLoop;
  className?: string;
}

/**
 * A diagram of a real sequence: nodes on one hairline rail, down the side
 * where the figure is narrow and across where it is wide (.flow in
 * globals.css turns on the figure's own width, so it fits a head column and
 * a page column alike). The labels stay text, so they read and reflow at any
 * width; the caption says what the figure shows.
 */
export function FlowFigure({ title, caption, steps, loop, className }: FlowFigureProps) {
  return (
    // --flow-count sizes both the steps' row and the loop's, which sit side by side
    <figure className={cn('flow', className)} style={{ '--flow-count': String(steps.length) } as CSSProperties}>
      <figcaption className="flow-caption">
        <span className="block text-copy-14 font-medium text-foreground">{title}</span>
        <span className="mt-1 block text-label-13 text-muted-foreground">{caption}</span>
      </figcaption>
      <ol className="flow-steps">
        {steps.map((step) => (
          <li key={step.label} className="flow-step" data-kind={step.kind ?? 'step'}>
            <span aria-hidden="true" className="flow-node" />
            <p className="flow-label text-copy-14 font-medium text-foreground">{step.label}</p>
            <p className="flow-detail mt-1 text-label-13 text-muted-foreground">{step.detail}</p>
          </li>
        ))}
      </ol>
      {loop && (
        // grid lines of the row layout: from the returned-to step's column up to the leaving step's
        <div className="flow-loop" style={{ '--loop-span': `${loop.to + 1} / ${loop.from + 1}` } as CSSProperties}>
          <span aria-hidden="true" className="flow-loop-path" />
          <p className="flow-loop-label text-label-13 text-muted-foreground">
            <RotateCcw aria-hidden="true" className="mr-1.5 inline-block h-3.5 w-3.5 align-[-0.125em]" />
            {loop.label}
          </p>
        </div>
      )}
    </figure>
  );
}
