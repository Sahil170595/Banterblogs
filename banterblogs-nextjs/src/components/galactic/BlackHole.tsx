'use client';

import * as THREE from 'three';
import { AccretionDisk } from './AccretionDisk';
import { GargantuaHalo } from './GargantuaHalo';

// The gravitational center, four strokes (the Gargantua grammar):
//   1. flat disk band crossing in front (real 3D plane, Kepler-sheared)
//   2. far side of the disk lensed OVER the shadow      } GargantuaHalo
//   3. fainter secondary image lensed UNDER the shadow  } billboard
//   4. razor photon ring hugging the silhouette         }
// The shadow itself is an opaque black sphere — negative space carved out
// of the brightest object on screen.

// Schwarzschild shadow is ~1.3x the horizon; we size the sphere to the
// SHADOW so the silhouette is what the camera reads.
const SHADOW_RADIUS = 1.9;

export function BlackHole() {
  return (
    <group>
      {/* Shadow — pure black, occludes disk and starfield behind it */}
      <mesh renderOrder={1}>
        <sphereGeometry args={[SHADOW_RADIUS, 48, 48]} />
        <meshBasicMaterial color="#000000" toneMapped={false} />
      </mesh>

      <GargantuaHalo shadowRadius={SHADOW_RADIUS} />

      {/* Front band: the real disk, nearly in-plane; camera elevation gives
          the razor ellipse and the halo supplies the lensed far side */}
      <group rotation={[THREE.MathUtils.degToRad(12), 0, THREE.MathUtils.degToRad(-6)]}>
        <AccretionDisk inner={SHADOW_RADIUS * 1.18} outer={9} />
      </group>
    </group>
  );
}
