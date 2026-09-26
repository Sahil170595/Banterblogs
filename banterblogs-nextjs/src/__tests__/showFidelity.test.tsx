import type { ComponentType } from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import BftConsensusPage from '@/app/show/bft-consensus/page';
import CognitiveAgentsPage from '@/app/show/cognitive-agents/page';
import ProvenanceChainPage from '@/app/show/provenance-chain/page';
import StreamingLadderPage from '@/app/show/streaming-ladder/page';
import ZkAlignmentProofPage from '@/app/show/zk-alignment-proof/page';

// Each /show scene says how faithful it is to the code it demonstrates. The
// engineering caveats sat as a dense block between the pitch and the demo, so
// a first-time visitor read serde_json::to_vec(&Action) before anything moved.
// Now the one limit that matters is stated in plain words above the demo, and
// the full detail folds beneath it: one click away, and still in the page for
// anyone reading the source. Cognitive's biggest limit (the verdicts are
// combined by a demonstration layer, not ported code) moves up from its
// footer into that detail.

const DISCLOSURE = 'How faithful is this demo?';

// per page: words the plain statement must carry, and caveats that must sit
// inside the detail
const PAGES: Array<[string, ComponentType, { says: string[]; detail: string[] }]> = [
  ['streaming-ladder', StreamingLadderPage, { says: ['fixed stand-in', 'real code'], detail: ['deterministic fake provider', 'production estimates'] }],
  ['bft-consensus', BftConsensusPage, { says: ['one process', 'not across machines'], detail: ['VirtualBftCluster', 'Honest divergence'] }],
  ['cognitive-agents', CognitiveAgentsPage, { says: ['ported verbatim', 'demonstration'], detail: ['static default weights', 'demonstration composition'] }],
  ['provenance-chain', ProvenanceChainPage, { says: ['crypto is real', 'byte-for-byte'], detail: ['crypto.generateKeyPairSync', 'structural intent, not asserted'] }],
  ['zk-alignment-proof', ZkAlignmentProofPage, { says: ['verified here', 'Rust'], detail: ['Honest divergence', 'hash-to-curve'] }],
];

const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

describe('each /show scene says how faithful it is', () => {
  for (const [slug, Page, { says, detail }] of PAGES) {
    describe(slug, () => {
      it('states its one limit in plain words, then folds the detail beneath it, closed', () => {
        const { container } = render(<Page />);
        const disclosures = [...container.querySelectorAll('details')].filter((d) => text(d.querySelector('summary')) === DISCLOSURE);
        expect(disclosures).toHaveLength(1);
        const [details] = disclosures;
        expect(details.hasAttribute('open')).toBe(false);

        const statement = details.previousElementSibling;
        expect(statement?.tagName).toBe('P');
        for (const words of says) expect(text(statement), words).toContain(words);

        const folded = text(details);
        for (const caveat of detail) expect(folded, caveat).toContain(caveat);
      });

      it('keeps no caveat block between the pitch and the demo', () => {
        const { container } = render(<Page />);
        const header = container.querySelector('header');
        const outside = [...(header?.querySelectorAll('p') ?? [])].filter((p) => !p.closest('details'));
        for (const label of ['Scope:', 'Honest divergence:', 'Public-demo caveat:']) {
          expect(outside.filter((p) => text(p).includes(label)).map(text), label).toEqual([]);
        }
      });
    });
  }
});
