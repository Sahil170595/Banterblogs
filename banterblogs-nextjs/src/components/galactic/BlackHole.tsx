'use client';

import { useState } from 'react';
import { useCursor } from '@react-three/drei';
import * as THREE from 'three';
import { AccretionDisk } from './AccretionDisk';
import { GargantuaHalo } from './GargantuaHalo';
import type { GalacticSelection } from './systems';

// The gravitational center, four strokes (the Gargantua grammar):
//   1. flat disk band crossing in front (real 3D plane, Kepler-sheared)
//   2. far side of the disk lensed OVER the shadow      } GargantuaHalo
//   3. fainter secondary image lensed UNDER the shadow  } billboard
//   4. razor photon ring hugging the silhouette         }
// The shadow itself is an opaque black sphere — negative space carved out
// of the brightest object on screen. Clicking it selects the core: the
// black hole IS Chimera, the architecture everything else orbits.

// Schwarzschild shadow is ~1.3x the horizon; we size the sphere to the
// SHADOW so the silhouette is what the camera reads.
const SHADOW_RADIUS = 3.0;

interface BlackHoleProps {
  onSelect: (selection: GalacticSelection) => void;
}

export function BlackHole({ onSelect }: BlackHoleProps) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  return (
    <group>
      {/* Shadow — pure black, occludes disk and starfield behind it.
          Also the click target for the core. */}
      <mesh
        renderOrder={1}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          onSelect({ kind: 'core' });
        }}
      >
        <sphereGeometry args={[SHADOW_RADIUS, 48, 48]} />
        <meshBasicMaterial color="#000000" toneMapped={false} />
      </mesh>

      <GargantuaHalo shadowRadius={SHADOW_RADIUS} />

      {/* Front band: the real disk, nearly in-plane; camera elevation gives
          the razor ellipse and the halo supplies the lensed far side */}
      <group rotation={[THREE.MathUtils.degToRad(6), 0, THREE.MathUtils.degToRad(-4)]}>
        {/* ISCO at 1.155 R (Schwarzschild: 3 r_s / 2.6 r_s); span 6x per art direction */}
        <AccretionDisk inner={SHADOW_RADIUS * 1.155} outer={SHADOW_RADIUS * 6} />
      </group>
    </group>
  );
}
