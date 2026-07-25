'use client';

import { useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import {
  Bloom,
  EffectComposer,
  SMAA,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { BlackHole } from './BlackHole';
import { StarSystems } from './StarSystems';
import { Starfield } from './Starfield';
import {
  CAMERA_OPENING,
  SYSTEM_ORIGIN,
  cameraBaseAt,
  cameraFovAt,
  cameraTargetForViewport,
  cinematicRevealProgress,
} from './sceneChoreography';
import type { GalacticSelection } from './systems';

const PARALLAX_X = 1.15;
const PARALLAX_Y = 0.72;
const AMBIENT_DRIFT_X = 0.42;
const AMBIENT_DRIFT_Y = 0.22;
const POINTER_DAMPING = 2.6;
const TARGET_DAMPING = 3.2;

type QualityTier = 'low' | 'medium' | 'high';

const QUALITY = {
  low: { dpr: 1, starCount: 2800, bloomLevels: 3 },
  medium: { dpr: 1.35, starCount: 4600, bloomLevels: 4 },
  high: { dpr: 1.6, starCount: 6800, bloomLevels: 5 },
} as const satisfies Record<
  QualityTier,
  { dpr: number; starCount: number; bloomLevels: number }
>;

function lowerQuality(tier: QualityTier): QualityTier {
  if (tier === 'high') return 'medium';
  return 'low';
}

function CameraRig() {
  const { camera, pointer, size } = useThree();
  const parallax = useRef(new THREE.Vector2());
  const lookTarget = useRef(
    new THREE.Vector3(...cameraTargetForViewport(size.width)),
  );

  useFrame(({ clock }, delta) => {
    const elapsed = clock.elapsedTime;
    const reveal = cinematicRevealProgress(elapsed);
    const base = cameraBaseAt(elapsed);
    const target = cameraTargetForViewport(size.width);

    parallax.current.x = THREE.MathUtils.damp(
      parallax.current.x,
      pointer.x * PARALLAX_X * reveal,
      POINTER_DAMPING,
      delta,
    );
    parallax.current.y = THREE.MathUtils.damp(
      parallax.current.y,
      -pointer.y * PARALLAX_Y * reveal,
      POINTER_DAMPING,
      delta,
    );

    const driftX = Math.sin(elapsed * 0.11) * AMBIENT_DRIFT_X * reveal;
    const driftY = Math.sin(elapsed * 0.071) * AMBIENT_DRIFT_Y * reveal;
    camera.position.set(
      base[0] + driftX + parallax.current.x,
      base[1] + driftY + parallax.current.y,
      base[2],
    );
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = cameraFovAt(elapsed);
      camera.updateProjectionMatrix();
    }

    lookTarget.current.x = THREE.MathUtils.damp(
      lookTarget.current.x,
      target[0],
      TARGET_DAMPING,
      delta,
    );
    lookTarget.current.y = THREE.MathUtils.damp(
      lookTarget.current.y,
      target[1],
      TARGET_DAMPING,
      delta,
    );
    lookTarget.current.z = target[2];
    camera.lookAt(lookTarget.current);
  });

  return null;
}

interface GalacticSceneProps {
  onSelect: (selection: GalacticSelection | null) => void;
  featuredName: string | null;
  onStarHover: (name: string, hovering: boolean) => void;
  onReady: () => void;
  onUnavailable: () => void;
}

export default function GalacticScene({
  onSelect,
  featuredName,
  onStarHover,
  onReady,
  onUnavailable,
}: GalacticSceneProps) {
  const [quality, setQuality] = useState<QualityTier>('medium');
  const settings = QUALITY[quality];

  return (
    <Canvas
      camera={{ position: [...CAMERA_OPENING], fov: 38, near: 0.1, far: 400 }}
      dpr={settings.dpr}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      style={{ background: '#020305' }}
      onPointerMissed={() => onSelect(null)}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener(
          'webglcontextlost',
          (event) => {
            event.preventDefault();
            onUnavailable();
          },
          { once: true },
        );
        requestAnimationFrame(() => requestAnimationFrame(onReady));
      }}
    >
      <PerformanceMonitor
        onIncline={() => setQuality('high')}
        onDecline={() => setQuality((current) => lowerQuality(current))}
        onFallback={() => setQuality('low')}
      />
      <color attach="background" args={['#020305']} />
      <CameraRig />
      <Starfield count={settings.starCount} />
      <group position={[...SYSTEM_ORIGIN]}>
        <BlackHole onSelect={onSelect} />
        <StarSystems
          featuredName={featuredName}
          onSelect={onSelect}
          onHover={onStarHover}
        />
      </group>

      <EffectComposer multisampling={0}>
        <Bloom
          intensity={0.38}
          luminanceThreshold={1.02}
          luminanceSmoothing={0.16}
          mipmapBlur
          radius={0.32}
          levels={settings.bloomLevels}
        />
        <SMAA />
        <ToneMapping mode={ToneMappingMode.AGX} />
        <Vignette eskil={false} offset={0.24} darkness={0.54} />
      </EffectComposer>
    </Canvas>
  );
}
