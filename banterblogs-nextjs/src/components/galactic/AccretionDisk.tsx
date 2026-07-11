'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

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
  uniform float uIgnite;

  // hash + value noise + fbm
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.55;
    for (int i = 0; i < 4; i++) {
      v += amp * noise(p);
      p = p * 2.1 + vec2(13.7, 7.3);
      amp *= 0.5;
    }
    return v;
  }

  // ember ramp: deep red -> brand ember -> amber -> white-hot
  vec3 emberRamp(float t) {
    vec3 c1 = vec3(0.28, 0.05, 0.01);
    vec3 c2 = vec3(0.976, 0.322, 0.082); // hsl(16 95% 53%) — the brand primary
    vec3 c3 = vec3(1.0, 0.72, 0.35);
    vec3 c4 = vec3(1.0, 0.96, 0.90);
    if (t < 0.4) return mix(c1, c2, t / 0.4);
    if (t < 0.75) return mix(c2, c3, (t - 0.4) / 0.35);
    return mix(c3, c4, (t - 0.75) / 0.25);
  }

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

    // doppler: ~4:1 approaching/receding + slight spectral shift
    // (approaching limb whiter, receding limb deeper red).
    // cos(theta) = the LEFT/RIGHT axis in disk-local coords (the plane is
    // rotated -90deg about X, so sin(theta) would beam front/back — wrong).
    float beam = 1.0 - 0.45 * cos(theta);
    flux *= beam;
    tNorm *= 1.0 - 0.1 * cos(theta);

    // ramp slightly under-driven so the peak is warm-white, not clipped white;
    // small emissive floor keeps the opaque body glowing ember instead of
    // going grey where flux is low — the r^-3 gradient still dominates
    vec3 col = emberRamp(clamp(tNorm * 0.9, 0.0, 1.0)) * (0.35 + 2.6 * flux);

    // OPAQUE body — thin disks are optically thick. Alpha is 1 everywhere
    // except a 2% feather at the ISCO and the matter running out at the rim.
    float innerFeather = smoothstep(uInner, uInner * 1.02, r);
    float outerFeather = 1.0 - smoothstep(uOuter * 0.8, uOuter, r);
    float alpha = innerFeather * outerFeather;

    gl_FragColor = vec4(col * uIgnite, alpha * uIgnite);
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
      uIgnite: { value: 0 },
    }),
    [inner, outer],
  );

  useFrame(({ clock }) => {
    const mat = materialRef.current;
    if (!mat) return;
    mat.uniforms.uTime.value = clock.elapsedTime;
    // ignition: the disk lights up over the first ~1.8s (torch in a cave)
    mat.uniforms.uIgnite.value = THREE.MathUtils.damp(mat.uniforms.uIgnite.value, 1, 1.4, 0.016);
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
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
