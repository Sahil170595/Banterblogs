import type { CSSProperties } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { CORE_ID, nodeById, type NodeId } from '@/lib/ecosystem';
import { ECOSYSTEM_EDGES, describeEdge, edgeKey, edgeLine, neighboursOf, type EdgeLine } from './connections';
import { MAP_LAYOUTS, arrowHead, labelLines, pillBox, routePath, type MapLayout } from './mapLayout';
import { LINKS_ATTRIBUTE, NODE_ATTRIBUTE, READOUT_ATTRIBUTE } from './mapAttributes';
import { MapTrace } from './MapTrace';
import styles from './map.module.css';

/** what the readout says while no node is traced; true without JavaScript too */
export const MAP_IDLE_READOUT = 'Select a system to jump to its section on this page.';

/** The id of a node's section on /platform: the core's is the engines that host it. */
export function systemAnchor(id: NodeId): string {
  return id === CORE_ID ? 'core-engines' : `system-${id}`;
}

// The edges draw in one --stagger-item apart; past this step they start
// together, so the last begins inside the 400ms entrance cap (80 + 6 x 50).
const EDGE_STAGGER_CAP = 6;
const PILL_RADIUS = 8;
/** the focus ring's centre line off the pill: the site ring's 2px gap plus half its 2px stroke */
const RING_OFFSET = 3;
/** baselines of a pill's two lines, from its centre */
const NAME_BASELINE = -3;
const STACK_BASELINE = 14;
const LABEL_LINE_HEIGHT = 14;

const LINE_KEY: { line: EdgeLine; text: string }[] = [
  { line: 'call', text: 'Service call, running' },
  { line: 'data', text: 'Data moves, no service call' },
  { line: 'inactive', text: 'Not running: off by default, planned or archived' },
];

function Drawing({ layout }: { layout: MapLayout }) {
  // a mask needs an id; the two drawings share a document
  const wipeId = (key: string) => `map-wipe-${layout.id}-${key.replace('>', '-to-')}`;
  return (
    <svg
      className={cn(styles.drawing, styles[layout.id])}
      data-layout={layout.id}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      role="group"
      aria-label="Map of the Chimera core and the nine repositories; each is a link to its section"
    >
      {/* said in words by the list under the figure */}
      <g aria-hidden="true">
        {ECOSYSTEM_EDGES.map((edge, index) => {
          const key = edgeKey(edge);
          const route = layout.routes[key];
          const line = edgeLine(edge);
          const d = routePath(route);
          const lines = labelLines(edge.label, route.label.wrap);
          return (
            <g
              key={key}
              className={styles.edge}
              data-edge={key}
              data-line={line}
              {...{ [LINKS_ATTRIBUTE]: `${edge.from} ${edge.to}` }}
              style={{ '--edge-i': Math.min(index, EDGE_STAGGER_CAP) } as CSSProperties}
            >
              {line === 'call' ? (
                <path className={cn(styles.line, styles.draw)} d={d} pathLength={1} />
              ) : (
                <>
                  <mask id={wipeId(key)} maskUnits="userSpaceOnUse" x={0} y={0} width={layout.width} height={layout.height}>
                    <path className={cn(styles.wipe, styles.draw)} d={d} pathLength={1} />
                  </mask>
                  <path className={styles.line} d={d} mask={`url(#${wipeId(key)})`} />
                </>
              )}
              <polygon className={cn(styles.head, styles.arrive)} points={arrowHead(route)} />
              <text className={cn(styles.label, styles.arrive)} x={route.label.x} y={route.label.y} textAnchor={route.label.anchor}>
                {lines.length === 1
                  ? lines[0]
                  : lines.map((text, i) => (
                      <tspan key={text} x={route.label.x} dy={i === 0 ? 0 : LABEL_LINE_HEIGHT}>
                        {i < lines.length - 1 ? `${text} ` : text}
                      </tspan>
                    ))}
              </text>
            </g>
          );
        })}
      </g>
      {layout.order.map((id) => {
        const node = nodeById(id);
        const { cx, cy } = layout.nodes[id];
        const box = pillBox(layout, id);
        return (
          <a
            key={id}
            href={`#${systemAnchor(id)}`}
            className={styles.node}
            aria-label={`${node.name}: ${node.blurb}`}
            {...{ [NODE_ATTRIBUTE]: id, [LINKS_ATTRIBUTE]: [id, ...neighboursOf(id)].join(' ') }}
            {...(id === CORE_ID ? { 'data-core': '' } : {})}
          >
            <rect className={styles.pill} x={box.x0} y={box.y0} width={box.x1 - box.x0} height={box.y1 - box.y0} rx={PILL_RADIUS} />
            <rect
              className={styles.ring}
              x={box.x0 - RING_OFFSET}
              y={box.y0 - RING_OFFSET}
              width={box.x1 - box.x0 + 2 * RING_OFFSET}
              height={box.y1 - box.y0 + 2 * RING_OFFSET}
              rx={PILL_RADIUS + RING_OFFSET}
            />
            <text className={styles.name} x={cx} y={cy + NAME_BASELINE} textAnchor="middle">
              {node.name}
            </text>
            <text className={styles.stack} x={cx} y={cy + STACK_BASELINE} textAnchor="middle">
              {node.stack}
            </text>
          </a>
        );
      })}
    </svg>
  );
}

/**
 * The ecosystem as a map: the Chimera core and the nine repositories as
 * nodes, who calls whom as arrows labelled with the protocol. Server-rendered
 * SVG on the FlowFigure's plate, laid out by hand three times (mapLayout.ts), with
 * every edge repeated as a sentence in a list. Each node links to its section
 * of the page; MapTrace lights a hovered or focused node's connections.
 */
export function EcosystemMap({ className }: { className?: string }) {
  return (
    <figure className={cn('flow', className)}>
      <figcaption className="flow-caption">
        <span className="block text-copy-14 font-medium text-foreground">The core and the nine repositories</span>
        <span className="mt-1 block max-w-[60ch] text-label-13 text-muted-foreground">
          An arrow runs from the caller to what it calls, or from where data starts to where it lands. The core is not a
          repository: its router, debate engine and runtime live inside Banterpacks, behind the JARVIS gateway.
        </span>
      </figcaption>
      <MapTrace className={styles.map} idle={MAP_IDLE_READOUT}>
        {Object.values(MAP_LAYOUTS).map((layout) => (
          <Drawing key={layout.id} layout={layout} />
        ))}
        <p className={cn(styles.readout, 'text-label-13 text-muted-foreground')} {...{ [READOUT_ATTRIBUTE]: '' }}>
          {MAP_IDLE_READOUT}
        </p>
      </MapTrace>
      <ul aria-label="Line styles" className={cn(styles.legend, 'text-label-13 text-muted-foreground')}>
        {LINE_KEY.map(({ line, text }) => (
          <li key={line} className={styles.edge} data-line={line}>
            <svg aria-hidden="true" className={styles.sample} viewBox="0 0 28 8">
              <path className={styles.line} d="M1 4L27 4" />
            </svg>
            {text}
          </li>
        ))}
      </ul>
      <details className="more-details">
        <summary>
          <ChevronRight aria-hidden="true" className="more-chevron h-3.5 w-3.5" />
          Read the {ECOSYSTEM_EDGES.length} connections as a list
        </summary>
        <ul className={cn(styles.connections, 'text-copy-14 text-muted-foreground')}>
          {ECOSYSTEM_EDGES.map((edge) => (
            <li key={edgeKey(edge)}>{describeEdge(edge)}</li>
          ))}
        </ul>
      </details>
    </figure>
  );
}
