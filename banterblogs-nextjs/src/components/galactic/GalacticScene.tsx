'use client';

import { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { BlackHole } from './BlackHole';
import { StarSystems } from './StarSystems';
import { Starfield } from './Starfield';
import type { GalacticSelection } from './systems';

// Camera rig: slow ambient drift + pointer parallax, eased. The black hole
// sits right-of-center (camera target offset) so hero copy owns the left.

const CAMERA_BASE = new THREE.Vector3(0, 7.5, 28);
const TARGET_OFFSET = new THREE.Vector3(3, 0.5, 0);

function CameraRig() {
  const { camera, pointer } = useThree();
  const look = useRef(new THREE.Vector3().copy(TARGET_OFFSET));

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const driftX = Math.sin(t * 0.05) * 2.2;
    const driftY = Math.sin(t * 0.033) * 1.1;

    camera.position.x = THREE.MathUtils.damp(camera.position.x, CAMERA_BASE.x + driftX + pointer.x * 1.6, 1.2, 0.016);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, CAMERA_BASE.y + driftY - pointer.y * 1.0, 1.2, 0.016);
    camera.position.z = CAMERA_BASE.z;
    camera.lookAt(look.current);
  });

  return null;
}

interface GalacticSceneProps {
  onSelect: (selection: GalacticSelection | null) => void;
}

export default function GalacticScene({ onSelect }: GalacticSceneProps) {
  return (
    <Canvas
      camera={{ position: CAMERA_BASE.toArray(), fov: 42, near: 0.1, far: 400 }}
      dpr={[1, 1.75]}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      style={{ background: 'transparent' }}
      onPointerMissed={() => onSelect(null)}
    >
      <color attach="background" args={['#04060a']} />
      <CameraRig />
      <Starfield />
      <group position={TARGET_OFFSET.toArray()}>
        <BlackHole onSelect={onSelect} />
        <StarSystems onSelect={onSelect} />
      </group>
      <EffectComposer>
        <Bloom intensity={0.95} luminanceThreshold={0.5} luminanceSmoothing={0.25} mipmapBlur />
      </EffectComposer>
    </Canvas>
  );
}
