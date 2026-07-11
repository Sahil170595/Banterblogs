'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, useCursor } from '@react-three/drei';
import * as THREE from 'three';
import { STAR_SYSTEMS, type GalacticSelection, type StarSystemDef } from './systems';
import { Sun } from './Sun';
import { SHADOW_RADIUS } from './BlackHole';
import { blackbodyToRGB } from './blackbody';

const LABEL_TEXTURE_HEIGHT = 64;
const LABEL_WORLD_HEIGHT = 0.5;
const LABEL_REFERENCE_DISTANCE = 27;
const LABEL_FONT = '600 20px monospace';

function starRgb(tempK: number): [number, number, number] {
  const [r, g, b] = blackbodyToRGB(tempK);
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function starCss(tempK: number): string {
  const [r, g, b] = starRgb(tempK);
  return `rgb(${r}, ${g}, ${b})`;
}

function createLabelTexture(name: string, tempK: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  const measureContext = canvas.getContext('2d');
  if (!measureContext) throw new Error(`Unable to measure label texture for ${name}`);
  measureContext.font = LABEL_FONT;
  canvas.width = Math.ceil(measureContext.measureText(name.toUpperCase()).width + name.length * 3 + 52);
  canvas.height = LABEL_TEXTURE_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error(`Unable to create label texture for ${name}`);

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.textBaseline = 'middle';
  context.font = LABEL_FONT;
  context.letterSpacing = '3px';
  context.shadowColor = 'rgba(0, 0, 0, 0.95)';
  context.shadowBlur = 10;
  context.fillStyle = starCss(tempK);
  context.beginPath();
  context.arc(18, canvas.height / 2, 4, 0, Math.PI * 2);
  context.fill();
  context.fillText(name.toUpperCase(), 34, canvas.height / 2 + 1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

const NEWTON_ITERATIONS = 5;

function solveEccentricAnomaly(meanAnomaly: number, e: number): number {
  let eccentricAnomaly = meanAnomaly;
  for (let i = 0; i < NEWTON_ITERATIONS; i++) {
    eccentricAnomaly -=
      (eccentricAnomaly - e * Math.sin(eccentricAnomaly) - meanAnomaly) /
      (1 - e * Math.cos(eccentricAnomaly));
  }
  return eccentricAnomaly;
}

function orbitalPosition(
  def: StarSystemDef,
  orientation: THREE.Quaternion,
  tSeconds: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  const meanAnomaly = def.phase + (2 * Math.PI * tSeconds) / def.period;
  const eccentricAnomaly = solveEccentricAnomaly(meanAnomaly % (2 * Math.PI), def.e);
  const x = def.a * (Math.cos(eccentricAnomaly) - def.e);
  const z = def.a * Math.sqrt(1 - def.e * def.e) * Math.sin(eccentricAnomaly);
  return out.set(x, 0, z).applyQuaternion(orientation);
}

function orbitPath(def: StarSystemDef, segments = 128): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const eccentricAnomaly = (i / segments) * Math.PI * 2;
    const x = def.a * (Math.cos(eccentricAnomaly) - def.e);
    const z = def.a * Math.sqrt(1 - def.e * def.e) * Math.sin(eccentricAnomaly);
    points.push(
      new THREE.Vector3(x, 0, z).applyEuler(new THREE.Euler(def.inc, def.node, 0, 'YXZ')),
    );
  }
  return points;
}

interface StarProps {
  def: StarSystemDef;
  hovered: boolean;
  onHoverChange: (hovered: boolean) => void;
  onSelect: (selection: GalacticSelection) => void;
}

function Star({ def, hovered, onHoverChange, onSelect }: StarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const labelRef = useRef<THREE.Sprite>(null);
  const labelMaterialRef = useRef<THREE.SpriteMaterial>(null);
  const scratch = useMemo(() => new THREE.Vector3(), []);
  const camLocal = useMemo(() => new THREE.Vector3(), []);
  const rayDir = useMemo(() => new THREE.Vector3(), []);
  const closest = useMemo(() => new THREE.Vector3(), []);
  const projected = useMemo(() => new THREE.Vector3(), []);
  const orientation = useMemo(
    () => new THREE.Quaternion().setFromEuler(new THREE.Euler(def.inc, def.node, 0, 'YXZ')),
    [def.inc, def.node],
  );
  const labelTexture = useMemo(() => createLabelTexture(def.name, def.tempK), [def.name, def.tempK]);
  const labelAspect = labelTexture.image.width / labelTexture.image.height;
  useEffect(() => () => labelTexture.dispose(), [labelTexture]);
  useCursor(hovered);

  useFrame(({ clock, camera }) => {
    const group = groupRef.current;
    const label = labelRef.current;
    const labelMaterial = labelMaterialRef.current;
    if (!group || !label || !labelMaterial || !group.parent) return;
    group.position.copy(orbitalPosition(def, orientation, clock.elapsedTime, scratch));

    camLocal.copy(camera.position);
    group.parent.worldToLocal(camLocal);
    rayDir.copy(group.position).sub(camLocal);
    const lengthSq = rayDir.lengthSq();
    const t = lengthSq > 0 ? -camLocal.dot(rayDir) / lengthSq : 0;
    const behindShadow =
      t > 0 &&
      t < 1 &&
      closest.copy(rayDir).multiplyScalar(t).add(camLocal).length() < SHADOW_RADIUS * 0.98;

    projected.copy(group.position);
    group.parent.localToWorld(projected);
    const cameraDistance = camera.position.distanceTo(projected);
    const distanceScale = THREE.MathUtils.clamp(cameraDistance / LABEL_REFERENCE_DISTANCE, 0.7, 1.35);
    projected.project(camera);
    const insideCopySafeZone = projected.x < -0.3 && projected.y > 0.22;
    const restingOpacity = def.labelTier === 'anchor' ? 0.72 : 0;
    labelMaterial.opacity =
      behindShadow || insideCopySafeZone ? 0 : hovered ? 1 : restingOpacity;
    label.scale.set(
      labelAspect * LABEL_WORLD_HEIGHT * distanceScale,
      LABEL_WORLD_HEIGHT * distanceScale,
      1,
    );
  });

  return (
    <group ref={groupRef}>
      <Sun tempK={def.tempK} size={def.size * 1.05} seed={def.a + def.e * 10} />
      <mesh
        visible={false}
        onPointerOver={(event) => {
          event.stopPropagation();
          onHoverChange(true);
        }}
        onPointerOut={() => onHoverChange(false)}
        onClick={(event) => {
          event.stopPropagation();
          onSelect({ kind: 'star', system: def });
        }}
      >
        <sphereGeometry args={[Math.max(def.size * 3.2, 1.15), 8, 8]} />
      </mesh>

      <sprite ref={labelRef} position={[0, def.size + 0.72, 0]} renderOrder={4}>
        <spriteMaterial
          ref={labelMaterialRef}
          map={labelTexture}
          transparent
          opacity={def.labelTier === 'anchor' ? 0.72 : 0}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
    </group>
  );
}

interface SystemProps {
  def: StarSystemDef;
  path: THREE.Vector3[];
  onSelect: (selection: GalacticSelection) => void;
}

function System({ def, path, onSelect }: SystemProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <group>
      <Line
        points={path}
        color={hovered ? starCss(def.tempK) : '#8a8f99'}
        transparent
        opacity={hovered ? 0.22 : 0.012}
        linewidth={1}
        depthWrite={false}
      />
      <Star def={def} hovered={hovered} onHoverChange={setHovered} onSelect={onSelect} />
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
      {STAR_SYSTEMS.map((def, index) => (
        <System key={def.name} def={def} path={paths[index]} onSelect={onSelect} />
      ))}
    </group>
  );
}
