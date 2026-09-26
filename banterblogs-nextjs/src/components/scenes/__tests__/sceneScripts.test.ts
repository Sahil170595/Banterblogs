// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// The /show narration reads like subtitles: each beat is one line on screen
// for as long as computeDwell gives it. 5ce8e65 capped beats at subtitle
// length but packed each to full width, so 69-95% of beats in four scenes
// ended mid-sentence and the visual moved on mid-thought. A beat now ends
// where a reader can pause: a sentence or a clause.

// subtitle length, as 5ce8e65 set it
const SUBTITLE_MAX_CHARS = 84;
// sentence or clause punctuation, optionally closed by a quote or bracket
const BEAT_BOUNDARY = /[.!?:;,—…][)\]"'”’]*$/;

const SCENES_DIR = path.join(process.cwd(), 'src', 'data', 'scenes');
const SCENES = ['streaming-ladder', 'bft-consensus', 'cognitive-agents', 'provenance-chain', 'zk-alignment-proof'];

interface SceneFile {
  records: { beats: { copy: string }[] }[];
}

function beatsOf(slug: string): { where: string; copy: string }[] {
  const scene = JSON.parse(fs.readFileSync(path.join(SCENES_DIR, `${slug}.json`), 'utf8')) as SceneFile;
  return scene.records.flatMap((record, r) => record.beats.map((beat, b) => ({ where: `${slug} record ${r + 1} beat ${b + 1}`, copy: beat.copy })));
}

describe('scene narration reads like subtitles', () => {
  it('knows what a boundary is', () => {
    for (const ends of ['The gate escalates.', 'Top-1 is 0.31,', 'one real, one simulated —', 'Skipped.)', 'is it safe?', 'three things:']) {
      expect(BEAT_BOUNDARY.test(ends), ends).toBe(true);
    }
    for (const breaks of ["the model itself wasn't", 'Fifteen hand-coded', 'r0 signs the']) {
      expect(BEAT_BOUNDARY.test(breaks), breaks).toBe(false);
    }
  });

  for (const slug of SCENES) {
    it(`${slug}: every beat fits one subtitle and ends where a reader can pause`, () => {
      const beats = beatsOf(slug);
      expect(beats.length).toBeGreaterThan(0);
      const tooLong = beats.filter(({ copy }) => copy.length > SUBTITLE_MAX_CHARS).map(({ where, copy }) => `${where} (${copy.length}): ${copy}`);
      const midThought = beats.filter(({ copy }) => !BEAT_BOUNDARY.test(copy.trim())).map(({ where, copy }) => `${where}: ${copy}`);
      expect(tooLong).toEqual([]);
      expect(midThought).toEqual([]);
    });
  }
});
