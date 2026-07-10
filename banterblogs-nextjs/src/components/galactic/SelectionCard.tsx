'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, X } from 'lucide-react';
import { CORE_SELECTION, type GalacticSelection } from './systems';
import { blackbodyToRGB } from './blackbody';

// DOM overlay card for whatever is selected in the scene. Lives outside the
// canvas so it's real, accessible UI — the 3D is the picker, this is the
// content.

interface SelectionCardProps {
  selection: GalacticSelection;
  onClose: () => void;
}

export function SelectionCard({ selection, onClose }: SelectionCardProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isCore = selection.kind === 'core';
  const name = isCore ? CORE_SELECTION.name : selection.system.name;
  const eyebrow = isCore ? CORE_SELECTION.eyebrow : 'Star system';
  const blurb = isCore ? CORE_SELECTION.blurb : selection.system.blurb;
  const stats = isCore
    ? CORE_SELECTION.stats
    : `T = ${selection.system.tempK.toLocaleString()} K · e = ${selection.system.e} · a = ${selection.system.a}`;
  const swatch = isCore
    ? 'hsl(16 95% 53%)'
    : `rgb(${blackbodyToRGB(selection.system.tempK)
        .map((v) => Math.round(v * 255))
        .join(' ')})`;

  return (
    <aside
      role="dialog"
      aria-label={`${name} details`}
      className="pointer-events-auto absolute bottom-24 left-4 right-4 z-20 mx-auto max-w-sm rounded-2xl border border-border/60 bg-background/90 p-5 shadow-2xl backdrop-blur-xl md:left-auto md:right-10 md:top-1/2 md:bottom-auto md:mx-0 md:w-96 md:max-w-none md:-translate-y-1/2"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: swatch, boxShadow: `0 0 12px ${swatch}` }}
            aria-hidden="true"
          />
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {eyebrow}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close details"
          className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <h2 className="display mt-3 text-2xl font-bold tracking-tight text-foreground">{name}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{blurb}</p>
      <p className="mt-3 font-mono text-[10px] tracking-wide text-muted-foreground/80">{stats}</p>

      <div className="mt-5">
        {isCore ? (
          <Link
            href={CORE_SELECTION.href}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {CORE_SELECTION.cta}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : (
          <a
            href={selection.system.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Open {selection.system.name}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        )}
      </div>
    </aside>
  );
}
