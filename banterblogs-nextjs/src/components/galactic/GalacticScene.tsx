'use client';

import { useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { BlackHole } from './BlackHole';
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

interface GalacticSceneProps {
  onSelect: (selection: GalacticSelection | null) => void;
}

export default function GalacticScene({ onSelect }: GalacticSceneProps) {
  const [dpr, setDpr] = useState(1.5);

  return (
    <Canvas
      camera={{ position: CAMERA_BASE.toArray(), fov: 42, near: 0.1, far: 400 }}
      dpr={dpr}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      style={{ background: 'transparent' }}
      onPointerMissed={() => onSelect(null)}
    >
      {/* integrated GPUs get a resolution step-down instead of permanent jank */}
      <PerformanceMonitor
        onIncline={() => setDpr(DPR_MAX)}
        onDecline={() => setDpr(DPR_MIN)}
      />
      <color attach="background" args={['#04060a']} />
      <CameraRig />
      <Starfield />
      <group position={TARGET_OFFSET.toArray()}>
        <BlackHole onSelect={onSelect} />
        <StarSystems onSelect={onSelect} />
      </group>
      {/* multisampling off: EffectComposer defaults to 8x MSAA in WebGL2,
          silently negating antialias:false; bloom hides aliasing anyway */}
      <EffectComposer multisampling={0}>
        <Bloom intensity={0.5} luminanceThreshold={0.62} luminanceSmoothing={0.18} mipmapBlur radius={0.55} levels={5} />
      </EffectComposer>
    </Canvas>
  );
}
