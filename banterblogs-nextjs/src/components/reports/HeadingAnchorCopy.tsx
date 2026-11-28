'use client';

import { useEffect, useState } from 'react';
import { HEADING_ANCHOR_CLASS } from '@/lib/reports/headingAnchors';

// The report body's heading anchors (lib/reports/headingAnchors.ts) are plain
// links in the server HTML. Followed with a plain click or Enter, the jump
// stays the browser's own; this copies the section's absolute URL as well and
// confirms it: on the anchor (reading.css draws the word from the attribute)
// and in a live region. One listener for the page, on the document, since the
// body is one HTML string React does not render element by element.

/** how long the confirmation stays, as CopyButton's */
export const HEADING_LINK_FEEDBACK_MS = 2000;
/** the anchor's copy state, "copied" or "failed", while the confirmation shows */
export const COPY_STATE_ATTRIBUTE = 'data-copy';

type CopyState = 'copied' | 'failed';

const ANNOUNCEMENT: Record<CopyState, string> = {
  copied: 'Copied link to section',
  failed: 'Could not copy link to section',
};

// The anchor's own name never repeats its heading (headingAnchors.ts), so the
// confirmation says which section; the anchor holds no text, so its heading's
// text is the section's name.
function announce(anchor: Element, state: CopyState): string {
  const section = (anchor.parentElement?.textContent ?? '').replace(/\s+/g, ' ').trim();
  return section ? `${ANNOUNCEMENT[state]}: ${section}` : ANNOUNCEMENT[state];
}

export function HeadingAnchorCopy() {
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    let marked: Element | null = null;
    let reset: ReturnType<typeof setTimeout> | undefined;
    // the click being confirmed; an earlier click's late answer is dropped
    let latest = 0;

    const clear = () => {
      clearTimeout(reset);
      marked?.removeAttribute(COPY_STATE_ATTRIBUTE);
      marked = null;
      setAnnouncement('');
    };

    const confirm = (anchor: Element, state: CopyState) => {
      marked = anchor;
      anchor.setAttribute(COPY_STATE_ATTRIBUTE, state);
      setAnnouncement(announce(anchor, state));
      reset = setTimeout(clear, HEADING_LINK_FEEDBACK_MS);
    };

    const onClick = async (event: MouseEvent) => {
      // a modified click opens the link elsewhere; that is not a copy
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>(`a.${HEADING_ANCHOR_CLASS}`) : null;
      if (!anchor) return;
      const click = (latest += 1);
      clear();
      let state: CopyState = 'copied';
      try {
        // absent on an insecure origin, refused without permission
        await navigator.clipboard.writeText(anchor.href);
      } catch (error) {
        console.error('[HeadingAnchorCopy] clipboard write failed', error);
        state = 'failed';
      }
      if (click === latest) confirm(anchor, state);
    };

    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('click', onClick);
      // a pending answer finds a later click and writes nothing
      latest += 1;
      clearTimeout(reset);
      marked?.removeAttribute(COPY_STATE_ATTRIBUTE);
    };
  }, []);

  return (
    <span role="status" className="sr-only">
      {announcement}
    </span>
  );
}
