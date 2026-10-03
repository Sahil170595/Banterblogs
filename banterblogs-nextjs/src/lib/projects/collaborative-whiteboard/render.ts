// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Sahil Kadadekar. Shape rendering adapted for this local model.
import { BOARD_HEIGHT, BOARD_WIDTH, type Shape } from './engine';
import { bounds, HANDLE_SIZE, handles } from './geometry';

const GRID_STEP = 40;
const TEXT_LINE_HEIGHT = 1.3;
const TEXT_INSET = 4;
const PAPER = '#f8fafb';
const GRID_COLOR = '#e5e9ec';
// the site's ember (--primary, hsl 16 95% 53%), for the selection
const SELECTION_COLOR = '#f95215';

function drawShape(ctx: CanvasRenderingContext2D, shape: Shape) {
  ctx.save();
  ctx.fillStyle = shape.fill;
  ctx.strokeStyle = shape.stroke;
  ctx.lineWidth = shape.strokeWidth;
  if (shape.type === 'text') {
    const fontSize = shape.fontSize ?? 22;
    ctx.font = `${fontSize}px system-ui, sans-serif`;
    ctx.textBaseline = 'top';
    ctx.beginPath();
    ctx.rect(shape.x, shape.y, shape.width, shape.height);
    ctx.clip();
    const lines: string[] = [];
    for (const paragraph of (shape.text ?? '').split('\n')) {
      let line = '';
      for (const character of paragraph) {
        if (line && ctx.measureText(line + character).width > shape.width - TEXT_INSET * 2) {
          lines.push(line);
          line = character;
        } else line += character;
      }
      lines.push(line);
    }
    lines.forEach((line, index) => ctx.fillText(line, shape.x + TEXT_INSET, shape.y + TEXT_INSET + index * fontSize * TEXT_LINE_HEIGHT));
  } else if (shape.type === 'rectangle') {
    ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
    ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
  } else {
    ctx.beginPath();
    if (shape.type === 'ellipse') {
      ctx.ellipse(shape.x + shape.width / 2, shape.y + shape.height / 2, shape.width / 2, shape.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.moveTo(shape.x, shape.y);
      ctx.lineTo(shape.x + shape.width, shape.y + shape.height);
    }
    ctx.stroke();
  }
  ctx.restore();
}

export function renderBoard(canvas: HTMLCanvasElement, shapes: readonly Shape[], selectedId: string | null) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas drawing is unavailable in this browser. The object inspector and JSON export remain available.');
  ctx.setTransform(canvas.width / BOARD_WIDTH, 0, 0, canvas.height / BOARD_HEIGHT, 0, 0);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  for (let x = GRID_STEP; x < BOARD_WIDTH; x += GRID_STEP) { ctx.moveTo(x, 0); ctx.lineTo(x, BOARD_HEIGHT); }
  for (let y = GRID_STEP; y < BOARD_HEIGHT; y += GRID_STEP) { ctx.moveTo(0, y); ctx.lineTo(BOARD_WIDTH, y); }
  ctx.stroke();
  shapes.filter((shape) => shape.id !== selectedId).forEach((shape) => drawShape(ctx, shape));
  const selected = shapes.find((shape) => shape.id === selectedId);
  if (!selected) return;
  drawShape(ctx, selected);
  const box = bounds(selected);
  ctx.strokeStyle = SELECTION_COLOR;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(box.left - 4, box.top - 4, box.right - box.left + 8, box.bottom - box.top + 8);
  ctx.setLineDash([]);
  if (selected.type === 'line') return;
  for (const handle of handles(selected)) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(handle.x - HANDLE_SIZE / 2, handle.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
    ctx.strokeRect(handle.x - HANDLE_SIZE / 2, handle.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
  }
}
