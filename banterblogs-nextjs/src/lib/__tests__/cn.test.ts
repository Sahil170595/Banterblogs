import { describe, expect, it } from 'vitest';
import tailwindConfig from '../../../tailwind.config';
import { cn, MOTION_CURVES, MOTION_DURATIONS, TYPE_ROLES } from '../cn';

describe('cn', () => {
  it('joins conditional classes and lets a later utility win a conflict', () => {
    const muted = false;
    expect(cn('px-2 py-1', muted && 'opacity-50', undefined, 'px-4')).toBe('py-1 px-4');
  });

  it('treats a type role as a font size, never as a colour', () => {
    // unregistered, tailwind-merge would read text-heading-48 as a colour and drop it here
    expect(cn('text-heading-48', 'text-foreground')).toBe('text-heading-48 text-foreground');
    expect(cn('text-sm', 'text-copy-16')).toBe('text-copy-16');
    expect(cn('text-copy-14', 'md:text-copy-17', 'text-label-13')).toBe('md:text-copy-17 text-label-13');
  });

  it('resolves the named motion tokens like the built-in ones', () => {
    expect(cn('duration-fast ease-standard', 'duration-hover ease-strong-out')).toBe('duration-hover ease-strong-out');
  });

  it('knows every role and token the Tailwind theme defines, so the two cannot drift', () => {
    const extend = tailwindConfig.theme?.extend ?? {};
    expect([...TYPE_ROLES].sort()).toEqual(Object.keys(extend.fontSize ?? {}).sort());
    expect([...MOTION_DURATIONS].sort()).toEqual(Object.keys(extend.transitionDuration ?? {}).sort());
    expect([...MOTION_CURVES].sort()).toEqual(Object.keys(extend.transitionTimingFunction ?? {}).sort());
  });
});
