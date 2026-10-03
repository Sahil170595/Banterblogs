import { WhiteboardDemo } from '@/components/projects/collaborative-whiteboard/WhiteboardDemo';
import { ProjectPage, type ProjectFinding, type ProjectSection } from '@/components/projects/ProjectPage';
import { BOARD_HEIGHT, BOARD_WIDTH, MAX_ENTRIES, MAX_SHAPES, MAX_TRACE_BYTES } from '@/lib/projects/collaborative-whiteboard/engine';
import { INITIAL_SHAPES } from '@/lib/projects/collaborative-whiteboard/fixtures';
import { concurrentOutcomes, undoCreation, undoOverNewer } from '@/lib/projects/collaborative-whiteboard/scenarios';
import { ProjectManifestSchema } from '@/lib/projects/manifest';
import { projectMetadata } from '@/lib/projects/metadata';
import manifest from './project.json';

const PROJECT = ProjectManifestSchema.parse(manifest);
export const metadata = projectMetadata(PROJECT);

const [SOURCE, SCENELEDGER] = PROJECT.links;
const sourceFile = (path: string) => `${SCENELEDGER.url.replace('/tree/', '/blob/')}/${path}`;

const SECTIONS = {
  question: 'Whose edit does each screen show?',
  orders: 'Every order two edits can take',
  model: 'How the editor keeps history',
  origin: 'Where this comes from',
  limits: 'What this page is not',
  reproduce: 'Reproduce it',
} as const;
const sections: ProjectSection[] = Object.entries(SECTIONS).map(([id, title]) => ({ id, title }));

// every number in the write-up is computed from the engine at render
const ARRIVAL = concurrentOutcomes('arrival');
const SEQUENCE = concurrentOutcomes('sequence');
const split = ARRIVAL.filter((r) => r.outcome.diverged.length > 0).length;
const splitBySeq = SEQUENCE.filter((r) => r.outcome.diverged.length > 0).length;
const bothClients = ARRIVAL.filter((r) => r.outcome.diverged.length === 2).length;
const over = undoOverNewer();
const created = undoCreation();
const words = ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
const say = (n: number) => words[n] ?? String(n);

const FINDINGS: ProjectFinding[] = [
  { value: `${split} of ${ARRIVAL.length}`, label: 'ways two concurrent edits can be stored and delivered that leave a screen disagreeing with the database.' },
  { value: `${splitBySeq} of ${SEQUENCE.length}`, label: 'when each client applies the echoes in the order the server numbered them, which it records and ignores.' },
  {
    value: `${[over, created].length}`,
    label: 'undo cases that lose someone else’s newer edit even when every message arrives in order, both named in the source’s own notes.',
  },
];

