import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import WhiteboardDemo from '@/components/projects/collaborative-whiteboard/WhiteboardDemo';
import styles from '@/components/projects/collaborative-whiteboard/whiteboard.module.css';
import project from './project.json';

export const metadata: Metadata = {
  title: project.title, description: project.summary,
  alternates: { canonical: `/work/projects/${project.slug}` },
};
const SOURCE_ROOT = 'https://github.com/Sahil170595/Banterblogs/blob/codex/demo-collaborative-whiteboard/banterblogs-nextjs';
const LIB = `${SOURCE_ROOT}/src/lib/projects/collaborative-whiteboard`;

export default function WhiteboardProjectPage() {
  return (
    <main className={styles.page}>
      <Link className={styles.back} href="/work"><ArrowLeft size={15} aria-hidden="true" />Work</Link>
      <header className={styles.header}>
        <h1>{project.title}</h1>
        <p>A synthetic workflow board with actual object editing and reversible commands. This browser adaptation is local to one tab: no server, accounts, remote collaborators or simulated cursors.</p>
        <nav className={styles.anchors} aria-label="Project sections"><a href="#demo">Canvas</a><a href="#findings">Findings</a><a href="#method">Method</a><a href="#reproduce">Reproduce</a></nav>
      </header>
      <WhiteboardDemo />
      <article className={styles.article} aria-label="Whiteboard engineering write-up">
        <section id="question">
          <h2>What makes a whiteboard edit trustworthy?</h2>
          <p>A whiteboard looks simple until a user expects an edit to survive refresh, a mistaken deletion to be reversible, and the object under the pointer to agree with the one that was drawn. Those are state-model questions before they are styling questions. A visually convincing canvas is not enough if its history restores the wrong object or its saved document cannot be explained.</p>
          <p>My implementation centers on a small scene graph and three commands: add, update and delete. The application here exposes that model directly. Its publishing workflow is a fresh fictional fixture, not a recovered user board. Rectangles, ellipses, directed lines and text are independently editable objects; text labels are not secretly grouped with their background shapes. Moving a node therefore does not move its label or reroute an edge automatically.</p>
          <p>The original architecture had separate browser editing, authenticated WebSocket transport and database persistence. This adaptation deliberately keeps only the browser editing plane. The route retains its collaborative-whiteboard project identity, but the implemented runtime is a <strong>single-tab application</strong>, not a multiplayer demonstration.</p>
        </section>
        <section id="method">
          <h2>A scene graph, not a history of pixels</h2>
          <h3>Geometry and pointer ownership</h3>
          <p>Every object lives in a fixed 960 by 600 coordinate space. Display size and device pixel ratio affect drawing resolution, not the saved coordinates. Pointer locations are projected from the canvas bounding rectangle into board units, so the same object model survives a resized viewport or a zoomed, internally scrollable canvas.</p>
          <p>The hit-test follows the visual order: the selected object is temporarily drawn on top and tested first; other objects are tested from the end of the scene array backwards. Rectangles and text use bounding boxes, ellipses use a normalized ellipse equation, and lines use distance to a finite segment. A line with a negative width or height is a legitimate directed segment. Treating it as an ordinary positive rectangle would miss valid hits and clamp moves incorrectly.</p>
          <p>During a drag or resize, the canvas renders an uncommitted preview. Pointer capture keeps a gesture attached to its originating canvas. Only pointer-up commits the final coordinates; cancellation or Escape discards the preview. Hundreds of intermediate pointer events do not become hundreds of undo entries. Non-line shapes have corner handles; line endpoints remain editable through the property inspector.</p>
          <h3>Inverse commands and atomic batches</h3>
          <p>The Apache-licensed client operations were adapted rather than replaced with full-board snapshot undo. An add is inverted by deleting the new ID. An update captures only the previous values of the fields it changes. A delete captures the object and, in this adaptation, its original insertion position. That last detail preserves z-order: restoring an object at the end of the list can visibly change overlap and subsequent hit-testing.</p>
          <pre><code>{`edit:  update(shapeId, { x: 300, y: 220 })
undo:  update(shapeId, { x: 100, y: 100 })
redo:  update(shapeId, { x: 300, y: 220 })`}</code></pre>
          <p>Clear is one command containing multiple deletes. Its inverse applies the matching adds in reverse order. A batch is calculated against temporary immutable state before it is published; an invalid later operation rejects the entire command. New edits invalidate redo. No-op edits do not consume history. Reset starts a new synthetic session and intentionally drops prior history only after confirmation.</p>
          <h3>Replay as a persistence boundary</h3>
          <p>The exported <code>whiteboard.trace.v1</code> document carries runtime mode, coordinate configuration, fixture revision, initial objects, sequenced commands and final objects. Import reconstructs history through the same engine. It checks sequence continuity, expected undo/redo inverses and agreement between replay and the declared final state. It does not trust an imported final snapshot merely because the JSON parses.</p>
          <p>Runtime schemas reject unknown fields, duplicate IDs, nonfinite coordinates, invalid colors, out-of-board geometry and oversized input. Identity and shape type cannot be changed through property patches. IDs identify objects; they do not represent people. Exported traces are inspectable consistency artifacts, not cryptographic proof of authorship or tamper-resistant audit records.</p>
        </section>
        <section id="findings">
          <h2>Findings and counterexamples</h2>
          <p><strong>Derived from the model:</strong> per-field inverses avoid replacing unrelated scene state, but they do not solve concurrent editing. Two independent writers can still overwrite the same field. This local runtime has one writer and makes no CRDT, operational-transformation or distributed conflict-resolution claim.</p>
          <p><strong>Executable checks:</strong> the domain suite covers deletion followed by restoration at the original z-position, clear/undo/redo round trips, redo invalidation, atomic rejection and malformed replay. Geometry counterexamples distinguish the corner of an ellipse from a rectangular hit and test reversed line endpoints. Component tests exercise actual controls, property updates, a pointer-created rectangle and a cancelled gesture. Storage tests cover restoration and failure without pretending a failed save succeeded.</p>
          <p><strong>Illustrative, not benchmarked:</strong> the initial ten objects are a visual workflow for experimentation. They are not a collaboration-load test, a latency result or evidence about large-canvas performance. Browser screenshots, touch behavior and full-route integration require separate browser QA; unit and component assertions are not substitutes for that qualification.</p>
          <p>The operation log records commands actually committed by this engine. Expanding an entry reveals its concrete payload. Selection, zoom and pointer previews are not persisted edits and do not appear as successful actions. The canvas itself is the visual asset: it encodes current object state, not a prerecorded animation.</p>
        </section>
        <section id="limits">
          <h2>Limits that remain visible</h2>
          <ul>
            <li>There is no remote transport, presence, invite flow, authentication or server authorization. No background actor edits this board.</li>
            <li>Browser storage is a convenience, not durable database storage. Private browsing, quotas or clearing site data can remove it. Storage failures leave edits in memory and surface an export warning.</li>
            <li>Tabs do not synchronize. Two tabs share the same storage key and the last saved trace wins; use one tab or keep independent JSON exports.</li>
            <li>Text is edited as a whole object. It wraps and clips within its bounds; this is not collaborative character editing, an auto-layout diagram engine or rich text.</li>
            <li>A session is bounded to 200 objects, 1,000 commands and a 1 MB formatted trace. Reaching a trace limit rejects further edits with an export-and-reset message instead of silently truncating evidence. Accepted exports fit the import limit.</li>
            <li>JSON export preserves scene and history. Image/PDF export, groups, connectors, infinite panning and cross-device persistence are outside this adaptation.</li>
          </ul>
        </section>
        <section id="reproduce">
          <h2>Reproduction and source evidence</h2>
          <p>The implementation is self-contained in this project&apos;s route, component and library directories. It does not import the original repository at runtime and requires no provider credentials. The engine and geometry preserve Apache-2.0 attribution; the synthetic fixture and single-tab persistence boundary are new.</p>
          <p>In a checkout of the published branch with existing dependencies, the focused checks are:</p>
          <pre><code>{`cd banterblogs-nextjs
npm run test -- --run src/app/work/projects/collaborative-whiteboard src/lib/projects/collaborative-whiteboard src/components/projects/collaborative-whiteboard --maxWorkers=1 --cache=false
npm run lint -- src/app/work/projects/collaborative-whiteboard src/lib/projects/collaborative-whiteboard src/components/projects/collaborative-whiteboard`}</code></pre>
          <p>Production builds and real-browser qualification are separate gates. This project does not require production credentials, network model calls or downloaded model weights. Exporting, resetting and reimporting a trace should reconstruct both the final board and the undo/redo stacks; changing a declared final coordinate without changing history should be rejected.</p>
          <ul>
            <li><a href={`${LIB}/engine.ts`}>Operations, inverse history and replay validation</a></li>
            <li><a href={`${LIB}/geometry.ts`}>Hit-testing, movement bounds and resizing</a></li>
            <li><a href={`${LIB}/engine.test.ts`}>Executable invariants and geometry counterexamples</a></li>
            <li><a href={`${LIB}/store.test.ts`}>Persistence failure and single-tab boundary tests</a></li>
            <li><a href={`${SOURCE_ROOT}/src/components/projects/collaborative-whiteboard/WhiteboardDemo.test.tsx`}>Interaction tests</a></li>
            <li><a href="/projects/collaborative-whiteboard/NOTICE.txt">Adaptation notice</a> and <a href="/projects/collaborative-whiteboard/LICENSE.txt">preserved Apache license</a></li>
          </ul>
        </section>
      </article>
    </main>
  );
}
