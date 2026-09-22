'use client';

import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { BlackHole } from './BlackHole';
import { IGNITION_SETTLE_MS, createWarmupGate } from './sceneOpening';
import { StarSystems } from './StarSystems';
import { Starfield } from './Starfield';
import type { GalacticSelection } from './systems';

// Camera rig: slow ambient drift + pointer parallax, eased. The black hole
// sits right-of-center (camera target offset) so hero copy owns the left.

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

function CameraRig() {
  const { camera, pointer } = useThree();
  const look = useRef(new THREE.Vector3().copy(TARGET_OFFSET));

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const driftX = Math.sin(t * 0.05) * 2.2;
    const driftY = Math.sin(t * 0.033) * 1.1;

    camera.position.x = THREE.MathUtils.damp(camera.position.x, CAMERA_BASE.x + driftX + pointer.x * PARALLAX_X, 1.2, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, CAMERA_BASE.y + driftY - pointer.y * PARALLAX_Y, 1.2, delta);
    camera.position.z = CAMERA_BASE.z;
    camera.lookAt(look.current);
  });

  return null;
}

// Paused = frameloop 'demand' plus a stopped clock: frames render only when
// something invalidates (resize, hover glow) and each sees delta 0 and a held
// elapsedTime, so nothing moves. R3F zeroes elapsedTime on every frameloop
// switch; restoring it here makes the orbits resume where they stopped.
function SceneClock({ paused }: { paused: boolean }) {
  const clock = useThree((state) => state.clock);
  const frameloop = useThree((state) => state.frameloop);
  const sceneTime = useRef(0);

  useEffect(() => {
    if (paused && frameloop === 'demand') clock.stop();
  }, [clock, frameloop, paused]);

  useFrame(() => {
    if (clock.elapsedTime < sceneTime.current) clock.elapsedTime = sceneTime.current;
    sceneTime.current = clock.elapsedTime;
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
  /** "Pause motion", or a selection card covering the scene */
  paused: boolean;
}

export default function GalacticScene({ onSelect, featuredName, onStarHover, onReady, paused }: GalacticSceneProps) {
  const [dpr, setDpr] = useState(1.5);
  const [ignited, setIgnited] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIgnited(true), IGNITION_SETTLE_MS);
    return () => clearTimeout(timer);
  }, []);
  const frozen = paused && ignited;

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
      <SceneClock paused={frozen} />
      <SceneReadySignal onReady={onReady} />
      <color attach="background" args={['#04060a']} />
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
