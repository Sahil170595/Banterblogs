'use client';

import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, Html, useCursor } from '@react-three/drei';
import * as THREE from 'three';
import { STAR_SYSTEMS, type GalacticSelection, type StarSystemDef } from './systems';
import { blackbodyToRGB } from './blackbody';

// Nine repos on real Keplerian orbits — the interactive layer of the scene.
// Positions come from solving Kepler's equation (Newton iterations on the
// eccentric anomaly) so eccentric systems genuinely accelerate through
// periapsis — Project Wyvern's e=0.82 plunge is the S2-around-Sgr A* moment.
// Hover names a system; click opens it.

const NEWTON_ITERATIONS = 5;

function solveEccentricAnomaly(meanAnomaly: number, e: number): number {
  let E = meanAnomaly;
  for (let i = 0; i < NEWTON_ITERATIONS; i++) {
    E = E - (E - e * Math.sin(E) - meanAnomaly) / (1 - e * Math.cos(E));
  }
  return E;
}

function orbitalPosition(def: StarSystemDef, tSeconds: number, out: THREE.Vector3): THREE.Vector3 {
  const M = def.phase + (2 * Math.PI * tSeconds) / def.period;
  const E = solveEccentricAnomaly(M % (2 * Math.PI), def.e);
  const x = def.a * (Math.cos(E) - def.e);
  const z = def.a * Math.sqrt(1 - def.e * def.e) * Math.sin(E);
  out.set(x, 0, z);
  out.applyEuler(new THREE.Euler(def.inc, def.node, 0, 'YXZ'));
  return out;
}

function orbitPath(def: StarSystemDef, segments = 128): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const E = (i / segments) * Math.PI * 2;
    const x = def.a * (Math.cos(E) - def.e);
    const z = def.a * Math.sqrt(1 - def.e * def.e) * Math.sin(E);
    const v = new THREE.Vector3(x, 0, z);
    v.applyEuler(new THREE.Euler(def.inc, def.node, 0, 'YXZ'));
    points.push(v);
  }
  return points;
}

interface StarProps {
  def: StarSystemDef;
  onSelect: (selection: GalacticSelection) => void;
}

function Star({ def, onSelect }: StarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const scratch = useMemo(() => new THREE.Vector3(), []);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  // modest over-unity so bloom lifts the star without clipping its
  // blackbody hue to white
  const color = useMemo(() => {
    const [r, g, b] = blackbodyToRGB(def.tempK);
    return new THREE.Color(r * 1.8, g * 1.8, b * 1.8);
  }, [def.tempK]);

  const haloColor = useMemo(() => {
    const [r, g, b] = blackbodyToRGB(def.tempK);
    return new THREE.Color(r, g, b);
  }, [def.tempK]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.position.copy(orbitalPosition(def, clock.elapsedTime, scratch));
  });

  return (
    <group ref={groupRef}>
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          onSelect({ kind: 'star', system: def });
        }}
      >
        <sphereGeometry args={[def.size * 1.05, 24, 24]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {/* blackbody-tinted corona — carries the temperature read */}
      <mesh scale={2.1}>
        <sphereGeometry args={[def.size * 1.05, 16, 16]} />
        <meshBasicMaterial
          color={haloColor}
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* generous invisible hit target — the star itself is a few pixels */}
      <mesh
        visible={false}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          onSelect({ kind: 'star', system: def });
        }}
      >
        <sphereGeometry args={[Math.max(def.size * 3.2, 1.15), 8, 8]} />
      </mesh>
      {hovered && (
        <Html
          position={[0, def.size + 0.6, 0]}
          center
          distanceFactor={26}
          style={{ pointerEvents: 'none' }}
        >
          <div className="w-52 rounded-lg border border-border/60 bg-background/90 px-3 py-2 backdrop-blur">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
              {def.name}
            </p>
            <p className="mt-1 text-[10px] leading-snug text-muted-foreground">{def.blurb}</p>
          </div>
        </Html>
      )}
    </group>
  );
}

interface StarSystemsProps {
  onSelect: (selection: GalacticSelection) => void;
}

export function StarSystems({ onSelect }: StarSystemsProps) {
  const paths = useMemo(() => STAR_SYSTEMS.map((def) => orbitPath(def)), []);

  return (
    <group>
      {STAR_SYSTEMS.map((def, i) => (
        <group key={def.name}>
          {/* near-invisible until you look for them — emptiness budget */}
          <Line points={paths[i]} color="#8a8f99" transparent opacity={0.05} linewidth={1} />
          <Star def={def} onSelect={onSelect} />
        </group>
      ))}
    </group>
  );
}
