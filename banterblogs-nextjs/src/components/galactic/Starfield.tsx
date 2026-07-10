'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { blackbodyToRGB } from './blackbody';

// Background starfield: points on a distant shell with blackbody-tinted
// colors (weighted toward cool stars, like a real population) and a faint
// galactic band. Drifts imperceptibly so the void feels alive.

interface StarfieldProps {
  count?: number;
}

export function Starfield({ count = 7000 }: StarfieldProps) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const rand = mulberry32(0xc0ffee); // seeded: same sky every visit

    for (let i = 0; i < count; i++) {
      // shell 90..170, with a third of the stars squeezed toward a band
      const inBand = rand() < 0.34;
      const r = 90 + rand() * 80;
      const theta = rand() * Math.PI * 2;
      const bandSqueeze = inBand ? 0.12 : 1;
      const phi = Math.acos(2 * rand() - 1);
      const y = Math.cos(phi) * bandSqueeze;
      const s = Math.sqrt(Math.max(0, 1 - y * y));
      positions[i * 3] = r * s * Math.cos(theta);
      positions[i * 3 + 1] = r * y;
      positions[i * 3 + 2] = r * s * Math.sin(theta);

      // stellar population: mostly cool, occasionally hot
      const t = rand();
      const kelvin = t < 0.6 ? 2600 + rand() * 2200 : t < 0.9 ? 4800 + rand() * 2400 : 7500 + rand() * 8000;
      const [cr, cg, cb] = blackbodyToRGB(kelvin);
      const brightness = 0.35 + rand() * 0.65;
      colors[i * 3] = cr * brightness;
      colors[i * 3 + 1] = cg * brightness;
      colors[i * 3 + 2] = cb * brightness;

      sizes[i] = 0.3 + rand() * 1.1;
    }
    return { positions, colors, sizes };
  }, [count]);

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.004;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.42}
        vertexColors
        sizeAttenuation
        transparent
        opacity={0.55}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

// Deterministic PRNG — Date.now/Math.random would re-roll the sky per render.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
