'use client';

import { useEffect, useRef, useState } from 'react';
import { Copy, Check } from 'lucide-react';

const COPIED_FEEDBACK_MS = 2000;

interface CopyButtonProps {
  text: string;
  /** what is being copied, for the screen-reader label */
  label?: string;
}

/**
 * Shared copy-to-clipboard control. Extracted from Hero when the tool pages
 * needed the same affordance — one implementation, one feedback duration.
 */
export function CopyButton({ text, label = 'install command' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // clear on unmount so a pending reset never fires against a dead component
  useEffect(() => () => clearTimeout(timeout.current), []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      clearTimeout(timeout.current);
      timeout.current = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    } catch (error) {
      // clipboard is permission-gated and absent on insecure origins — say so
      // rather than leaving the button silently inert
      console.error('[CopyButton] clipboard write failed', error);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="text-muted-foreground transition-colors hover:text-primary"
      aria-label={copied ? `Copied ${label}` : `Copy ${label}`}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-400" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
