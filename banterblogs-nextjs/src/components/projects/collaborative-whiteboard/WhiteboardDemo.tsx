'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { Check, Circle, Download, Eraser, FileUp, Minus, MousePointer2, Plus, Redo2, RotateCcw, Square, Trash2, Type, Undo2 } from 'lucide-react';
import { BOARD_HEIGHT, BOARD_WIDTH, MAX_TRACE_BYTES, clearBoard, commit, createBoard, exportTrace, redo, restoreTrace, undo, type Shape, type ShapePatch, type ShapeType } from '@/lib/projects/collaborative-whiteboard/engine';
import { INITIAL_SHAPES } from '@/lib/projects/collaborative-whiteboard/fixtures';
import { clampMove, clampPoint, hitHandle, hitTest, makeShape, resizeShape, type Corner, type Point } from '@/lib/projects/collaborative-whiteboard/geometry';
import { renderBoard } from '@/lib/projects/collaborative-whiteboard/render';
import { createSessionStore } from '@/lib/projects/collaborative-whiteboard/store';
import styles from './whiteboard.module.css';

type Tool = 'select' | ShapeType;
type Gesture = {
  kind: 'draw' | 'move' | 'resize'; start: Point; shape: Shape;
  original?: Shape; corner?: Corner; pointerId: number;
};
const PALETTE = [
  { name: 'Mint', color: '#cfeee2' }, { name: 'Blue', color: '#dae9fc' },
  { name: 'Yellow', color: '#f5e6aa' }, { name: 'Rose', color: '#f4d6df' },
  { name: 'Ink', color: '#25343c' }, { name: 'White', color: '#ffffff' },
];
const TOOLS = [
  { id: 'select', name: 'Select tool', icon: MousePointer2 },
  { id: 'rectangle', name: 'Rectangle tool', icon: Square },
  { id: 'ellipse', name: 'Ellipse tool', icon: Circle },
  { id: 'line', name: 'Line tool', icon: Minus },
  { id: 'text', name: 'Text tool', icon: Type },
] as const;
const KEY_MOVE = 1;
const KEY_LARGE_MOVE = 10;

function IconButton({ label, children, onClick, disabled = false, pressed }: {
  label: string; children: ReactNode; onClick: () => void; disabled?: boolean; pressed?: boolean;
}) {
  return <button type="button" className={styles.iconButton} aria-label={label} title={label} aria-pressed={pressed} disabled={disabled} onClick={onClick}>{children}</button>;
}

function Properties({ shape, onApply }: { shape: Shape; onApply: (props: ShapePatch) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const props: ShapePatch = {};
    for (const key of ['x', 'y', 'width', 'height', 'strokeWidth'] as const) {
      const raw = String(data.get(key) ?? '').trim();
      props[key] = raw ? Number(raw) : NaN;
    }
    if (shape.type === 'text') { props.text = String(data.get('text') ?? ''); props.fontSize = Number(data.get('fontSize')); }
    onApply(props);
  }
  return (
    <form onSubmit={submit} className={styles.properties}>
      <div className={styles.propertyGrid}>
        {([
          ['x', 'X position'], ['y', 'Y position'], ['width', 'Width'], ['height', 'Height'], ['strokeWidth', 'Stroke width'],
        ] as const).map(([key, label]) => <label key={key}>{label}<input type="number" name={key} aria-label={label} defaultValue={shape[key]} step="any" required /></label>)}
        {shape.type === 'text' && <label>Font size<input type="number" name="fontSize" aria-label="Font size" defaultValue={shape.fontSize} min={12} max={48} required /></label>}
      </div>
      {shape.type === 'text' && <label>Text<textarea name="text" aria-label="Object text" defaultValue={shape.text} maxLength={300} rows={3} required /></label>}
      <button className={styles.command} type="submit" aria-label="Apply properties"><Check size={16} aria-hidden="true" />Apply</button>
    </form>
  );
}

