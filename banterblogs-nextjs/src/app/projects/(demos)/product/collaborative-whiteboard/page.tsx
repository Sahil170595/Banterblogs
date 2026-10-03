import { WhiteboardDemo } from '@/components/projects/collaborative-whiteboard/WhiteboardDemo';
import { ForEngineers, ProjectPage, projectSections, type ProjectFinding } from '@/components/projects/ProjectPage';
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

const PLAIN = {
  question: 'Whose edit does each screen show?',
  orders: 'Every order two edits can take',
  limits: 'What this page is not',
} as const;
const ENGINEERS = {
  protocol: 'Where the source leaves room',
  model: 'How the editor keeps history',
  origin: 'Where this comes from',
  'limits-detail': 'Limits in detail',
  reproduce: 'Reproduce it',
} as const;
const sections = projectSections(PLAIN, ENGINEERS);

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
  {
    value: `${split} of ${ARRIVAL.length}`,
    label:
      'timings of two simultaneous recolours that leave a screen showing a colour the database does not have, when each client applies the server’s echoes as they arrive, as Sceneledger does now.',
  },
  {
    value: `${splitBySeq} of ${SEQUENCE.length}`,
    label:
      'when each client applies the echoes in sequence order, the numbering the server gives each stored edit. The client already records those numbers; it does not order by them.',
  },
  {
    value: `${[over, created].length}`,
    label: 'undo cases that wipe out the other person’s newer edit even when every message arrives in order. Sceneledger’s own notes document both.',
  },
];

export default function CollaborativeWhiteboardPage() {
  return (
    <ProjectPage slug={PROJECT.slug} demo={<WhiteboardDemo />} findings={FINDINGS} sections={sections}>
      <h2 id="question">{PLAIN.question}</h2>
      <p>
        A shared whiteboard has to answer one question again and again: when two people change the same thing at once, what does each of them see
        afterwards, and does it match what was saved? Sceneledger, the whiteboard I built, answers it with one server, one lock per board so the
        server stores one edit at a time, and a sequence number for every stored edit. Each client, a person&apos;s browser, applies its own edit at
        once and sends it; the server stores and numbers it, then sends it back to everyone as an echo, which each client applies in turn.
      </p>

      <h2 id="orders">{PLAIN.orders}</h2>
      <p>
        A recolours a note rose while B recolours it blue. The server stores one first and numbers them 1 and 2, so the database ends with whichever
        it stored second. Each echo then goes out separately, and each client can receive the two in either order: two orders at the server, two at
        each client, {ARRIVAL.length} in all. Because each client applies the echoes as they arrive, the last one to arrive wins on that screen, and
        in {say(split)} of the {ARRIVAL.length} someone ends up looking at a colour the database does not have; in {say(bothClients)}, both people do.
      </p>
      <p>
        The client already records each echo&apos;s sequence number, but does not order by it. Holding echoes and applying them in that order makes
        all {SEQUENCE.length} agree: that is the table&apos;s second setting, a fix this page models, not one the Sceneledger client at the linked
        commit makes. It fixes ordering, not intent: undo is a second problem. Undo sends an inverse operation, an ordinary edit that reverses the
        client&apos;s own last one. In order, with every message delivered before the next action, A recolours the note, B recolours it after, and A
        undoes; A&apos;s undo puts back the colour it replaced, and B&apos;s newer colour is gone. If A adds a note, B moves it and A undoes the add,
        the note is deleted and B&apos;s move with it. The source documents both.
      </p>

      <h2 id="limits">{PLAIN.limits}</h2>
      <p>
        There is no server, account or second person here: the table works through a model of the protocol in every order the two edits can take, and
        the editor runs in this tab alone. The opening board is a made-up workflow of {INITIAL_SHAPES.length} objects, not anyone&apos;s work.
      </p>

      <ForEngineers lede="Where the source leaves room for disagreement, how the editor keeps its history, where the code comes from, its limits in detail, and how to run the tests.">
        <h3 id="protocol">{ENGINEERS.protocol}</h3>
        <p>
          The source&apos;s notes are candid that its design does not guarantee convergence, every screen ending on the database&apos;s state: the
          broadcast happens after the lock is released, clients do not enforce the sequence numbers, and its own two-client test covers an ordinary
          add, not two people editing the same field. The table runs that case through every order it can take.
        </p>

        <h3 id="model">{ENGINEERS.model}</h3>
        <p>
          <strong>A scene, not pixels.</strong> The editor keeps a list of shapes on a {BOARD_WIDTH} by {BOARD_HEIGHT} board and changes it only
          through three operations: add, update and delete. Each edit stores its inverse: an add is undone by deleting it, an update by restoring only
          the fields it changed, a delete by re-adding the shape at its old position in the list, so the overlap order survives undo. A clear is one
          command of many deletes, and a drag, a resize or a run of arrow-key nudges is one edit when it ends, however many steps it took.
        </p>
        <p>
          <strong>Hit testing follows the drawing.</strong> The selected shape is tested first, then the rest from the top down; rectangles and text
          by their boxes, ellipses by their equation, lines by distance to the segment. The selected shape is also drawn last, so what is drawn on top
          is what a press picks.
        </p>
        <p>
          <strong>History you can replay.</strong> The board, its history and the undo and redo stacks save to this browser and export as a versioned
          trace. Import replays every command through the same engine and refuses a trace whose declared final board does not follow from its history.
          After a saved board fails to load, edits stay in memory and the unreadable copy is kept, until a reset or import replaces it.
        </p>

        <h3 id="origin">{ENGINEERS.origin}</h3>
        <p>
          <a href={SCENELEDGER.url} target="_blank" rel="noopener noreferrer">
            Sceneledger
          </a>{' '}
          is my full-stack whiteboard: a React canvas client, FastAPI HTTP and WebSocket sessions with JWT accounts and board membership, and
          PostgreSQL storage for shapes. The table models its{' '}
          <a href={sourceFile('client/src/operations.ts')} target="_blank" rel="noopener noreferrer">
            client operations
          </a>
          , the client&apos;s echo handling and the{' '}
          <a href={sourceFile('server/app/ws.py')} target="_blank" rel="noopener noreferrer">
            server&apos;s op path
          </a>
          ; the operations pass the source&apos;s own client tests. The editor is adapted from the same client under its Apache 2.0 licence, with the{' '}
          <a href="/projects/collaborative-whiteboard/NOTICE.txt">changes listed</a>.
        </p>

        <h3 id="limits-detail">{ENGINEERS['limits-detail']}</h3>
        <p>
          The table enumerates the protocol&apos;s orders; it does not run sockets. The editor does not sync between tabs, and the last tab to save
          wins. Boards hold up to {MAX_SHAPES} objects and {MAX_ENTRIES.toLocaleString('en-US')} commands, and traces up to{' '}
          {MAX_TRACE_BYTES / 1_000_000} MB. The editor has no groups and no connectors, as its object list shows: each object moves on its own.
        </p>

        <h3 id="reproduce">{ENGINEERS.reproduce}</h3>
        <p>
          Switch the table to sequence order and watch the red go; then draw, drag, nudge with the arrow keys and undo in the editor, and export and
          import its trace under the hood. The protocol model, the editor&apos;s engine and their tests are in the{' '}
          <a href={SOURCE.url} target="_blank" rel="noopener noreferrer">
            code for this page
          </a>
          . From the site&apos;s Next.js app:
        </p>
        <pre>
          <code>npx vitest run src/lib/projects/collaborative-whiteboard src/components/projects/collaborative-whiteboard</code>
        </pre>
      </ForEngineers>
    </ProjectPage>
  );
}
