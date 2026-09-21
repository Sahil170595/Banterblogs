'use client';

import Link from 'next/link';
import { Github, Linkedin, Menu, X } from 'lucide-react';
import { useEffect, useRef, useState, type AnimationEvent, type CSSProperties } from 'react';
import { usePathname } from 'next/navigation';
import { SearchDialog } from './SearchDialog';
import { MOTION_ATTRIBUTE } from './motion/prePaint';
import { Wordmark } from './ui/Wordmark';
import { cn } from '@/lib/cn';
import { EXTERNAL_LINKS, GITHUB_URLS } from '@/lib/constants';

const NAV_ITEMS = [
  { href: '/platform', label: 'Platform' },
  { href: '/reports', label: 'Research' },
  { href: '/papers', label: 'Papers' },
  { href: '/tools', label: 'Tools' },
  { href: '/show', label: 'Show' },
  { href: '/work', label: 'Work' },
  { href: '/about', label: 'About' },
];
const SOCIAL_LINKS = [
  { href: GITHUB_URLS.PROFILE, label: 'GitHub', Icon: Github },
  { href: EXTERNAL_LINKS.LINKEDIN, label: 'LinkedIn', Icon: Linkedin },
];

// Named so route transitions leave the header in place; globals.css (view
// transitions block) holds its group still and drops the old snapshot, whose
// backdrop blur would flash against the new one. The name sits on a frame
// inside <header>, not on it: an element with a view-transition-name is a
// backdrop root, and the header's glass layer (::before) would blur nothing.
const HEADER_TRANSITION_NAME = 'site-header';

// closed -> open -> closing (the panel's fade, globals.css) -> closed
type MenuState = 'closed' | 'open' | 'closing';

const COLOR_TRANSITION = 'transition-colors duration-fast ease-standard';
const ICON_BUTTON = cn(
  'inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 text-foreground hover:border-primary/60 hover:text-primary',
  COLOR_TRANSITION,
);
const MENU_ROW = cn('menu-item flex min-h-11 items-center rounded-lg px-3 py-2 hover:bg-primary/10 hover:text-primary', COLOR_TRANSITION);

const menuIndex = (i: number) => ({ '--i': i }) as CSSProperties;
const motionArmed = () => document.documentElement.getAttribute(MOTION_ATTRIBUTE) === 'on';

export function Header() {
  const [menu, setMenu] = useState<MenuState>('closed');
  const toggleRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  // On the galactic landing the nav floats transparent over the scene —
  // full-bleed space, nothing boxed off. Everywhere else it's the standard
  // sticky blurred bar.
  const isLanding = pathname === '/';
  // one answer for both the active styling and aria-current
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  // fades out when motion is armed; otherwise, and when a link is followed, goes at once
  const closeMenu = (instant = false) => setMenu(!instant && motionArmed() ? 'closing' : 'closed');
  const endFade = (event: AnimationEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) setMenu((state) => (state === 'closing' ? 'closed' : state));
  };

  // Escape closes the mobile disclosure — expected dismiss behavior, and the
  // menu is the only thing on screen once it is open.
  useEffect(() => {
    if (menu !== 'open') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      setMenu(motionArmed() ? 'closing' : 'closed');
      // the focused menu link leaves with the panel; without this, focus
      // falls to <body>
      toggleRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menu]);

  return (
    <header
      className={
        isLanding
          ? 'fixed top-0 z-50 w-full bg-transparent'
          : // .site-header (globals.css) lays a glass surface and hairline under
            // the bar that fade in with the ember rule over the first scroll, on
            // a scroll timeline
            'site-header sticky top-0 z-50 w-full relative after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-primary/60 after:to-transparent'
      }
    >
      {/* the transparent rule keeps the bar's height fixed, inside the named
          frame so its group covers the whole bar during a route transition */}
      <div style={{ viewTransitionName: HEADER_TRANSITION_NAME }} className={isLanding ? undefined : 'border-b border-transparent'}>
        <div
          className={
            isLanding
              ? 'flex h-[72px] items-center justify-between gap-6 px-5 sm:px-8'
              : 'container flex h-[72px] items-center justify-between gap-6'
          }
        >
          {/* the landing's mark on every page, so the two read as one site */}
          <Link href="/" className="flex items-center">
            <Wordmark />
          </Link>

          <div className="flex flex-1 items-center justify-end gap-4">
            <div className={isLanding ? 'hidden' : 'hidden flex-1 md:block lg:max-w-[180px] xl:max-w-xs 2xl:max-w-sm'}>
              <SearchDialog />
            </div>

            {/* one nav language on every page — the landing's mono register
                is the site's editorial voice, not a landing-only costume */}
            <nav className="hidden items-center gap-1 text-label-12-mono text-muted-foreground lg:flex">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'px-2.5 py-2 xl:px-3',
                      COLOR_TRANSITION,
                      active
                        ? isLanding
                          ? 'text-primary'
                          : 'rounded-full bg-primary/15 text-primary'
                        : isLanding
                          ? 'hover:text-primary'
                          : 'rounded-full hover:bg-primary/10 hover:text-primary',
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <div className="ml-2 flex items-center gap-1 border-l border-border/40 pl-2">
                {SOCIAL_LINKS.map(({ href, label, Icon }) => (
                  <Link key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={ICON_BUTTON}>
                    <Icon className="h-4 w-4" />
                  </Link>
                ))}
              </div>
            </nav>

            <button
              ref={toggleRef}
              className={cn('inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-accent/10 hover:text-foreground lg:hidden', COLOR_TRANSITION)}
              onClick={() => (menu === 'open' ? closeMenu() : setMenu('open'))}
              aria-label="Toggle navigation"
              aria-expanded={menu === 'open'}
              aria-controls="mobile-nav"
            >
              {menu === 'open' ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {menu !== 'closed' && (
          <div
            id="mobile-nav"
            data-state={menu}
            inert={menu === 'closing'}
            onAnimationEnd={endFade}
            // capped to the space under the 72px bar and scrollable, so the last
            // links stay reachable on short screens
            className={cn(
              'max-h-[calc(100svh-72px)] overflow-y-auto overscroll-contain border-t border-border/60 bg-background/95 backdrop-blur lg:hidden',
              isLanding && 'h-[calc(100svh-72px)]',
            )}
          >
            <div className="container space-y-1 py-6">
              <div className="menu-item mb-4" style={menuIndex(0)}>
                <SearchDialog />
              </div>
              {NAV_ITEMS.map((item, index) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    style={menuIndex(index + 1)}
                    className={cn(MENU_ROW, 'text-label-12-mono', active ? 'text-primary' : 'text-muted-foreground')}
                    onClick={() => closeMenu(true)}
                  >
                    {item.label}
                  </Link>
                );
              })}
              {SOCIAL_LINKS.map(({ href, label }, index) => (
                <Link
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={menuIndex(NAV_ITEMS.length + 1 + index)}
                  className={cn(MENU_ROW, 'text-copy-14 font-medium text-muted-foreground')}
                  onClick={() => closeMenu(true)}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
