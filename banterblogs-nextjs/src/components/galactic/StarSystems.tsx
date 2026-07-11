'use client';

import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, Html, useCursor } from '@react-three/drei';
import * as THREE from 'three';
import { STAR_SYSTEMS, type GalacticSelection, type StarSystemDef } from './systems';
import { Sun } from './Sun';
import { SHADOW_RADIUS } from './BlackHole';
import { blackbodyToRGB } from './blackbody';

// Star-chart typography: labels render in a serif (the Times-family star
// atlas look) tinted to each sun's blackbody color.
const CHART_FONT = '"Times New Roman", Times, Georgia, serif';

function starCss(tempK: number): string {
  const [r, g, b] = blackbodyToRGB(tempK);
  return `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`;
}

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

function orbitalPosition(
  def: StarSystemDef,
  orientation: THREE.Quaternion,
  tSeconds: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  const M = def.phase + (2 * Math.PI * tSeconds) / def.period;
  const E = solveEccentricAnomaly(M % (2 * Math.PI), def.e);
  const x = def.a * (Math.cos(E) - def.e);
  const z = def.a * Math.sqrt(1 - def.e * def.e) * Math.sin(E);
  // orientation is the precomputed inc/node rotation - no per-frame allocation
  return out.set(x, 0, z).applyQuaternion(orientation);
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
  const labelRef = useRef<HTMLDivElement>(null);
  const scratch = useMemo(() => new THREE.Vector3(), []);
  const camLocal = useMemo(() => new THREE.Vector3(), []);
  const rayDir = useMemo(() => new THREE.Vector3(), []);
  const closest = useMemo(() => new THREE.Vector3(), []);
  const orientation = useMemo(
    () => new THREE.Quaternion().setFromEuler(new THREE.Euler(def.inc, def.node, 0, 'YXZ')),
    [def.inc, def.node],
  );
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  useFrame(({ clock, camera }) => {
    const group = groupRef.current;
    if (!group) return;
    group.position.copy(orbitalPosition(def, orientation, clock.elapsedTime, scratch));

    // Hide the label while the star transits BEHIND the shadow (the black
    // hole sits at this group's parent origin): closest-approach test of the
    // camera->star segment against the shadow sphere. DOM opacity toggled
    // directly — no React re-render on the frame loop.
    const label = labelRef.current;
    if (!label || !group.parent) return;
    camLocal.copy(camera.position);
    group.parent.worldToLocal(camLocal);
    rayDir.copy(group.position).sub(camLocal);
    const lengthSq = rayDir.lengthSq();
    const t = lengthSq > 0 ? -camLocal.dot(rayDir) / lengthSq : 0;
    const behindShadow =
      t > 0 &&
      t < 1 &&
      closest.copy(rayDir).multiplyScalar(t).add(camLocal).length() < SHADOW_RADIUS * 0.98;
    label.style.opacity = behindShadow ? '0' : '1';
  });

  return (
    <group ref={groupRef}>
      <Sun tempK={def.tempK} size={def.size * 1.05} seed={def.a + def.e * 10} />
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
      {/* always-on star-atlas tag: transparent block, serif, sun-colored */}
      <Html
        position={[0, def.size + 0.7, 0]}
        center
        distanceFactor={24}
        style={{ pointerEvents: 'none' }}
        zIndexRange={[10, 0]}
      >
        <div
          ref={labelRef}
          className="whitespace-nowrap transition-all duration-200"
          // width: max-content beats the Html wrapper's constraint — no mid-name wraps
          style={{
            width: 'max-content',
            fontFamily: CHART_FONT,
            color: starCss(def.tempK),
            textShadow: '0 1px 14px rgb(0 0 0), 0 0 5px rgb(0 0 0)',
          }}
        >
          <span className="text-[12px] italic tracking-[0.08em]">{def.name}</span>
          {hovered && (
            <span className="ml-2 text-[10px] not-italic opacity-80">{def.blurb}</span>
          )}
        </div>
      </Html>
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
          <Line points={paths[i]} color="#8a8f99" transparent opacity={0.035} linewidth={1} />
          <Star def={def} onSelect={onSelect} />
        </group>
      ))}
    </group>
  );
}
