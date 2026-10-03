import { afterEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_SHAPES } from './fixtures';
import { renderBoard } from './render';

afterEach(() => vi.restoreAllMocks());
function drawingSurface() {
  const context = {
    save: vi.fn(), restore: vi.fn(), setTransform: vi.fn(), fillRect: vi.fn(), strokeRect: vi.fn(),
    beginPath: vi.fn(), rect: vi.fn(), clip: vi.fn(), fillText: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 12 })), ellipse: vi.fn(), fill: vi.fn(),
    moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), setLineDash: vi.fn(),
  };
  const canvas = document.createElement('canvas');
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ width: 480, height: 300 } as DOMRect);
  vi.spyOn(canvas, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
  return { canvas, context };
}
describe('scene drawing without fabricated state', () => {
  it('draws model coordinates, ellipses and line endpoints on the scaled surface', () => {
    const { canvas, context } = drawingSurface();
    renderBoard(canvas, INITIAL_SHAPES, null);
    expect(context.fillRect).toHaveBeenCalledWith(90, 170, 200, 120);
    expect(context.ellipse).toHaveBeenCalledWith(480, 230, 100, 60, 0, 0, Math.PI * 2);
    expect(context.lineTo).toHaveBeenCalledWith(370, 230);
    expect(context.fillText).toHaveBeenCalledWith('Draft', 129, 212);
    expect(context.setTransform).toHaveBeenCalledWith(canvas.width / 960, 0, 0, canvas.height / 600, 0, 0);
  });
  it('paints the selected shape last to agree with hit-testing', () => {
    const { canvas, context } = drawingSurface();
    renderBoard(canvas, INITIAL_SHAPES, 'draft');
    const fills = context.fillRect.mock.calls;
    const selectedFill = fills.findIndex(([x, y, w]) => x === 90 && y === 170 && w === 200);
    const otherFill = fills.findIndex(([x]) => x === 670);
    expect(selectedFill).toBeGreaterThan(otherFill);
    expect(context.setLineDash).toHaveBeenCalledWith([6, 4]);
  });
  it('clips and wraps text rather than drawing beyond its object bounds', () => {
    const { canvas, context } = drawingSurface();
    const shape = { ...INITIAL_SHAPES[5], width: 36, height: 80, text: 'ABCDE' };
    renderBoard(canvas, [shape], null);
    expect(context.rect).toHaveBeenCalledWith(shape.x, shape.y, 36, 80);
    expect(context.clip).toHaveBeenCalled();
    expect(context.fillText.mock.calls.map(([text]) => text)).toEqual(['AB', 'CD', 'E']);
  });
  it('reports an unavailable drawing context', () => {
    const { canvas } = drawingSurface();
    vi.mocked(canvas.getContext).mockReturnValue(null);
    expect(() => renderBoard(canvas, INITIAL_SHAPES, null)).toThrow(/drawing is unavailable/i);
  });
});
