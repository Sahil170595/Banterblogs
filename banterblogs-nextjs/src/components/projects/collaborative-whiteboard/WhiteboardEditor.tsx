'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { Check, Circle, Download, Eraser, FileUp, Minus, MousePointer2, Plus, Redo2, RotateCcw, Square, Trash2, Type, Undo2 } from 'lucide-react';
import { BOARD_HEIGHT, BOARD_WIDTH, MAX_TRACE_BYTES, clearBoard, commit, createBoard, exportTrace, redo, restoreTrace, undo, type LogEntry, type Operation, type Shape, type ShapePatch, type ShapeType } from '@/lib/projects/collaborative-whiteboard/engine';
import { INITIAL_SHAPES } from '@/lib/projects/collaborative-whiteboard/fixtures';
import { clampMove, clampPoint, hitHandle, hitTest, makeShape, resizeShape, type Corner, type Point } from '@/lib/projects/collaborative-whiteboard/geometry';
import { renderBoard } from '@/lib/projects/collaborative-whiteboard/render';
import { createSessionStore } from '@/lib/projects/collaborative-whiteboard/store';
import { controls, UnderTheHood } from '../controls';
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
const ARROWS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
// a held arrow key previews like a drag; this marks that gesture as the keyboard's
const NUDGE_POINTER = -1;
// how long the reset button waits for its confirming second press
const RESET_CONFIRM_MS = 4000;
// a saved board can hold fractional coordinates; the properties show them to this many places
const PROPERTY_DECIMALS = 2;
// fixture ids are readable words; a drawn object's id is a UUID, not a name
const READABLE_ID = /^[a-z]+(?:-[a-z]+)*$/;
const TYPE_NAMES: Record<ShapeType, string> = { rectangle: 'Rectangle', ellipse: 'Ellipse', line: 'Line', text: 'Text' };

/** an object as the list names it: a text by its first line, a shape by its type and readable id */
function shapeName(shape: Shape): string {
  if (shape.type === 'text') return `${TYPE_NAMES.text}: ${(shape.text ?? '').split('\n')[0]}`;
  return READABLE_ID.test(shape.id) ? `${TYPE_NAMES[shape.type]} (${shape.id})` : TYPE_NAMES[shape.type];
}

/** one log entry's operations in words, naming objects the board still or once held */
function describeEntry(entry: LogEntry, shapes: readonly Shape[]): string {
  const name = (op: Operation) => {
    const shape = op.kind === 'add' ? op.shape : shapes.find((s) => s.id === op.shapeId);
    return shape ? shapeName(shape) : 'an object';
  };
  const [first] = entry.operations;
  if (entry.operations.length > 1) {
    const verb = entry.operations.every((op) => op.kind === 'delete') ? 'deleted' : entry.operations.every((op) => op.kind === 'add') ? 'added' : 'changed';
    return `${verb} ${entry.operations.length} objects`;
  }
  if (first.kind === 'add') return `added ${name(first)}`;
  if (first.kind === 'delete') return `deleted ${name(first)}`;
  const fields = Object.keys(first.props);
  const moved = fields.every((field) => field === 'x' || field === 'y');
  return `${moved ? 'moved' : `changed ${fields.join(', ')} of`} ${name(first)}`;
}

const shown = (value: number) => Number(value.toFixed(PROPERTY_DECIMALS));

function IconButton({ label, children, onClick, disabled = false, pressed }: {
  label: string; children: ReactNode; onClick: () => void; disabled?: boolean; pressed?: boolean;
}) {
  return (
    <button type="button" className={styles.iconButton} aria-label={label} title={label} aria-pressed={pressed} disabled={disabled} onClick={onClick}>
      {children}
      <span className={controls.iconLabel}>{label}</span>
    </button>
  );
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
        ] as const).map(([key, label]) => <label key={key}>{label}<input type="number" name={key} aria-label={label} defaultValue={shown(shape[key])} step="any" required /></label>)}
        {shape.type === 'text' && <label>Font size<input type="number" name="fontSize" aria-label="Font size" defaultValue={shape.fontSize} min={12} max={48} required /></label>}
      </div>
      {shape.type === 'text' && <label>Text<textarea name="text" aria-label="Object text" defaultValue={shape.text} maxLength={300} rows={3} required /></label>}
      <button className={styles.command} type="submit" aria-label="Apply properties"><Check size={16} aria-hidden="true" />Apply</button>
    </form>
  );
}

