'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, useCursor } from '@react-three/drei';
import * as THREE from 'three';
import { STAR_SYSTEMS, type GalacticSelection, type StarSystemDef } from './systems';
import { Sun } from './Sun';
import { SHADOW_RADIUS, DISK_INNER_RADIUS, DISK_OUTER_RADIUS } from './BlackHole';
import { blackbodyToRGB } from './blackbody';
import {
  solveEccentricAnomaly,
  segmentOccludedBySphere,
  segmentCrossesDiskAnnulus,
} from './galacticMath';

// Label sprite rendering
const LABEL_TEXTURE_HEIGHT = 64;
const LABEL_WORLD_HEIGHT = 0.5;
const LABEL_REFERENCE_DISTANCE = 27;
const LABEL_FONT = '600 20px monospace';
// Resting visibility: anchors carry the atlas at rest; quiet systems stay
// faint-but-perceivable (0 made the map read as wallpaper — blind review H2)
const LABEL_RESTING_ANCHOR = 0.72;
const LABEL_RESTING_QUIET = 0.35;
// Tracked-by-ticker glow — just under hover's 1.0 so pointer intent still reads
const LABEL_FEATURED = 0.92;
// Orbit lines: perceivable at rest, lit on hover
const ORBIT_OPACITY_RESTING = 0.07;
const ORBIT_OPACITY_HOVER = 0.22;
// Interaction geometry
const HIT_TARGET_SCALE = 3.2; // stars are a few pixels — hit sphere is generous
const HIT_TARGET_MIN_RADIUS = 1.15;
const SHADOW_OCCLUSION_MARGIN = 0.98; // slightly inside the silhouette edge
// NDC region reserved for the hero copy block (top-left)
const SAFE_ZONE_NDC_X = -0.3;
const SAFE_ZONE_NDC_Y = 0.22;

function starRgb(tempK: number): [number, number, number] {
  const [r, g, b] = blackbodyToRGB(tempK);
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function starCss(tempK: number): string {
  const [r, g, b] = starRgb(tempK);
  return `rgb(${r}, ${g}, ${b})`;
}

function createLabelTexture(name: string, tempK: number): THREE.CanvasTexture | null {
  const canvas = document.createElement('canvas');
  const measureContext = canvas.getContext('2d');
  if (!measureContext) return null; // no 2D context: skip the label, keep the scene alive
  measureContext.font = LABEL_FONT;
  canvas.width = Math.ceil(measureContext.measureText(name.toUpperCase()).width + name.length * 3 + 52);
  canvas.height = LABEL_TEXTURE_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) return null;

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
  featured: boolean;
  onHoverChange: (hovered: boolean) => void;
  onSelect: (selection: GalacticSelection) => void;
}

function Star({ def, hovered, featured, onHoverChange, onSelect }: StarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const labelRef = useRef<THREE.Sprite>(null);
  const labelMaterialRef = useRef<THREE.SpriteMaterial>(null);
  const scratch = useMemo(() => new THREE.Vector3(), []);
  const camLocal = useMemo(() => new THREE.Vector3(), []);
  const projected = useMemo(() => new THREE.Vector3(), []);
  const orientation = useMemo(
    () => new THREE.Quaternion().setFromEuler(new THREE.Euler(def.inc, def.node, 0, 'YXZ')),
    [def.inc, def.node],
  );
  // Effect-owned texture: StrictMode double-invokes useMemo and would leak a
  // GPU-backed canvas texture per star per mount (blind review L1)
  const [labelTexture, setLabelTexture] = useState<THREE.CanvasTexture | null>(null);
  useEffect(() => {
    const texture = createLabelTexture(def.name, def.tempK);
    // canvas textures only exist client-side post-mount; effect-owned so the
    // cleanup disposes GPU memory (StrictMode-safe)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLabelTexture(texture);
    return () => texture?.dispose();
  }, [def.name, def.tempK]);
  const labelAspect = labelTexture ? labelTexture.image.width / labelTexture.image.height : 1;
  useCursor(hovered);

  const restingOpacity = def.labelTier === 'anchor' ? LABEL_RESTING_ANCHOR : LABEL_RESTING_QUIET;

  useFrame(({ clock, camera }) => {
    const group = groupRef.current;
    const label = labelRef.current;
    const labelMaterial = labelMaterialRef.current;
    if (!group || !group.parent) return;
    group.position.copy(orbitalPosition(def, orientation, clock.elapsedTime, scratch));
    if (!label || !labelMaterial) return;

    camLocal.copy(camera.position);
    group.parent.worldToLocal(camLocal);
    // Hide the label when the star sits behind the shadow OR behind the
    // opaque disk sheet — a floating tag over a hidden star is an orphan
    const occluded =
      segmentOccludedBySphere(camLocal, group.position, SHADOW_RADIUS * SHADOW_OCCLUSION_MARGIN) ||
      segmentCrossesDiskAnnulus(camLocal, group.position, DISK_INNER_RADIUS, DISK_OUTER_RADIUS);

    projected.copy(group.position);
    group.parent.localToWorld(projected);
    const cameraDistance = camera.position.distanceTo(projected);
    const distanceScale = THREE.MathUtils.clamp(cameraDistance / LABEL_REFERENCE_DISTANCE, 0.7, 1.35);
    projected.project(camera);
    const insideCopySafeZone = projected.x < SAFE_ZONE_NDC_X && projected.y > SAFE_ZONE_NDC_Y;
    labelMaterial.opacity =
      occluded || insideCopySafeZone ? 0 : hovered ? 1 : featured ? LABEL_FEATURED : restingOpacity;
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
        <sphereGeometry args={[Math.max(def.size * HIT_TARGET_SCALE, HIT_TARGET_MIN_RADIUS), 8, 8]} />
      </mesh>

      {labelTexture && (
        <sprite ref={labelRef} position={[0, def.size + 0.72, 0]} renderOrder={4}>
          <spriteMaterial
            ref={labelMaterialRef}
            map={labelTexture}
            transparent
            opacity={restingOpacity}
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
      )}
    </group>
  );
}

interface SystemProps {
  def: StarSystemDef;
  path: THREE.Vector3[];
  featured: boolean;
  onSelect: (selection: GalacticSelection) => void;
  onHover: (name: string, hovering: boolean) => void;
}

function System({ def, path, featured, onSelect, onHover }: SystemProps) {
  const [hovered, setHovered] = useState(false);
  const lit = hovered || featured;

  return (
    <group>
      <Line
        points={path}
        color={lit ? starCss(def.tempK) : '#8a8f99'}
        transparent
        opacity={lit ? ORBIT_OPACITY_HOVER : ORBIT_OPACITY_RESTING}
        linewidth={1}
        depthWrite={false}
      />
      <Star
        def={def}
        hovered={hovered}
        featured={featured}
        onHoverChange={(hovering) => {
          setHovered(hovering);
          onHover(def.name, hovering);
        }}
        onSelect={onSelect}
      />
    </group>
  );
}

interface StarSystemsProps {
  /** system currently narrated by the tracking ticker — glows like a hover */
  featuredName: string | null;
  onSelect: (selection: GalacticSelection) => void;
  onHover: (name: string, hovering: boolean) => void;
}

export function StarSystems({ featuredName, onSelect, onHover }: StarSystemsProps) {
  const paths = useMemo(() => STAR_SYSTEMS.map((def) => orbitPath(def)), []);

  return (
    <group>
      {STAR_SYSTEMS.map((def, index) => (
        <System
          key={def.name}
          def={def}
          path={paths[index]}
          featured={featuredName === def.name}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}
    </group>
  );
}
