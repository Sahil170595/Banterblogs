import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { WhiteboardEditor as WhiteboardDemo } from './WhiteboardEditor';
import { createBoard, exportTrace } from '@/lib/projects/collaborative-whiteboard/engine';
import { INITIAL_SHAPES } from '@/lib/projects/collaborative-whiteboard/fixtures';
import { STORAGE_KEY } from '@/lib/projects/collaborative-whiteboard/store';

vi.mock('@/lib/projects/collaborative-whiteboard/render', () => ({ renderBoard: vi.fn() }));

const OPENING = `${INITIAL_SHAPES.length} objects`;
const ONE_MORE = `${INITIAL_SHAPES.length + 1} objects`;
const DRAFT = 'Select Rectangle (draft)';

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  // jsdom has no PointerEvent; this one carries the fields the editor reads
  vi.stubGlobal(
    'PointerEvent',
    class extends MouseEvent {
      pointerId: number;
      pointerType: string;
      isPrimary: boolean;
      constructor(type: string, init: ConstructorParameters<typeof MouseEvent>[1] & { pointerId?: number; pointerType?: string; isPrimary?: boolean } = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 1;
        this.pointerType = init.pointerType ?? 'mouse';
        this.isPrimary = init.isPrimary ?? true;
      }
    },
  );
  HTMLCanvasElement.prototype.setPointerCapture = vi.fn();
  HTMLCanvasElement.prototype.releasePointerCapture = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0, y: 0, left: 0, top: 0, right: 960, bottom: 600, width: 960, height: 600, toJSON: () => ({}),
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('editable whiteboard controls', () => {
  it('clears, undoes, redoes and resets the actual board', () => {
    render(<WhiteboardDemo />);
    expect(screen.getByTestId('object-count').textContent).toBe(OPENING);
    fireEvent.click(screen.getByRole('button', { name: 'Clear board' }));
    expect(screen.getByTestId('object-count').textContent).toBe('0 objects');
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByTestId('object-count').textContent).toBe(OPENING);
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(screen.getByTestId('object-count').textContent).toBe('0 objects');
    // the first press only arms the reset; the second replaces the board
    fireEvent.click(screen.getByRole('button', { name: 'Reset board' }));
    expect(screen.getByTestId('object-count').textContent).toBe('0 objects');
    fireEvent.click(screen.getByRole('button', { name: /Confirm reset/ }));
    expect(screen.getByTestId('object-count').textContent).toBe(OPENING);
    expect(screen.getByTestId('log-count').textContent).toBe('0 commands');
  });
  it('records a run of arrow-key nudges as one edit when the key is let go', () => {
    render(<WhiteboardDemo />);
    fireEvent.click(screen.getByRole('button', { name: DRAFT }));
    const canvas = screen.getByLabelText('Editable whiteboard');
    for (let i = 0; i < 5; i++) fireEvent.keyDown(canvas, { key: 'ArrowRight' });
    fireEvent.keyDown(canvas, { key: 'ArrowDown', shiftKey: true });
    expect(screen.getByTestId('log-count').textContent).toBe('0 commands');
    expect(screen.getByText(/selected at 95, 180/)).toBeTruthy();
    fireEvent.keyUp(canvas, { key: 'ArrowDown' });
    expect(screen.getByTestId('log-count').textContent).toBe('1 command');
    expect((screen.getByLabelText('X position') as HTMLInputElement).value).toBe('95');
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect((screen.getByLabelText('X position') as HTMLInputElement).value).toBe('90');
  });
  // re-review: picking an object in the list, or a colour, left focus off the
  // board, and the keys the instructions name did nothing
  it('takes the editing keys wherever focus is in the editor, not only on the board', () => {
    render(<WhiteboardDemo />);
    const item = screen.getByRole('button', { name: DRAFT });
    fireEvent.click(item);
    fireEvent.keyDown(item, { key: 'ArrowRight' });
    fireEvent.keyUp(item, { key: 'ArrowRight' });
    expect(screen.getByTestId('log-count').textContent).toBe('1 command');
    expect((screen.getByLabelText('X position') as HTMLInputElement).value).toBe('91');
    // the draft is mint; rose is a change
    const swatch = screen.getByRole('button', { name: 'Rose fill' });
    fireEvent.click(swatch);
    expect(screen.getByTestId('log-count').textContent).toBe('2 commands');
    expect(swatch.getAttribute('aria-pressed')).toBe('true');
    fireEvent.keyDown(swatch, { key: 'z', ctrlKey: true });
    expect(screen.getByRole('button', { name: 'Mint fill' }).getAttribute('aria-pressed')).toBe('true');
    // a field keeps its own keys: Backspace edits the number, not the board
    fireEvent.keyDown(screen.getByLabelText('X position'), { key: 'Backspace' });
    expect(screen.getByTestId('object-count').textContent).toBe(OPENING);
    fireEvent.keyDown(screen.getByRole('button', { name: DRAFT }), { key: 'Delete' });
    expect(screen.getByTestId('object-count').textContent).not.toBe(OPENING);
  });
  // review: the instructions were for screen readers only, and keyboard only
  it('shows how to use it, by pointer, touch and keyboard, and says it is this tab alone', () => {
    render(<WhiteboardDemo />);
    const canvas = screen.getByLabelText('Editable whiteboard');
    expect(canvas.getAttribute('aria-describedby')).toBe('whiteboard-keys whiteboard-selection');
    const keys = document.getElementById('whiteboard-keys')!;
    expect(keys.className).not.toMatch(/srOnly/);
    expect(keys.textContent).toMatch(/no second person or server/);
    expect(keys.textContent).toMatch(/tap/i);
    expect(keys.textContent).toMatch(/arrow keys nudge/);
    expect(screen.getByRole('region', { name: 'Try the editor' })).toBeTruthy();
    expect(document.getElementById('whiteboard-selection')?.textContent).toBe('No object selected');
  });
  it('names every object in the list in plain words', () => {
    render(<WhiteboardDemo />);
    expect(screen.getByRole('button', { name: DRAFT })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Select Ellipse (review)' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Select Text: Draft' })).toBeTruthy();
  });
  it('draws a rectangle with a pointer gesture and records one command', () => {
    render(<WhiteboardDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Rectangle tool' }));
    const canvas = screen.getByLabelText('Editable whiteboard');
    fireEvent.pointerDown(canvas, { clientX: 700, clientY: 400, button: 0 });
    fireEvent.pointerMove(canvas, { clientX: 850, clientY: 500 });
    fireEvent.pointerUp(canvas, { clientX: 850, clientY: 500 });
    expect(screen.getByTestId('object-count').textContent).toBe(ONE_MORE);
    expect(screen.getByTestId('log-count').textContent).toBe('1 command');
    expect(screen.getByRole('button', { name: 'Select Rectangle' })).toBeTruthy();
  });
  it('supports keyboard selection, property editing and inverse undo', () => {
    render(<WhiteboardDemo />);
    fireEvent.click(screen.getByRole('button', { name: DRAFT }));
    fireEvent.change(screen.getByLabelText('X position'), { target: { value: '120' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply properties' }));
    expect((screen.getByLabelText('X position') as HTMLInputElement).value).toBe('120');
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect((screen.getByLabelText('X position') as HTMLInputElement).value).toBe('90');
  });
  it('shows cancelled gestures as previews, not persisted operations', () => {
    render(<WhiteboardDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Rectangle tool' }));
    const canvas = screen.getByLabelText('Editable whiteboard');
    fireEvent.pointerDown(canvas, { clientX: 700, clientY: 400, button: 0 });
    fireEvent.pointerMove(canvas, { clientX: 850, clientY: 500 });
    fireEvent.pointerCancel(canvas);
    expect(screen.getByTestId('object-count').textContent).toBe(OPENING);
    expect(screen.getByTestId('log-count').textContent).toBe('0 commands');
  });
  it('drags an object and undoes its single committed move', () => {
    render(<WhiteboardDemo />);
    const canvas = screen.getByLabelText('Editable whiteboard');
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 180, button: 0 });
    fireEvent.pointerMove(canvas, { clientX: 140, clientY: 200 });
    fireEvent.pointerUp(canvas, { clientX: 140, clientY: 200 });
    expect((screen.getByLabelText('X position') as HTMLInputElement).value).toBe('130');
    expect((screen.getByLabelText('Y position') as HTMLInputElement).value).toBe('190');
    expect(screen.getByTestId('log-count').textContent).toBe('1 command');
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect((screen.getByLabelText('X position') as HTMLInputElement).value).toBe('90');
  });
  // review: a drag left "201.800009…" in the X field
  it('commits a drag that ends between board units in whole units', () => {
    render(<WhiteboardDemo />);
    const canvas = screen.getByLabelText('Editable whiteboard');
    fireEvent.pointerDown(canvas, { clientX: 100.3, clientY: 180.2, button: 0 });
    fireEvent.pointerUp(canvas, { clientX: 211.8000091, clientY: 200.4 });
    expect((screen.getByLabelText('X position') as HTMLInputElement).value).toBe('202');
    expect((screen.getByLabelText('Y position') as HTMLInputElement).value).toBe('190');
  });
  it('shows a saved board’s fractional coordinates rounded', () => {
    const draft = INITIAL_SHAPES.find((shape) => shape.id === 'draft')!;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(exportTrace(createBoard([{ ...draft, x: 201.8000091 }]))));
    render(<WhiteboardDemo />);
    fireEvent.click(screen.getByRole('button', { name: DRAFT }));
    expect((screen.getByLabelText('X position') as HTMLInputElement).value).toBe('201.8');
  });
  it('resizes a selected rectangle through its actual corner handle', () => {
    render(<WhiteboardDemo />);
    fireEvent.click(screen.getByRole('button', { name: DRAFT }));
    const canvas = screen.getByLabelText('Editable whiteboard');
    fireEvent.pointerDown(canvas, { clientX: 290, clientY: 290, button: 0 });
    fireEvent.pointerUp(canvas, { clientX: 340, clientY: 330 });
    expect((screen.getByLabelText('Width') as HTMLInputElement).value).toBe('250');
    expect((screen.getByLabelText('Height') as HTMLInputElement).value).toBe('160');
  });
  it('rejects invalid properties without changing the object', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<WhiteboardDemo />);
    fireEvent.click(screen.getByRole('button', { name: DRAFT }));
    fireEvent.change(screen.getByLabelText('X position'), { target: { value: '-100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply properties' }));
    expect(screen.getByRole('alert').textContent).toMatch(/inside/i);
    expect(screen.getByTestId('log-count').textContent).toBe('0 commands');
  });
  it('supports keyboard-only creation, deletion and inverse undo', () => {
    render(<WhiteboardDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Ellipse tool' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add object' }));
    expect(screen.getByTestId('object-count').textContent).toBe(ONE_MORE);
    fireEvent.keyDown(screen.getByLabelText('Editable whiteboard'), { key: 'Delete' });
    expect(screen.getByTestId('object-count').textContent).toBe(OPENING);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByTestId('object-count').textContent).toBe(ONE_MORE);
  });
  it('keeps the operation log, export and import under the hood, closed at first', () => {
    render(<WhiteboardDemo />);
    const details = screen.getByText(/Under the hood/).closest('details')!;
    expect(details.open).toBe(false);
    expect(details.textContent).toMatch(/Operation log/);
    expect(details.querySelector('button')?.textContent).toMatch(/Export JSON/);
    fireEvent.click(screen.getByRole('button', { name: 'Clear board' }));
    expect(details.textContent).toContain(`#1 clear · deleted ${INITIAL_SHAPES.length} objects`);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    fireEvent.click(screen.getByRole('button', { name: DRAFT }));
    fireEvent.keyDown(screen.getByLabelText('Editable whiteboard'), { key: 'ArrowRight' });
    fireEvent.keyUp(screen.getByLabelText('Editable whiteboard'), { key: 'ArrowRight' });
    expect(details.textContent).toContain('#3 edit · moved Rectangle (draft)');
  });
  // live QA: focusing a board partly below the fold scrolled the page mid-press,
  // and the shape landed where the pointer had been, not where it was
  it('takes focus on a press without scrolling the page', () => {
    const focus = vi.spyOn(HTMLCanvasElement.prototype, 'focus');
    render(<WhiteboardDemo />);
    fireEvent.pointerDown(screen.getByLabelText('Editable whiteboard'), { clientX: 700, clientY: 400, button: 0 });
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });
  // live QA: a drawn shape stayed selected, so the colour picked for the next one recoloured it
  it('clears the selection when a drawing tool is picked, so a colour is for the next shape', () => {
    render(<WhiteboardDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Rectangle tool' }));
    const canvas = screen.getByLabelText('Editable whiteboard');
    fireEvent.pointerDown(canvas, { clientX: 700, clientY: 400, button: 0 });
    fireEvent.pointerUp(canvas, { clientX: 850, clientY: 500 });
    fireEvent.click(screen.getByRole('button', { name: 'Ellipse tool' }));
    fireEvent.click(screen.getByRole('button', { name: 'Blue fill' }));
    expect(screen.getByTestId('log-count').textContent).toBe('1 command');
    expect(document.getElementById('whiteboard-selection')?.textContent).toBe('No object selected');
  });
  // live QA: deleting from the list or the toolbar dropped focus to the page, and Control Z did nothing
  it('keeps focus in the editor after a delete or a clear, so undo works at once', () => {
    render(<WhiteboardDemo />);
    const canvas = screen.getByLabelText('Editable whiteboard');
    fireEvent.click(screen.getByRole('button', { name: DRAFT }));
    fireEvent.keyDown(screen.getByRole('button', { name: DRAFT }), { key: 'Delete' });
    expect(document.activeElement).toBe(canvas);
    fireEvent.keyDown(document.activeElement!, { key: 'z', ctrlKey: true });
    expect(screen.getByTestId('object-count').textContent).toBe(OPENING);
    fireEvent.click(screen.getByRole('button', { name: 'Clear board' }));
    expect(document.activeElement).toBe(canvas);
  });
  // live QA: a refusal showed above the board, kept the bad value in the field and
  // refused the next valid edit with it
  it('refuses a bad property beside the fields, puts the real values back, and takes the next edit', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<WhiteboardDemo />);
    fireEvent.click(screen.getByRole('button', { name: DRAFT }));
    fireEvent.change(screen.getByLabelText('X position'), { target: { value: '-50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply properties' }));
    const inspector = screen.getByRole('complementary', { name: 'Object inspector' });
    expect(inspector.querySelector('[role="alert"]')?.textContent).toMatch(/inside/i);
    expect((screen.getByLabelText('X position') as HTMLInputElement).value).toBe('90');
    fireEvent.change(screen.getByLabelText('Stroke width'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply properties' }));
    expect(screen.getByTestId('log-count').textContent).toBe('1 command');
    expect(inspector.querySelector('[role="alert"]')).toBeNull();
  });
  // live QA: a drag logged "changed x, y, width, height"; an edit of one field sent all five
  it('records only the fields an edit changed', () => {
    render(<WhiteboardDemo />);
    const details = screen.getByText(/Under the hood/).closest('details')!;
    const canvas = screen.getByLabelText('Editable whiteboard');
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 180, button: 0 });
    fireEvent.pointerUp(canvas, { clientX: 140, clientY: 200 });
    expect(details.textContent).toContain('#1 edit · moved Rectangle (draft)');
    fireEvent.change(screen.getByLabelText('Width'), { target: { value: '220' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply properties' }));
    expect(details.textContent).toContain('#2 edit · changed width of Rectangle (draft)');
  });
  it('lets Escape cancel an armed reset', () => {
    render(<WhiteboardDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Reset board' }));
    fireEvent.keyDown(screen.getByRole('button', { name: /Confirm reset/ }), { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Reset board' })).toBeTruthy();
  });
  // live QA: lines draw in ink and text in its fill, so a pastel swatch did nothing to a
  // line and made text unreadable
  it('offers fill colours only for shapes that have a fill', () => {
    render(<WhiteboardDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Select Text: Draft' }));
    expect(screen.getByRole('button', { name: 'Rose fill' }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Line tool' }));
    expect(screen.getByRole('button', { name: 'Rose fill' }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Ellipse tool' }));
    expect(screen.getByRole('button', { name: 'Rose fill' }).hasAttribute('disabled')).toBe(false);
  });
  // live QA: a zoomed board could not be panned by touch on a phone
  it('pans a zoomed board with a touch drag on empty board', () => {
    render(<WhiteboardDemo />);
    fireEvent.change(screen.getByLabelText('Board zoom'), { target: { value: '2' } });
    const canvas = screen.getByLabelText('Editable whiteboard');
    const viewport = canvas.parentElement!.parentElement!;
    Object.defineProperties(viewport, { scrollWidth: { value: 1920 }, clientWidth: { value: 960 }, scrollHeight: { value: 1200 }, clientHeight: { value: 600 } });
    fireEvent.pointerDown(canvas, { clientX: 900, clientY: 560, button: 0, pointerType: 'touch' });
    fireEvent.pointerMove(canvas, { clientX: 700, clientY: 460, pointerType: 'touch' });
    fireEvent.pointerUp(canvas, { clientX: 700, clientY: 460, pointerType: 'touch' });
    expect(viewport.scrollLeft).toBe(200);
    expect(viewport.scrollTop).toBe(100);
    expect(screen.getByTestId('log-count').textContent).toBe('0 commands');
  });
  // icon buttons have no tooltip on touch, so their names show there (reading.css)
  it('gives every icon button its name as text that touch screens show', () => {
    render(<WhiteboardDemo />);
    for (const name of ['Select tool', 'Undo', 'Redo', 'Clear board', 'Reset board']) {
      const button = screen.getByRole('button', { name });
      expect(button.querySelector('.demo-icon-label')?.textContent).toBe(name);
    }
  });
});
