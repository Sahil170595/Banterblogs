'use client';

import { useEffect, useRef, useState } from 'react';
import { Copy, Check } from 'lucide-react';

const COPIED_FEEDBACK_MS = 2000;

type CopyState = 'idle' | 'copied' | 'failed';

// Both icons share one grid cell and cross-fade on the fast token.
const ICON_CLASS =
  'col-start-1 row-start-1 h-3.5 w-3.5 transition-[opacity,transform] duration-fast ease-standard';

interface CopyButtonProps {
  text: string;
  /** what is being copied, for the screen-reader label */
  label?: string;
}

/**
 * Shared copy-to-clipboard control — one implementation, one feedback duration.
 */
export function CopyButton({ text, label = 'install command' }: CopyButtonProps) {
  const [state, setState] = useState<CopyState>('idle');
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // clear on unmount so a pending reset never fires against a dead component
  useEffect(() => () => clearTimeout(timeout.current), []);

  const handleCopy = async () => {
    clearTimeout(timeout.current);
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch (error) {
      // clipboard is permission-gated and absent on insecure origins — say so
      // rather than leaving the button silently inert
      console.error('[CopyButton] clipboard write failed', error);
      setState('failed');
    }
    timeout.current = setTimeout(() => setState('idle'), COPIED_FEEDBACK_MS);
  };

  const copied = state === 'copied';
  const announcement = copied ? `Copied ${label}` : state === 'failed' ? `Could not copy ${label}` : '';

  return (
    <>
      <button
        type="button"
        onClick={handleCopy}
        // -m-2 p-2 grows the hit area to 30px without shifting layout: the 14px
        // icon alone failed WCAG 2.5.8's 24x24 minimum target size.
        className="-m-2 inline-grid place-items-center p-2 text-muted-foreground transition-colors duration-fast ease-standard hover:text-primary"
        aria-label={copied ? `Copied ${label}` : `Copy ${label}`}
      >
        <Copy aria-hidden="true" className={`${ICON_CLASS} ${copied ? 'scale-90 opacity-0' : 'scale-100 opacity-100'}`} />
        <Check
          aria-hidden="true"
          className={`${ICON_CLASS} text-emerald-400 ${copied ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}
        />
      </button>
      {/* a changed aria-label on the focused button is not reliably read out */}
      <span role="status" className="sr-only">
        {announcement}
      </span>
    </>
  );
}
