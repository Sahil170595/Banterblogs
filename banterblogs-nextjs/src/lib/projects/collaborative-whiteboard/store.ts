import { createBoard, exportTrace, restoreTrace, type BoardState } from './engine';
import { INITIAL_SHAPES } from './fixtures';

export const STORAGE_KEY = 'chimeraforge:whiteboard:trace:v1';
type StorageBoundary = Pick<Storage, 'getItem' | 'setItem'>;
interface Snapshot {
  board: BoardState;
  storage: 'loading' | 'saved' | 'memory-only';
  error: string | null;
}

export function createSessionStore(accessStorage: () => StorageBoundary = () => window.localStorage) {
  const server: Snapshot = { board: createBoard(INITIAL_SHAPES), storage: 'loading', error: null };
  let snapshot = server;
  let hydrated = false;
  const listeners = new Set<() => void>();
  function notify() { for (const listener of listeners) listener(); }
  function reportError(message: string, error: unknown) {
    console.warn('[collaborative-whiteboard]', message, error);
    snapshot = { ...snapshot, error: message };
    notify();
  }
  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => server,
    reportError,
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (!hydrated) {
        hydrated = true;
        try {
          const storage = accessStorage();
          const raw = storage.getItem(STORAGE_KEY);
          const board = raw ? restoreTrace(JSON.parse(raw)) : server.board;
          if (!raw) storage.setItem(STORAGE_KEY, JSON.stringify(exportTrace(board)));
          snapshot = { board, storage: 'saved', error: null };
        } catch (error) {
          console.warn('[collaborative-whiteboard] saved board could not be loaded', error);
          snapshot = { ...snapshot, storage: 'memory-only', error: 'Saved board could not be loaded. The synthetic board is open; export it before leaving. The stored copy has not been overwritten.' };
        }
        notify();
      }
      return () => { listeners.delete(listener); };
    },
    dispatch(transform: (board: BoardState) => BoardState): boolean {
      let board: BoardState;
      try {
        board = transform(snapshot.board);
      } catch (error) {
        reportError(error instanceof Error ? error.message : 'The command was rejected. Check the object properties.', error);
        return false;
      }
      if (board === snapshot.board) return true;
      snapshot = { ...snapshot, board, error: null };
      try {
        accessStorage().setItem(STORAGE_KEY, JSON.stringify(exportTrace(board)));
        snapshot = { ...snapshot, storage: 'saved' };
      } catch (error) {
        console.warn('[collaborative-whiteboard] persistence failed', error);
        snapshot = { ...snapshot, storage: 'memory-only', error: 'This edit is in memory only. Browser storage is unavailable or full; export JSON to retain your work.' };
      }
      notify();
      return true;
    },
  };
}
