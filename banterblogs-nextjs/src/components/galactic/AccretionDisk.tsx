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

    // Shakura-Sunyaev: T ∝ r^-3/4, normalized to the inner edge
    float temp = pow(uInner / r, 0.75);

    // Keplerian shear: inner material laps outer, streaks stretch into arcs
    float omega = 3.2 * pow(r / uInner, -1.5);
    float sheared = theta * 3.0 - uTime * omega;
    float bands = fbm(vec2(r * 5.5, sheared * 1.4));
    float turb = fbm(vec2(r * 7.0 - uTime * 0.15, sheared * 2.0 + 40.0));

    vec3 col = emberRamp(clamp(temp * (0.72 + 0.55 * bands), 0.0, 1.0));
    col *= 0.65 + 0.7 * bands + 0.25 * turb;

    // doppler beaming — approaching limb brighter, receding dimmer
    col *= 1.0 + 0.55 * sin(theta);

    // radial envelope: hard bright inner edge, long soft outer falloff
    float inner = smoothstep(uInner, uInner * 1.12, r);
    float outer = 1.0 - smoothstep(uOuter * 0.45, uOuter, r);
    float alpha = inner * outer * (0.8 + 0.35 * bands);

    col *= uIgnite * (1.85 * temp + 0.32);
    gl_FragColor = vec4(col, alpha * uIgnite);
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
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}