export function WhiteboardEditor() {
  const [store] = useState(() => createSessionStore());
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const board = snapshot.board;
  const [tool, setTool] = useState<Tool>('select');
  const [fill, setFill] = useState(PALETTE[0].color);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const [zoom, setZoom] = useState(1);
  const [confirmReset, setConfirmReset] = useState(false);
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
  // a pointer lands in whole board units, so a drag commits whole coordinates
  function point(event: PointerEvent<HTMLCanvasElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return clampPoint({
      x: Math.round((event.clientX - rect.left) / rect.width * BOARD_WIDTH),
      y: Math.round((event.clientY - rect.top) / rect.height * BOARD_HEIGHT),
    });
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
    const committed = store.dispatch((state) => commit(state, active.kind === 'draw' ? [{ kind: 'add', shape }] : [{ kind: 'update', shapeId: shape.id, props: { x: shape.x, y: shape.y, width: shape.width, height: shape.height } }]));
    if (committed) { setSelectedId(shape.id); setTool('select'); }
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
    if (!selected || !ARROWS.includes(event.key)) return;
    event.preventDefault();
    // held or repeated arrows extend one preview; letting go commits it as one edit
    const active = gestureRef.current;
    const base: Gesture = active?.pointerId === NUDGE_POINTER ? active : { kind: 'move', start: { x: 0, y: 0 }, shape: selected, original: selected, pointerId: NUDGE_POINTER };
    if (active && active.pointerId !== NUDGE_POINTER) return;
    const step = event.shiftKey ? KEY_LARGE_MOVE : KEY_MOVE;
    const dx = event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0;
    const dy = event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0;
    setActiveGesture({ ...base, shape: { ...base.shape, ...clampMove(base.shape, base.shape.x + dx, base.shape.y + dy) } });
  }
  function commitNudge() {
    const active = gestureRef.current;
    if (!active || active.pointerId !== NUDGE_POINTER) return;
    setActiveGesture(null);
    const { shape, original } = active;
    if (original && (shape.x !== original.x || shape.y !== original.y)) update({ x: shape.x, y: shape.y });
  }
  function keyUp(event: KeyboardEvent<HTMLCanvasElement>) {
    if (ARROWS.includes(event.key)) commitNudge();
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
      if (store.dispatch(() => restored, { replaceStored: true })) { setSelectedId(null); cancelGesture(); }
    } catch (error) { store.reportError(`Import rejected: ${error instanceof Error ? error.message : 'Invalid JSON trace.'}`, error); }
    finally { if (importRef.current) importRef.current.value = ''; }
  }
  // a second press confirms; the first only arms it for a few seconds
  useEffect(() => {
    if (!confirmReset) return;
    const timer = window.setTimeout(() => setConfirmReset(false), RESET_CONFIRM_MS);
    return () => window.clearTimeout(timer);
  }, [confirmReset]);
  function reset() {
    if (!confirmReset) { setConfirmReset(true); return; }
    setConfirmReset(false);
    store.dispatch(() => createBoard(INITIAL_SHAPES), { replaceStored: true });
    setSelectedId(null); cancelGesture(); setTool('select');
  }
  const known = [...board.shapes, ...board.initialShapes];
  return (
    <section className={styles.editor} aria-labelledby="whiteboard-editor-title">
      <h3 id="whiteboard-editor-title" className={styles.editorTitle}>Try the editor</h3>
      <p id="whiteboard-keys" className={controls.lead}>
        An adaptation of Sceneledger&apos;s drawing editor, running in this tab alone: there is no second person or server here, and
        the board is saved in this browser. Click or tap an object, or pick it in the list, then drag it to move it or drag a corner to
        resize it; pick a colour to recolour it. Each object moves on its own: the editor has no groups, so a caption stays put when
        its shape moves. On a keyboard, arrow keys nudge the selected object, ten units with Shift, and letting go
        records the nudges as one edit; Delete removes it, Control Z undoes and Control Y redoes.
      </p>
      <div id="whiteboard-editor" className={styles.demo}>
      <div className={styles.statusBar}>
        <span className={styles.localBadge}>This tab only</span>
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
          <button type="button" className={confirmReset ? styles.command : styles.iconButton} aria-label={confirmReset ? 'Confirm reset: replace the board and its history' : 'Reset board'} title={confirmReset ? 'Press again to replace the board and its history' : 'Reset board'} onClick={reset} data-armed={confirmReset || undefined}>
            <RotateCcw size={18} aria-hidden="true" />{confirmReset ? 'Replace the board?' : <span className={controls.iconLabel}>Reset board</span>}
          </button>
        </div>
        <label className={styles.zoom}>Zoom<select aria-label="Board zoom" value={zoom} onChange={(event) => setZoom(Number(event.target.value))}><option value={1}>Fit</option><option value={1.5}>150%</option><option value={2}>200%</option><option value={3}>300%</option></select></label>
      </div>
      {snapshot.error && <p className={styles.error} role="alert">{snapshot.error}</p>}
      <div className={styles.workspace}>
        <div className={styles.boardColumn}>
          <div className={styles.canvasViewport}>
            <div className={styles.canvasSize} style={{ width: `${zoom * 100}%` }}>
              <canvas ref={canvasRef} className={styles.canvas} width={BOARD_WIDTH} height={BOARD_HEIGHT} tabIndex={0} aria-label="Editable whiteboard" aria-describedby="whiteboard-keys whiteboard-selection" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={cancelGesture} onLostPointerCapture={cancelGesture} onKeyDown={keyDown} onKeyUp={keyUp} onBlur={commitNudge} style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}>
                The editable object list and properties are available below.
              </canvas>
              <p id="whiteboard-selection" className={styles.srOnly} aria-live="polite">
                {selected ? `${shapeName(selected)} selected at ${Math.round((gesture?.shape.id === selected.id ? gesture.shape : selected).x)}, ${Math.round((gesture?.shape.id === selected.id ? gesture.shape : selected).y)}` : 'No object selected'}
              </p>
            </div>
          </div>
          <div className={styles.boardFooter}><span>{BOARD_WIDTH} x {BOARD_HEIGHT}</span><span>{gesture ? 'Uncommitted preview' : selected ? `${shapeName(selected)} selected` : 'No selection'}</span>
            <button type="button" className={styles.command} disabled={tool === 'select'} onClick={addObject}><Plus size={16} aria-hidden="true" />Add object</button>
          </div>
        </div>
        <aside className={styles.inspector} aria-label="Object inspector">
          <h4>Objects</h4>
          <ul className={styles.objectList}>{board.shapes.map((shape, index) => <li key={shape.id}><button type="button" aria-label={`Select ${shapeName(shape)}`} aria-pressed={selectedId === shape.id} onClick={() => { cancelGesture(); setSelectedId(shape.id); setTool('select'); }}><span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><span>{shapeName(shape)}</span></button></li>)}</ul>
          <h4>Properties</h4>
          {selected ? <Properties key={`${selected.id}:${board.log.length}`} shape={selected} onApply={update} /> : <p className={styles.empty}>No object selected</p>}
        </aside>
      </div>
      </div>
      <UnderTheHood summary="Under the hood: operation log, export and import">
        <section className={styles.log} aria-label="Operation log">
          <div className={styles.logHeader}><h4>Operation log</h4><span data-testid="log-count">{board.log.length} {board.log.length === 1 ? 'command' : 'commands'}</span><span>{board.undo.length} undo / {board.redo.length} redo</span></div>
          <div className={styles.traceCommands}>
            <button type="button" className={styles.command} disabled={!!gesture} onClick={download}><Download size={16} aria-hidden="true" />Export JSON</button>
            <button type="button" className={styles.command} onClick={() => importRef.current?.click()}><FileUp size={16} aria-hidden="true" />Import JSON</button>
            <input ref={importRef} className={styles.fileInput} type="file" accept="application/json,.json" aria-label="Import trace file" onChange={(event) => void importFile(event.target.files?.[0])} />
          </div>
          {!board.log.length ? <p className={styles.empty}>No edits yet</p> : <ol className={styles.entries}>{board.log.slice().reverse().map((entry) => <li key={entry.seq}><details><summary><span>#{entry.seq}</span>{' '}<strong>{entry.action}</strong>{' '}<span>· {describeEntry(entry, known)}</span></summary><pre>{JSON.stringify(entry.operations, null, 2)}</pre></details></li>)}</ol>}
        </section>
      </UnderTheHood>
    </section>
  );
}
