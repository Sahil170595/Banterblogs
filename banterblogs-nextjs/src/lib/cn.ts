import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// The theme's named tokens (tailwind.config.ts), listed here rather than
// imported so the config never reaches a client bundle; cn.test.ts fails if
// the lists drift from the theme.
export const TYPE_ROLES = [
  'display-72',
  'heading-48',
  'heading-32',
  'heading-24',
  'heading-20',
  'copy-24',
  'copy-20',
  'copy-18',
  'copy-17',
  'copy-16',
  'copy-14',
  'label-13',
  'label-12-mono',
] as const;
export const MOTION_DURATIONS = ['fast', 'press', 'hover', 'base', 'enter', 'route', 'morph', 'reveal', 'exit', 'handoff'] as const;
export const MOTION_CURVES = [
  'standard',
  'strong-out',
  'strong-in-out',
  'move',
  'drawer',
  'spring-gentle',
  'spring-snappy',
  'spring-bouncy',
] as const;

const merge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: [...TYPE_ROLES] }],
      duration: [{ duration: [...MOTION_DURATIONS] }],
      ease: [{ ease: [...MOTION_CURVES] }],
    },
  },
});

/** Joins class values and resolves Tailwind conflicts, the later class winning. */
export function cn(...inputs: ClassValue[]): string {
  return merge(clsx(inputs));
}
