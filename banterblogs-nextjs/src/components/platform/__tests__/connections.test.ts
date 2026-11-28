import { describe, expect, it } from 'vitest';
import { CORE_ID, ECOSYSTEM_NODES, nodeById } from '@/lib/ecosystem';
import { ECOSYSTEM_EDGES, ISOLATED_NODES, describeEdge, edgeKey, edgeLine, edgesOf, neighboursOf } from '../connections';

// Who calls whom. Every edge joins two known nodes and carries the source it
// was read from; a node with no edge has to say why.

describe('ecosystem edges', () => {
  const ids = new Set<string>(ECOSYSTEM_NODES.map((node) => node.id));

  it('joins known nodes only, and never a node to itself', () => {
    expect(ECOSYSTEM_EDGES.length).toBeGreaterThan(0);
    for (const edge of ECOSYSTEM_EDGES) {
      expect(ids.has(edge.from), edgeKey(edge)).toBe(true);
      expect(ids.has(edge.to), edgeKey(edge)).toBe(true);
      expect(edge.from, edgeKey(edge)).not.toBe(edge.to);
    }
  });

  it('has no duplicate: one edge per direction between two nodes', () => {
    const keys = ECOSYSTEM_EDGES.map(edgeKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('records, for every edge, its protocol, what travels and the file it was read from', () => {
    for (const edge of ECOSYSTEM_EDGES) {
      expect(edge.protocol.length, edgeKey(edge)).toBeGreaterThan(0);
      expect(edge.label.length, edgeKey(edge)).toBeGreaterThan(0);
      expect(edge.note, edgeKey(edge)).toMatch(/\.$/);
      expect(edge.source, edgeKey(edge)).toMatch(/README\.md|CLAUDE\.md|llms\.txt|\/platform|\.py|\.yml/);
    }
  });

  it('reaches every node, or says why one stands alone', () => {
    const connected = new Set<string>(ECOSYSTEM_EDGES.flatMap((edge) => [edge.from, edge.to]));
    for (const node of ECOSYSTEM_NODES) {
      const reason = ISOLATED_NODES[node.id];
      if (connected.has(node.id)) expect(reason, `${node.id} is connected and listed as isolated`).toBeUndefined();
      else expect(reason?.length ?? 0, `${node.id} has no edge and no reason`).toBeGreaterThan(20);
    }
    for (const id of Object.keys(ISOLATED_NODES)) expect(ids.has(id), id).toBe(true);
  });

  it('draws only a live service call as a solid line: data is dotted, and what is off, planned or archived is dashed', () => {
    expect(edgeLine({ kind: 'call', status: 'live' })).toBe('call');
    expect(edgeLine({ kind: 'data', status: 'live' })).toBe('data');
    for (const status of ['off', 'planned', 'archived'] as const) {
      expect(edgeLine({ kind: 'call', status })).toBe('inactive');
      expect(edgeLine({ kind: 'data', status })).toBe('inactive');
    }
    expect(new Set(ECOSYSTEM_EDGES.map(edgeLine))).toEqual(new Set(['call', 'data', 'inactive']));
  });

  it('names the state on the label of every edge that is not running', () => {
    const resting = ECOSYSTEM_EDGES.filter((edge) => edge.status !== 'live');
    expect(resting.length).toBeGreaterThan(0);
    for (const edge of resting) expect(edge.label, edgeKey(edge)).toMatch(/off by default|planned|archived/);
  });
});

describe('graph helpers', () => {
  it('lists a node’s edges and neighbours in either direction', () => {
    expect(edgesOf('echo').map(edgeKey)).toEqual(['echo>banterpacks']);
    expect(neighboursOf('echo')).toEqual(['banterpacks']);
    // the hub: the three clients, the core, the observability loop and the research platform
    expect(new Set(neighboursOf('banterpacks'))).toEqual(
      new Set([CORE_ID, 'echo', 'chimeradroid', 'jarvis-console', 'chimera-multi-agent', 'banterhearts']),
    );
    // a pair joined both ways is still one neighbour
    expect(neighboursOf('chimera-multi-agent').filter((id) => id === 'banterpacks')).toHaveLength(1);
  });

  it('writes each edge as one sentence, for the list that stands in for the drawing', () => {
    const echo = ECOSYSTEM_EDGES.find((edge) => edge.from === 'echo')!;
    expect(describeEdge(echo)).toMatch(/^Echo calls Banterpacks: HTTP\. Each channel adapter/);
    // in words, so it reads aloud: what is not running says so in its verb
    const planned = ECOSYSTEM_EDGES.find((edge) => edge.status === 'planned')!;
    expect(describeEdge(planned)).toMatch(/^Chimera is planned to call Project Wyvern: /);
    const off = ECOSYSTEM_EDGES.find((edge) => edge.status === 'off')!;
    expect(describeEdge(off)).toMatch(/^Banterpacks can call \(off by default\) Banterhearts: HTTP\./);
    const archived = ECOSYSTEM_EDGES.find((edge) => edge.status === 'archived')!;
    expect(describeEdge(archived)).toMatch(/^Chimera Multi-Agent used to send data to This Site: git push\./);
    const data = ECOSYSTEM_EDGES.find((edge) => edge.kind === 'data' && edge.status === 'live')!;
    expect(describeEdge(data)).toContain(' sends data to ');
    for (const edge of ECOSYSTEM_EDGES) {
      const sentence = describeEdge(edge);
      expect(sentence).toContain(nodeById(edge.from).name);
      expect(sentence).toContain(nodeById(edge.to).name);
      expect(sentence).toContain(edge.note);
    }
  });
});