export default function WhiteboardDemo() {
  const [store] = useState(() => createSessionStore());
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const board = snapshot.board;
  const [tool, setTool] = useState<Tool>('select');
  const [fill, setFill] = useState(PALETTE[0].color);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const [zoom, setZoom] = useState(1);
  const gestureRef = useRef<Gesture | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const selected = board.shapes.find((shape) => shape.id === selectedId) ?? null;
  const viewShapes = useMemo(() => {
    if (!gesture) return board.shapes;
    return gesture.kind === 'draw' ? [...board.shapes, gesture.shape] : board.shapes.map((shape) => shape.id === gesture.shape.id ? gesture.shape : shape);
  }, [board.shapes, gesture]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const redraw = () => {
      try { renderBoard(canvas, viewShapes, selectedId); }
      catch (error) { store.reportError(error instanceof Error ? error.message : 'Board drawing failed.', error); }
    };
    redraw();
    const observer = new ResizeObserver(redraw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [viewShapes, selectedId, store, zoom]);

  function setActiveGesture(next: Gesture | null) { gestureRef.current = next; setGesture(next); }
  function point(event: PointerEvent<HTMLCanvasElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return clampPoint({ x: (event.clientX - rect.left) / rect.width * BOARD_WIDTH, y: (event.clientY - rect.top) / rect.height * BOARD_HEIGHT });
  }
  function progress(active: Gesture, current: Point): Gesture {
    if (active.kind === 'draw') return { ...active, shape: makeShape(active.shape.type, active.start, current, active.shape.id, active.shape.fill) };
    const original = active.original!;
    if (active.kind === 'resize') return { ...active, shape: resizeShape(original, active.corner!, current) };
    return { ...active, shape: { ...original, ...clampMove(original, original.x + current.x - active.start.x, original.y + current.y - active.start.y) } };
  }
  function pointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (event.button !== 0 || event.isPrimary === false || gestureRef.current) return;
    event.preventDefault();
    event.currentTarget.focus();
    const start = point(event);
    if (tool === 'select') {
      const corner = selected ? hitHandle(selected, start) : null;
      const target = corner ? selected : hitTest(board.shapes, start.x, start.y, selectedId);
      setSelectedId(target?.id ?? null);
      if (!target) return;
      setActiveGesture({ kind: corner ? 'resize' : 'move', start, shape: target, original: target, pointerId: event.pointerId, ...(corner ? { corner } : {}) });
    } else {
      const shape = makeShape(tool, start, start, crypto.randomUUID(), tool === 'text' ? '#25343c' : fill);
      setSelectedId(shape.id);
      setActiveGesture({ kind: 'draw', start, shape, pointerId: event.pointerId });
    }
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const active = gestureRef.current;
    if (active && event.pointerId === active.pointerId) setActiveGesture(progress(active, point(event)));
  }
  function pointerUp(event: PointerEvent<HTMLCanvasElement>) {
    const active = gestureRef.current;
    if (!active || event.pointerId !== active.pointerId) return;
    const { shape } = progress(active, point(event));
    setActiveGesture(null);
    event.currentTarget.releasePointerCapture(event.pointerId);
    const accepted = store.dispatch((state) => commit(state, active.kind === 'draw' ? [{ kind: 'add', shape }] : [{ kind: 'update', shapeId: shape.id, props: { x: shape.x, y: shape.y, width: shape.width, height: shape.height } }]));
    if (accepted) { setSelectedId(shape.id); setTool('select'); }
  }
  function cancelGesture() { setActiveGesture(null); }
  function update(props: ShapePatch) {
    if (selected) store.dispatch((state) => commit(state, [{ kind: 'update', shapeId: selected.id, props }]));
  }
  function addObject() {
    if (tool === 'select') return;
    const offset = board.shapes.length % 5 * 20;
    const shape = makeShape(tool, { x: 300 + offset, y: 340 + offset }, { x: 470 + offset, y: 430 + offset }, crypto.randomUUID(), tool === 'text' ? '#25343c' : fill);
    if (store.dispatch((state) => commit(state, [{ kind: 'add', shape }]))) { setSelectedId(shape.id); setTool('select'); }
  }
  function deleteSelected() {
    if (selected && store.dispatch((state) => commit(state, [{ kind: 'delete', shapeId: selected.id }]))) setSelectedId(null);
  }
  function keyDown(event: KeyboardEvent<HTMLCanvasElement>) {
    const modifier = event.ctrlKey || event.metaKey;
    if (modifier && event.key.toLowerCase() === 'z') { event.preventDefault(); cancelGesture(); store.dispatch(event.shiftKey ? redo : undo); return; }
    if (modifier && event.key.toLowerCase() === 'y') { event.preventDefault(); cancelGesture(); store.dispatch(redo); return; }
    if (event.key === 'Escape') { cancelGesture(); setSelectedId(null); setTool('select'); return; }
    if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); deleteSelected(); return; }
    if (!selected || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const step = event.shiftKey ? KEY_LARGE_MOVE : KEY_MOVE;
    update(clampMove(selected, selected.x + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0), selected.y + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0)));
  }
  function download() {
    try {
      const url = URL.createObjectURL(new Blob([JSON.stringify(exportTrace(board), null, 2)], { type: 'application/json' }));
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = 'collaborative-whiteboard.trace.v1.json';
      document.body.append(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { store.reportError('JSON export failed. Try again or use the operation log to inspect your work.', error); }
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > MAX_TRACE_BYTES) throw new Error('Import a JSON trace at most 1 MB.');
      const restored = restoreTrace(JSON.parse(await file.text()));
      if (store.dispatch(() => restored)) { setSelectedId(null); cancelGesture(); }
    } catch (error) { store.reportError(`Import rejected: ${error instanceof Error ? error.message : 'Invalid JSON trace.'}`, error); }
    finally { if (importRef.current) importRef.current.value = ''; }
  }
  function reset() {
    if (!window.confirm('Replace this board and its operation history with the synthetic initial board? Export first to retain your work.')) return;
    store.dispatch(() => createBoard(INITIAL_SHAPES));
    setSelectedId(null); cancelGesture(); setTool('select');
  }
  return (
    <section id="demo" className={styles.demo} aria-label="Local whiteboard application">
      <div className={styles.statusBar}>
        <span className={styles.localBadge}>Local single-tab model</span>
        <span role="status">{snapshot.storage === 'saved' ? 'Saved on this device' : snapshot.storage === 'loading' ? 'Opening board' : 'In memory only'}</span>
        <span data-testid="object-count">{board.shapes.length} objects</span>
      </div>
      <div className={styles.toolbar}>
        <div className={styles.tools} role="group" aria-label="Drawing tools">
          {TOOLS.map(({ id, name, icon: Icon }) => <IconButton key={id} label={name} pressed={tool === id} onClick={() => { cancelGesture(); setTool(id); }}><Icon size={19} aria-hidden="true" /></IconButton>)}
        </div>
        <div className={styles.tools} role="group" aria-label="Fill colors">
          {PALETTE.map((swatch) => <button key={swatch.name} type="button" className={styles.swatch} style={{ backgroundColor: swatch.color }} title={`${swatch.name} fill`} aria-label={`${swatch.name} fill`} aria-pressed={(selected?.fill ?? fill) === swatch.color} onClick={() => { setFill(swatch.color); update({ fill: swatch.color }); }} />)}
        </div>
        <div className={styles.tools} role="group" aria-label="History and document commands">
          <IconButton label="Undo" disabled={!board.undo.length || !!gesture} onClick={() => store.dispatch(undo)}><Undo2 size={19} aria-hidden="true" /></IconButton>
          <IconButton label="Redo" disabled={!board.redo.length || !!gesture} onClick={() => store.dispatch(redo)}><Redo2 size={19} aria-hidden="true" /></IconButton>
          <IconButton label="Delete selected object" disabled={!selected || !!gesture} onClick={deleteSelected}><Trash2 size={18} aria-hidden="true" /></IconButton>
          <IconButton label="Clear board" disabled={!board.shapes.length || !!gesture} onClick={() => { store.dispatch(clearBoard); setSelectedId(null); }}><Eraser size={19} aria-hidden="true" /></IconButton>
          <IconButton label="Reset board" onClick={reset}><RotateCcw size={18} aria-hidden="true" /></IconButton>
          <IconButton label="Export JSON" disabled={!!gesture} onClick={download}><Download size={18} aria-hidden="true" /></IconButton>
          <IconButton label="Import JSON" onClick={() => importRef.current?.click()}><FileUp size={18} aria-hidden="true" /></IconButton>
        </div>
        <label className={styles.zoom}>Zoom<select aria-label="Board zoom" value={zoom} onChange={(event) => setZoom(Number(event.target.value))}><option value={1}>Fit</option><option value={1.5}>150%</option><option value={2}>200%</option><option value={3}>300%</option></select></label>
        <input ref={importRef} className={styles.fileInput} type="file" accept="application/json,.json" aria-label="Import trace file" onChange={(event) => void importFile(event.target.files?.[0])} />
      </div>
      {snapshot.error && <p className={styles.error} role="alert">{snapshot.error}</p>}
      <div className={styles.workspace}>
        <div className={styles.boardColumn}>
          <div className={styles.canvasViewport}>
            <div className={styles.canvasSize} style={{ width: `${zoom * 100}%` }}>
              <canvas ref={canvasRef} className={styles.canvas} width={BOARD_WIDTH} height={BOARD_HEIGHT} tabIndex={0} aria-label="Editable whiteboard" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={cancelGesture} onLostPointerCapture={cancelGesture} onKeyDown={keyDown} style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}>
                The editable object list and properties are available below.
              </canvas>
            </div>
          </div>
          <div className={styles.boardFooter}><span>{BOARD_WIDTH} x {BOARD_HEIGHT}</span><span>{gesture ? 'Uncommitted preview' : selected ? `${selected.type} selected` : 'No selection'}</span>
            <button type="button" className={styles.command} disabled={tool === 'select'} onClick={addObject}><Plus size={16} aria-hidden="true" />Add object</button>
          </div>
        </div>
        <aside className={styles.inspector} aria-label="Object inspector">
          <h2>Objects</h2>
          <ul className={styles.objectList}>{board.shapes.map((shape, index) => <li key={shape.id}><button type="button" aria-label={`Select ${shape.type} ${shape.id}`} aria-pressed={selectedId === shape.id} onClick={() => { cancelGesture(); setSelectedId(shape.id); setTool('select'); }}><span>{String(index + 1).padStart(2, '0')}</span><span>{shape.type === 'text' ? shape.text : shape.type}</span></button></li>)}</ul>
          <h2>Properties</h2>
          {selected ? <Properties key={`${selected.id}:${board.log.length}`} shape={selected} onApply={update} /> : <p className={styles.empty}>No object selected</p>}
        </aside>
      </div>
      <section className={styles.log} aria-label="Operation log">
        <div className={styles.logHeader}><h2>Operation log</h2><span data-testid="log-count">{board.log.length} {board.log.length === 1 ? 'command' : 'commands'}</span><span>{board.undo.length} undo / {board.redo.length} redo</span></div>
        {!board.log.length ? <p className={styles.empty}>No committed operations</p> : <ol className={styles.entries}>{board.log.slice().reverse().map((entry) => <li key={entry.seq}><details><summary><span>#{entry.seq}</span><strong>{entry.action}</strong><span>{entry.operations.length} {entry.operations.length === 1 ? 'operation' : 'operations'}</span></summary><pre>{JSON.stringify(entry.operations, null, 2)}</pre></details></li>)}</ol>}
      </section>
    </section>
  );
}
