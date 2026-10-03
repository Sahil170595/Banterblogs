import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import WhiteboardDemo from './WhiteboardDemo';

vi.mock('@/lib/projects/collaborative-whiteboard/render', () => ({ renderBoard: vi.fn() }));

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
    expect(screen.getByTestId('object-count').textContent).toBe('10 objects');
    fireEvent.click(screen.getByRole('button', { name: 'Clear board' }));
    expect(screen.getByTestId('object-count').textContent).toBe('0 objects');
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByTestId('object-count').textContent).toBe('10 objects');
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(screen.getByTestId('object-count').textContent).toBe('0 objects');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Reset board' }));
    expect(screen.getByTestId('object-count').textContent).toBe('10 objects');
    expect(screen.getByTestId('log-count').textContent).toBe('0 commands');
  });
  it('draws a rectangle with a pointer gesture and records one command', () => {
    render(<WhiteboardDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Rectangle tool' }));
    const canvas = screen.getByLabelText('Editable whiteboard');
    fireEvent.pointerDown(canvas, { clientX: 700, clientY: 400, button: 0 });
    fireEvent.pointerMove(canvas, { clientX: 850, clientY: 500 });
    fireEvent.pointerUp(canvas, { clientX: 850, clientY: 500 });
    expect(screen.getByTestId('object-count').textContent).toBe('11 objects');
    expect(screen.getByTestId('log-count').textContent).toBe('1 command');
  });
  it('supports keyboard selection, property editing and inverse undo', () => {
    render(<WhiteboardDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Select rectangle draft' }));
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
    expect(screen.getByTestId('object-count').textContent).toBe('10 objects');
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
  it('resizes a selected rectangle through its actual corner handle', () => {
    render(<WhiteboardDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Select rectangle draft' }));
    const canvas = screen.getByLabelText('Editable whiteboard');
    fireEvent.pointerDown(canvas, { clientX: 290, clientY: 290, button: 0 });
    fireEvent.pointerUp(canvas, { clientX: 340, clientY: 330 });
    expect((screen.getByLabelText('Width') as HTMLInputElement).value).toBe('250');
    expect((screen.getByLabelText('Height') as HTMLInputElement).value).toBe('160');
  });
  it('rejects invalid properties without changing the object', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<WhiteboardDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Select rectangle draft' }));
    fireEvent.change(screen.getByLabelText('X position'), { target: { value: '-100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply properties' }));
    expect(screen.getByRole('alert').textContent).toMatch(/inside/i);
    expect(screen.getByTestId('log-count').textContent).toBe('0 commands');
  });
  it('supports keyboard-only creation, deletion and inverse undo', () => {
    render(<WhiteboardDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Ellipse tool' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add object' }));
    expect(screen.getByTestId('object-count').textContent).toBe('11 objects');
    fireEvent.keyDown(screen.getByLabelText('Editable whiteboard'), { key: 'Delete' });
    expect(screen.getByTestId('object-count').textContent).toBe('10 objects');
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByTestId('object-count').textContent).toBe('11 objects');
  });
});
