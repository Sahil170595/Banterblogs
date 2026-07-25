'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NOISE_GLSL, EMBER_RAMP_GLSL } from './shaderChunks';

// Ember accretion disk. The physics that sells it:
//  - temperature falls as T ∝ r^-3/4 (Shakura-Sunyaev thin disk), so the ramp
//    runs white-hot at the inner edge to deep ember at the rim
//  - streaks shear with Keplerian differential rotation (ω ∝ r^-3/2)
//  - doppler beaming brightens the approaching side (the M87/Interstellar
//    asymmetry people recognize)
// Rendered on a flat plane; radius/angle computed in the fragment shader.

const DISK_VERT = /* glsl */ `
  varying vec2 vPos;
  uniform float uOuter;
  void main() {
    vPos = position.xy * uOuter;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position * uOuter, 1.0);
  }
`;

const DISK_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vPos;
  uniform float uTime;
  uniform float uInner;
  uniform float uOuter;
  const float ALPHA_DEPTH_CUTOFF = 0.012;
  const float DISPLAY_EMISSION_GAIN = 1.85;

  ${NOISE_GLSL}
  ${EMBER_RAMP_GLSL}

  void main() {
    float r = length(vPos);
    if (r < uInner || r > uOuter) discard;

    float theta = atan(vPos.y, vPos.x);
    float x = uInner / r;
    float sq = sqrt(x);

    // Shakura-Sunyaev thin disk, for real this time:
    //   flux F(r) ∝ r^-3 · (1 − √(r_in/r))   — zero AT the ISCO edge,
    //   peak at r = 1.36·r_in, collapsing to ~5% of peak by r = 6·r_in.
    //   temperature T(r) ∝ r^-3/4 · (1 − √(r_in/r))^1/4 sets the COLOR.
    // Normalization constants are the analytic peak values.
    float flux = pow(x, 3.0) * (1.0 - sq) / 0.0567;
    float tNorm = pow(x, 0.75) * pow(max(1.0 - sq, 0.0), 0.25) / 0.488;

    // Keplerian shear: inner material laps outer, streaks stretch into arcs
    float omega = 3.2 * pow(r / uInner, -1.5);
    float sheared = theta * 3.0 - uTime * omega;
    float bands = fbm(vec2(r * 5.5, sheared * 1.4));
    float turb = fbm(vec2(r * 7.0 - uTime * 0.15, sheared * 2.0 + 40.0));
    flux *= 0.8 + 0.3 * bands + 0.15 * turb; // ±30% modulation, not ×2

    // doppler: ~2.6:1 approaching/receding + slight spectral shift
    // (approaching limb whiter, receding limb deeper red).
    // cos(theta) = the LEFT/RIGHT axis in disk-local coords (the plane is
    // rotated -90deg about X, so sin(theta) would beam front/back — wrong).
    float beam = 1.0 - 0.45 * cos(theta);
    flux *= beam;
    tNorm *= 1.0 - 0.1 * cos(theta);

    // ramp under-driven so the peak is warm-gold, never clipped white; tiny
    // emissive floor (8%) keeps the opaque body from going grey while the
    // r^-3 flux gradient stays visually dominant (blind-review C1)
    vec3 col =
      emberRamp(clamp(tNorm * 0.72, 0.0, 1.0)) *
      (0.06 + DISPLAY_EMISSION_GAIN * flux);

    // OPAQUE body — thin disks are optically thick. Alpha is 1 everywhere
    // except a 2% feather at the ISCO and the matter running out at the rim.
    float innerFeather = smoothstep(uInner, uInner * 1.02, r);
    float outerFeather = 1.0 - smoothstep(uOuter * 0.8, uOuter, r);
    float alpha = innerFeather * outerFeather;
    // Transparent fragments can still write depth. Discard the vanishing
    // feather so a numerically present disk cannot invisibly hide a star.
    if (alpha < ALPHA_DEPTH_CUTOFF) discard;

    gl_FragColor = vec4(col, alpha);
  }
`;

interface AccretionDiskProps {
  inner?: number;
  outer?: number;
}

export function AccretionDisk({ inner = 1.6, outer = 7.5 }: AccretionDiskProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uInner: { value: inner },
      uOuter: { value: outer },
    }),
    [inner, outer],
  );

  useFrame(({ clock }) => {
    const mat = materialRef.current;
    if (!mat) return;
    mat.uniforms.uTime.value = clock.elapsedTime;
  });

  // geometry is scaled in the vertex shader (uOuter), so the CPU-side
  // bounding sphere is wrong — culling would pop the disk out of view
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={DISK_VERT}
        fragmentShader={DISK_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite
        side={THREE.DoubleSide}
        blending={THREE.NormalBlending}
        toneMapped={false}
      />
    </mesh>
  );
}
