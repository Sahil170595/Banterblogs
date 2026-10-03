import { describe, expect, it, vi } from 'vitest';
import { clearBoard, commit, createBoard, exportTrace } from './engine';
import { INITIAL_SHAPES } from './fixtures';
import { createSessionStore, STORAGE_KEY } from './store';

describe('single-tab persistence boundary', () => {
  it('uses a stable synthetic snapshot for server rendering', () => {
    const access = vi.fn(() => { throw new Error('not available on server'); });
    const store = createSessionStore(access);
    expect(store.getServerSnapshot()).toBe(store.getSnapshot());
    expect(store.getSnapshot().board.shapes).toEqual(INITIAL_SHAPES);
    expect(access).not.toHaveBeenCalled();
  });
  it('hydrates only on subscription and persists the replayable trace', () => {
    const saved = exportTrace(clearBoard(createBoard(INITIAL_SHAPES)));
    const storage = { getItem: vi.fn(() => JSON.stringify(saved)), setItem: vi.fn() };
    const store = createSessionStore(() => storage);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    expect(store.getSnapshot().board.shapes).toEqual([]);
    store.dispatch(() => createBoard(INITIAL_SHAPES));
    expect(storage.setItem).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(exportTrace(createBoard(INITIAL_SHAPES))));
    unsubscribe();
  });
  it('actually saves the initial board before reporting saved status', () => {
    const storage = { getItem: () => null, setItem: vi.fn() };
    const store = createSessionStore(() => storage);
    const unsubscribe = store.subscribe(() => {});
    expect(store.getSnapshot().storage).toBe('saved');
    expect(storage.setItem).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(exportTrace(createBoard(INITIAL_SHAPES))));
    unsubscribe();
  });
  it('reports a corrupt saved trace without silently overwriting it', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const storage = { getItem: () => '{bad json', setItem: vi.fn() };
    const store = createSessionStore(() => storage);
    const unsubscribe = store.subscribe(() => {});
    expect(store.getSnapshot().error).toMatch(/saved board/i);
    expect(store.getSnapshot().board.shapes).toEqual(INITIAL_SHAPES);
    expect(storage.setItem).not.toHaveBeenCalled();
    unsubscribe();
    vi.restoreAllMocks();
  });
  it('keeps an unreadable saved copy through later edits, until a reset replaces it', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const storage = { getItem: () => '{bad json', setItem: vi.fn() };
    const store = createSessionStore(() => storage);
    const unsubscribe = store.subscribe(() => {});
    expect(store.dispatch(clearBoard)).toBe(true);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(store.getSnapshot().storage).toBe('memory-only');
    expect(store.getSnapshot().error).toMatch(/kept as it was/);
    store.dispatch(() => createBoard(INITIAL_SHAPES), { replaceStored: true });
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().storage).toBe('saved');
    unsubscribe();
    vi.restoreAllMocks();
  });
  it('retains an edit in memory and exposes storage failure', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const storage = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
    const store = createSessionStore(() => storage);
    const unsubscribe = store.subscribe(() => {});
    expect(store.dispatch(clearBoard)).toBe(true);
    expect(store.getSnapshot().board.shapes).toEqual([]);
    expect(store.getSnapshot().storage).toBe('memory-only');
    expect(store.getSnapshot().error).toMatch(/export/i);
    unsubscribe();
    vi.restoreAllMocks();
  });
  it('rejects a bad command without changing the document', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const store = createSessionStore(() => ({ getItem: () => null, setItem: () => {} }));
    const initial = store.getSnapshot().board;
    expect(store.dispatch((state) => commit(state, [{ kind: 'delete', shapeId: 'missing' }]))).toBe(false);
    expect(store.getSnapshot().board).toBe(initial);
    expect(store.getSnapshot().error).toMatch(/not found/i);
    vi.restoreAllMocks();
  });
  it('does not subscribe to or advertise cross-tab collaboration', () => {
    const listener = vi.spyOn(window, 'addEventListener');
    const store = createSessionStore(() => ({ getItem: () => null, setItem: () => {} }));
    const unsubscribe = store.subscribe(() => {});
    expect(listener.mock.calls.some(([event]) => event === 'storage')).toBe(false);
    unsubscribe();
    listener.mockRestore();
  });
});
