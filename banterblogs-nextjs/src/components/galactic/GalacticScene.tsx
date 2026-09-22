'use client';

import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { BlackHole } from './BlackHole';
import { SCENE_BACKGROUND, SCENE_OPENING_RENDER_MS, createWarmupGate, sceneTimeRate } from './sceneOpening';
import { StarSystems } from './StarSystems';
import { Starfield } from './Starfield';
import type { GalacticSelection } from './systems';

// Camera rig: slow ambient drift + pointer parallax, eased. The camera looks
// at the black hole, so it sits at the centre of every viewport.

const CAMERA_BASE = new THREE.Vector3(0, 6, 28.5);
const TARGET_OFFSET = new THREE.Vector3(3, 0, 0);
// pointer parallax reach, world units at full deflection
const PARALLAX_X = 1.6;
const PARALLAX_Y = 1.0;
// adaptive resolution: step down when the GPU can't hold framerate
const DPR_MAX = 1.75;
const DPR_MIN = 1;
// runs before every other useFrame subscriber (they read clock.elapsedTime);
// a negative priority does not take rendering over from EffectComposer
const SCENE_CLOCK_PRIORITY = -1;
const MS_PER_SECOND = 1000;

// Every mover reads scene time (clock.elapsedTime, set by SceneClock), never
// the frame delta, so a held clock holds the whole frame. At scene time 0 the
// camera rests at CAMERA_BASE: the frame the poster is a still of.
function CameraRig() {
  const { camera, pointer } = useThree();
  const look = useRef(new THREE.Vector3().copy(TARGET_OFFSET));
  const lastSceneTime = useRef(0);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const sceneDelta = t - lastSceneTime.current;
    lastSceneTime.current = t;
    const driftX = Math.sin(t * 0.05) * 2.2;
    const driftY = Math.sin(t * 0.033) * 1.1;

    camera.position.x = THREE.MathUtils.damp(camera.position.x, CAMERA_BASE.x + driftX + pointer.x * PARALLAX_X, 1.2, sceneDelta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, CAMERA_BASE.y + driftY - pointer.y * PARALLAX_Y, 1.2, sceneDelta);
    camera.position.z = CAMERA_BASE.z;
    camera.lookAt(look.current);
  });

  return null;
}

// Owns scene time. It holds at 0 until the scene wakes (the poster frame),
// then runs at sceneTimeRate as the wake eases in, and stands still while
// paused. Paused also means frameloop 'demand': frames render only when
// something invalidates (resize, hover glow), and they see the held time.
// R3F rewrites elapsedTime every frame and zeroes it on a frameloop switch;
// setting it here first makes every subscriber see scene time instead.
function SceneClock({ paused, awake }: { paused: boolean; awake: boolean }) {
  const clock = useThree((state) => state.clock);
  const sceneTime = useRef(0);
  const sinceWakeMs = useRef(0);

  useFrame((_, delta) => {
    if (awake) sinceWakeMs.current += delta * MS_PER_SECOND;
    if (!paused) sceneTime.current += delta * sceneTimeRate(sinceWakeMs.current);
    clock.elapsedTime = sceneTime.current;
  }, SCENE_CLOCK_PRIORITY);

  return null;
}

// Reports once, when the scene is warm (sceneOpening.ts). Subscribers run
// just before a frame is drawn, in the same task, so the state update this
// triggers lands after that frame.
function SceneReadySignal({ onReady }: { onReady: () => void }) {
  const [isWarm] = useState(createWarmupGate);
  const reported = useRef(false);
  useFrame(() => {
    if (reported.current || !isWarm(performance.now())) return;
    reported.current = true;
    onReady();
  });
  return null;
}

interface GalacticSceneProps {
  onSelect: (selection: GalacticSelection | null) => void;
  /** system narrated by the tracking ticker — its label/orbit glow like a hover */
  featuredName: string | null;
  onStarHover: (name: string, hovering: boolean) => void;
  /** the scene is drawing steadily; the poster over it can fade out */
  onReady: () => void;
  /** "Pause motion", a selection card covering the scene, or an offscreen canvas */
  paused: boolean;
  /** false holds the opening frame the poster shows; true lets time run */
  awake: boolean;
}

export default function GalacticScene({ onSelect, featuredName, onStarHover, onReady, paused, awake }: GalacticSceneProps) {
  const [dpr, setDpr] = useState(1.5);
  const [opened, setOpened] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setOpened(true), SCENE_OPENING_RENDER_MS);
    return () => clearTimeout(timer);
  }, []);
  const frozen = paused && opened;

  return (
    <Canvas
      camera={{ position: CAMERA_BASE.toArray(), fov: 42, near: 0.1, far: 400 }}
      dpr={dpr}
      frameloop={frozen ? 'demand' : 'always'}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      style={{ background: 'transparent' }}
      onPointerMissed={() => onSelect(null)}
    >
      {/* integrated GPUs get a resolution step-down instead of permanent jank;
          unmounted while frozen, where sparse frames would read as a stall */}
      {!frozen && (
        <PerformanceMonitor
          onIncline={() => setDpr(DPR_MAX)}
          onDecline={() => setDpr(DPR_MIN)}
        />
      )}
      <SceneClock paused={paused} awake={awake} />
      <SceneReadySignal onReady={onReady} />
      <color attach="background" args={[SCENE_BACKGROUND]} />
      <CameraRig />
      <Starfield />
      <group position={TARGET_OFFSET.toArray()}>
        <BlackHole onSelect={onSelect} />
        <StarSystems featuredName={featuredName} onSelect={onSelect} onHover={onStarHover} />
      </group>
      {/* multisampling off: EffectComposer defaults to 8x MSAA in WebGL2,
          silently negating antialias:false; bloom hides aliasing anyway */}
      <EffectComposer multisampling={0}>
        <Bloom intensity={0.5} luminanceThreshold={0.62} luminanceSmoothing={0.18} mipmapBlur radius={0.55} levels={5} />
      </EffectComposer>
    </Canvas>
  );
}
