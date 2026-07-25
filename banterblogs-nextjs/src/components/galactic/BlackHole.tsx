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

// For a distant Schwarzschild observer the shadow radius is 3√3 GM/c²,
// approximately 2.598 times the horizon radius. We size the sphere to that
// apparent SHADOW, because the silhouette is what the camera reads.
export const SHADOW_RADIUS = 3.0;
// ISCO at 1.155 R (3 r_s / 2.6 r_s); 5x span keeps the outer ellipse in
// frame. Exported so label occlusion can test against the opaque sheet.
export const DISK_INNER_RADIUS = SHADOW_RADIUS * 1.155;
export const DISK_OUTER_RADIUS = SHADOW_RADIUS * 5;
export const DISK_TILT_X = THREE.MathUtils.degToRad(6);
export const DISK_TILT_Z = THREE.MathUtils.degToRad(-4);

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
      <group rotation={[DISK_TILT_X, 0, DISK_TILT_Z]}>
        <AccretionDisk inner={DISK_INNER_RADIUS} outer={DISK_OUTER_RADIUS} />
      </group>
    </group>
  );
}
