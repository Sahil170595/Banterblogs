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
  vi.stubGlobal('PointerEvent', MouseEvent);
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
  // icon buttons have no tooltip on touch, so their names show there (reading.css)
  it('gives every icon button its name as text that touch screens show', () => {
    render(<WhiteboardDemo />);
    for (const name of ['Select tool', 'Undo', 'Redo', 'Clear board', 'Reset board']) {
      const button = screen.getByRole('button', { name });
      expect(button.querySelector('.demo-icon-label')?.textContent).toBe(name);
    }
  });
});
