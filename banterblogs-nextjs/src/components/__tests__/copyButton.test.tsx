import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CopyButton } from '../CopyButton';

// CopyButton's confirmation window
const FEEDBACK_MS = 2000;
const LABEL = 'quantfit install command';

let writeText: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  writeText = vi.fn(async () => undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, 'clipboard');
});

// [copy icon, check icon]; SVG className is not a string, so read the attribute
const iconClasses = (button: HTMLElement) =>
  [...button.querySelectorAll('svg')].map((svg) => (svg.getAttribute('class') ?? '').split(/\s+/));

describe('copy button', () => {
  it('cross-fades copy to check on the fast token, says Copied and announces it politely', async () => {
    render(<CopyButton text="pip install quantfit" label={LABEL} />);
    const button = screen.getByRole('button', { name: `Copy ${LABEL}` });
    const status = screen.getByRole('status');
    const faded = ['opacity-0', 'scale-90'];
    const shown = ['opacity-100', 'scale-100'];
    const tokens = ['transition-[opacity,transform]', 'duration-fast', 'ease-standard'];

    let [copyIcon, checkIcon] = iconClasses(button);
    expect(copyIcon).toEqual(expect.arrayContaining([...shown, ...tokens]));
    expect(checkIcon).toEqual(expect.arrayContaining([...faded, ...tokens]));
    expect(status.textContent).toBe('');

    await act(async () => {
      fireEvent.click(button);
    });

    expect(writeText).toHaveBeenCalledWith('pip install quantfit');
    expect(button.getAttribute('aria-label')).toBe(`Copied ${LABEL}`);
    expect(status.textContent).toBe(`Copied ${LABEL}`);
    [copyIcon, checkIcon] = iconClasses(button);
    expect(copyIcon).toEqual(expect.arrayContaining(faded));
    expect(checkIcon).toEqual(expect.arrayContaining(shown));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(FEEDBACK_MS);
    });

    expect(button.getAttribute('aria-label')).toBe(`Copy ${LABEL}`);
    expect(status.textContent).toBe('');
  });

  it('announces a failed copy instead of staying silent', async () => {
    writeText.mockRejectedValueOnce(new DOMException('denied', 'NotAllowedError'));
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<CopyButton text="pip install quantfit" label={LABEL} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: `Copy ${LABEL}` }));
    });

    expect(screen.getByRole('status').textContent).toBe(`Could not copy ${LABEL}`);
    expect(screen.getByRole('button', { name: `Copy ${LABEL}` })).toBeTruthy();
    expect(error).toHaveBeenCalledWith('[CopyButton] clipboard write failed', expect.any(DOMException));
  });
});
