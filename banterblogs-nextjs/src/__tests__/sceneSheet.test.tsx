import fs from 'node:fs';
import path from 'node:path';
import type { ComponentProps, ComponentType } from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import globalConfig from '../../tailwind.config';
import scenesConfig from '../../tailwind.scenes.config';
import { BftConsensus } from '@/components/scenes/BftConsensus';
import { CognitiveAgents } from '@/components/scenes/CognitiveAgents';
import { ProvenanceChain } from '@/components/scenes/ProvenanceChain';
import { StreamingLadder } from '@/components/scenes/StreamingLadder';
import { ZkAlignmentProof } from '@/components/scenes/ZkAlignmentProof';
import bftData from '@/data/scenes/bft-consensus.json';
import cognitiveData from '@/data/scenes/cognitive-agents.json';
import provenanceData from '@/data/scenes/provenance-chain.json';
import ladderData from '@/data/scenes/streaming-ladder.json';
import zkData from '@/data/scenes/zk-alignment-proof.json';

// The /show scenes' utilities ride in their own sheet, as the reading
// routes' prose rides in reading.css. In the global sheet, which every page
// blocks its first paint on, they were 16 KB of the 101: enough to push it
// past the size where Turbopack splits the fonts into a second render-
// blocking sheet on every page. The scene sheet is scoped to [data-scene],
// so its utilities can't reorder the page chrome's around a scene.

const ROOT = process.cwd();
const SCENES_GLOB = './src/components/scenes/**/*.{js,ts,jsx,tsx,mdx}';
const SCENE_SCOPE = '[data-scene]';
const SCENE_SHEET_IMPORT = "import '@/app/show/scenes.css';";
const SLUGS = ['streaming-ladder', 'bft-consensus', 'cognitive-agents', 'provenance-chain', 'zk-alignment-proof'];

type Scene = [string, ComponentType<{ data: never }>, unknown];
const SCENES: Scene[] = [
  ['StreamingLadder', StreamingLadder as ComponentType<{ data: never }>, ladderData],
  ['BftConsensus', BftConsensus as ComponentType<{ data: never }>, bftData],
  ['CognitiveAgents', CognitiveAgents as ComponentType<{ data: never }>, cognitiveData],
  ['ProvenanceChain', ProvenanceChain as ComponentType<{ data: never }>, provenanceData],
  ['ZkAlignmentProof', ZkAlignmentProof as ComponentType<{ data: never }>, zkData],
];

describe('the scene sheet', () => {
  it('keeps the scene components out of the global sheet', () => {
    expect(globalConfig.content).toContain(`!${SCENES_GLOB}`);
  });

  it('builds the scene sheet from the scene components alone, scoped to the scene root', () => {
    expect(scenesConfig.content).toEqual([SCENES_GLOB]);
    expect(scenesConfig.important).toBe(SCENE_SCOPE);
    const sheet = fs.readFileSync(path.join(ROOT, 'src', 'app', 'show', 'scenes.css'), 'utf8');
    expect(sheet).toMatch(/@config "\.\.\/\.\.\/\.\.\/tailwind\.scenes\.config\.ts";/);
    expect(sheet).toMatch(/@tailwind utilities;/);
    expect(sheet).not.toMatch(/@tailwind (base|components);/);
  });

  it('is loaded by every scene page and by nothing else', () => {
    for (const slug of SLUGS) {
      expect(fs.readFileSync(path.join(ROOT, 'src', 'app', 'show', slug, 'page.tsx'), 'utf8'), slug).toContain(SCENE_SHEET_IMPORT);
    }
    expect(fs.readFileSync(path.join(ROOT, 'src', 'app', 'show', 'page.tsx'), 'utf8')).not.toContain('scenes.css');
  });

  for (const [name, Scene, data] of SCENES) {
    it(`${name} renders inside a scene root that leaves the layout alone`, () => {
      const { container } = render(<Scene data={data as ComponentProps<typeof Scene>['data']} />);
      const root = container.firstElementChild as HTMLElement;
      expect(root.hasAttribute('data-scene')).toBe(true);
      expect(root.style.display).toBe('contents');
    });
  }
});
