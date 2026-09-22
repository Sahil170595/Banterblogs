// Fingerprint of everything that decides what the landing scene's opening
// frame looks like: the scene's source (comments and layout ignored), the
// orbital elements of the nine systems, and the installed versions of the
// 3D stack. render-scene-poster.mjs stores it with the poster it renders;
// scenePoster.test.tsx fails when the scene has moved on without a new
// poster, which would bring back a crossfade between two pictures.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const GALACTIC = 'src/components/galactic';

export const SCENE_SOURCES = [
  'GalacticScene.tsx',
  'BlackHole.tsx',
  'AccretionDisk.tsx',
  'GargantuaHalo.tsx',
  'Starfield.tsx',
  'StarSystems.tsx',
  'Sun.tsx',
  'shaderChunks.ts',
  'blackbody.ts',
  'galacticMath.ts',
].map((file) => `${GALACTIC}/${file}`);

// only the orbital lines of systems.ts move a star; names and copy do not
export const SYSTEMS_SOURCE = `${GALACTIC}/systems.ts`;
const ORBITAL_LINE = /^\s*(a|tempK):|KEPLER_K/;

export const SCENE_PACKAGES = [
  'three',
  '@react-three/fiber',
  '@react-three/drei',
  '@react-three/postprocessing',
  'postprocessing',
];

const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g;
// a // comment starts a line or follows whitespace (keeps "https://" intact)
const LINE_COMMENT = /(^|\s)\/\/.*$/gm;
const WHITESPACE = /\s+/g;

const normalise = (source) =>
  source.replace(BLOCK_COMMENT, ' ').replace(LINE_COMMENT, '$1').replace(WHITESPACE, ' ').trim();

/** sha256 (hex) of the scene as it renders, from the app root `root`. */
export function sceneFingerprint(root) {
  const hash = createHash('sha256');
  for (const file of SCENE_SOURCES) {
    hash.update(`${file}\n${normalise(readFileSync(path.join(root, file), 'utf8'))}\n`);
  }
  const orbits = readFileSync(path.join(root, SYSTEMS_SOURCE), 'utf8')
    .split(/\r?\n/)
    .filter((line) => ORBITAL_LINE.test(line))
    .map((line) => line.trim());
  hash.update(`${SYSTEMS_SOURCE}\n${orbits.join('\n')}\n`);
  for (const name of SCENE_PACKAGES) {
    const { version } = JSON.parse(readFileSync(path.join(root, 'node_modules', name, 'package.json'), 'utf8'));
    hash.update(`${name}@${version}\n`);
  }
  return hash.digest('hex');
}
