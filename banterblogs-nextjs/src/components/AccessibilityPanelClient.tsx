'use client';

import { useCallback, useRef, useState, type ComponentType } from 'react';
import type { AccessibilityPanelProps } from './AccessibilityPanel';

// Footer "Reader settings" launcher. The panel module is fetched on intent
// (pointer enter / focus) or by the click itself — never on page load — and
// stays mounted once loaded so its CSS open/close transition can run.

const PANEL_ID = 'reader-settings';

type PanelComponent = ComponentType<AccessibilityPanelProps>;
let panelModule: Promise<PanelComponent> | null = null;

function loadPanel(): Promise<PanelComponent> {
  panelModule ??= import('./AccessibilityPanel').then(
    (module) => module.AccessibilityPanel,
    (error: unknown) => {
      panelModule = null; // the next intent retries
      throw error;
    },
  );
  return panelModule;
}

export function ReaderSettingsLauncher() {
  const [Panel, setPanel] = useState<PanelComponent | null>(null);
  const [open, setOpen] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);

  const preload = useCallback(() => {
    loadPanel()
      .then((component) => setPanel(() => component))
      .catch((error: unknown) => console.error('[reader-settings] panel failed to load', error));
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    launcherRef.current?.focus();
  }, []);

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        onPointerEnter={preload}
        onFocus={preload}
        onClick={() => {
          preload();
          setOpen((wasOpen) => !wasOpen);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={Panel ? PANEL_ID : undefined}
        className="transition hover:text-primary"
      >
        Reader settings
      </button>
      {Panel && <Panel id={PANEL_ID} open={open} onClose={close} />}
    </>
  );
}