export default function CollaborativeWhiteboardPage() {
  return (
    <ProjectPage slug={PROJECT.slug} demo={<WhiteboardDemo />} findings={FINDINGS} sections={sections}>
      <h2 id="question">{SECTIONS.question}</h2>
      <p>
        A shared whiteboard has to answer one question again and again: when two people change the same thing, what does each of them see
        afterwards, and does it match what was saved? Sceneledger answers it with one server, one lock per board and a number for every
        stored edit. Each client applies its own edit at once, sends it, and then applies whatever the server echoes back.
      </p>
      <p>
        The source&apos;s notes are candid that this does not guarantee convergence: the broadcast happens after the lock is released,
        clients do not enforce the sequence numbers, and its own two-client test covers an ordinary add, not two people editing the same
        field. This page runs that case through every order it can take.
      </p>

      <h2 id="orders">{SECTIONS.orders}</h2>
      <p>
        A recolours a note rose while B recolours it blue. The server stores one first and numbers them 1 and 2, so the database ends with
        whichever it stored second. Each echo then goes out separately, and each client can receive the two in either order: two orders
        at the server, two at each client, {ARRIVAL.length} in all. Because each client applies the echoes as they arrive, the last one to
        arrive wins on that screen, and in {say(split)} of the {ARRIVAL.length} someone ends up looking at a colour the database does not
        have; in {say(bothClients)}, both people do.
      </p>
      <p>
        The client already records each echo&apos;s sequence number. Holding echoes and applying them in that order makes all{' '}
        {SEQUENCE.length} agree. That fixes ordering, not intent: undo is a second problem. In order, with every message delivered before
        the next action, A recolours the note, B recolours it after, and A undoes; A&apos;s undo puts back the colour it replaced, and
        B&apos;s newer colour is gone. If A adds a note, B moves it and A undoes the add, the note is deleted and B&apos;s move with it.
        The source documents both.
      </p>

      <h2 id="model">{SECTIONS.model}</h2>
      <p>
        <strong>A scene, not pixels.</strong> The editor below keeps a list of shapes on a {BOARD_WIDTH} by {BOARD_HEIGHT} board and
        changes it only through three operations: add, update and delete. Each edit stores its inverse: an add is undone by deleting it, an
        update by restoring only the fields it changed, a delete by re-adding the shape at its old position in the list, so the overlap
        order survives undo. A clear is one command of many deletes, and a drag, a resize or a run of arrow-key nudges is one edit when it
        ends, however many steps it took.
      </p>
      <p>
        <strong>Hit testing follows the drawing.</strong> The selected shape is tested first, then the rest from the top down; rectangles
        and text by their boxes, ellipses by their equation, lines by distance to the segment.
      </p>
      <p>
        <strong>History you can replay.</strong> The board, its history and the undo and redo stacks save to this browser and export as a
        versioned trace. Import replays every command through the same engine and refuses a trace whose declared final board does not
        follow from its history. After a saved board fails to load, edits stay in memory and the unreadable copy is kept, until a reset or
        import replaces it.
      </p>

      <h2 id="origin">{SECTIONS.origin}</h2>
      <p>
        <a href={SCENELEDGER.url} target="_blank" rel="noopener noreferrer">
          Sceneledger
        </a>{' '}
        is my full-stack whiteboard: a React canvas client, FastAPI HTTP and WebSocket sessions with JWT accounts and board membership,
        and PostgreSQL storage for shapes. The table above models its{' '}
        <a href={sourceFile('client/src/operations.ts')} target="_blank" rel="noopener noreferrer">
          client operations
        </a>
        , the client&apos;s echo handling and the{' '}
        <a href={sourceFile('server/app/ws.py')} target="_blank" rel="noopener noreferrer">
          server&apos;s op path
        </a>
        ; the operations pass the source&apos;s own client tests. The editor is adapted from the same client under its Apache 2.0
        licence, with the{' '}
        <a href="/projects/collaborative-whiteboard/NOTICE.txt">changes listed</a>.
      </p>

      <h2 id="limits">{SECTIONS.limits}</h2>
      <p>
        No server, accounts or second person here: the table models the protocol and enumerates its orders; it does not run sockets. The
        editor is local to this tab: two tabs do not sync, and the last one to save wins. Boards hold up to {MAX_SHAPES} objects and{' '}
        {MAX_ENTRIES.toLocaleString('en-US')} commands, and traces up to {MAX_TRACE_BYTES / 1_000_000} MB. The opening board is a synthetic
        workflow of {INITIAL_SHAPES.length} objects, not anyone&apos;s work.
      </p>

      <h2 id="reproduce">{SECTIONS.reproduce}</h2>
      <p>
        Switch the table to sequence order and watch the red go; then draw, drag, nudge with the arrow keys, undo, export and import in the
        editor. The protocol model, the editor&apos;s engine and their tests are in the{' '}
        <a href={SOURCE.url} target="_blank" rel="noopener noreferrer">
          demo source
        </a>
        . From the site&apos;s Next.js app:
      </p>
      <pre>
        <code>npx vitest run src/lib/projects/collaborative-whiteboard src/components/projects/collaborative-whiteboard</code>
      </pre>
    </ProjectPage>
  );
}
