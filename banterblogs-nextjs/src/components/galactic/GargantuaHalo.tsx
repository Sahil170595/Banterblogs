'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';

// The lensed halo — the two strokes that make a black hole read as a black
// hole (blackholesimulation.web.app grammar): the far side of the disk bent
// OVER the shadow, a fainter secondary image bent UNDER it, plus the thin
// photon ring hugging the shadow edge. Drawn on a camera-facing billboard
// with additive blending; the shadow itself is the opaque black sphere in
// BlackHole.tsx — negative space, not a rendered object.

const HALO_VERT = /* glsl */ `
  varying vec2 vPos;
  uniform float uScale;
  void main() {
    vPos = position.xy * uScale;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position * uScale, 1.0);
  }
`;

const HALO_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vPos;
  uniform float uTime;
  uniform float uShadow;   // shadow radius (photon-sphere silhouette)
  uniform float uIgnite;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
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

  vec3 emberRamp(float t) {
    vec3 c1 = vec3(0.28, 0.05, 0.01);
    vec3 c2 = vec3(0.976, 0.322, 0.082);
    vec3 c3 = vec3(1.0, 0.72, 0.35);
    vec3 c4 = vec3(1.0, 0.96, 0.90);
    if (t < 0.4) return mix(c1, c2, t / 0.4);
    if (t < 0.75) return mix(c2, c3, (t - 0.4) / 0.35);
    return mix(c3, c4, (t - 0.75) / 0.25);
  }

  // One lensed arc: a bright band hugging an ellipse around the shadow,
  // masked to one vertical side, fading toward the horizontal plane where
  // it hands off to the real (3D) disk band.
  float arcBand(vec2 p, float rx, float ry, float width, float side) {
    float d = length(vec2(p.x / rx, p.y / ry)) - 1.0;
    float band = exp(-(d * d) / (width * width));
    // keep to one side (side=+1 over, -1 under), soft near the equator
    float hemi = smoothstep(0.0, 0.35, p.y * side / uShadow);
    return band * hemi;
  }

  void main() {
    vec2 p = vPos;
    float r = length(p);
    float theta = atan(p.y, p.x);

    // streak texture shared with the disk so the arcs read as the SAME
    // material, bent — not a separate glow
    float streaks = fbm(vec2(r * 4.0, theta * 6.0 - uTime * 0.6));

    // photon ring: razor-thin, brightest element in the scene
    float ringD = (r - uShadow * 1.03) / (uShadow * 0.024);
    float ring = exp(-ringD * ringD) * (0.7 + 0.4 * smoothstep(-0.2, 0.6, p.y / uShadow));

    // primary image: far side of the disk lensed over the top
    float over = arcBand(p, uShadow * 1.55, uShadow * 1.38, 0.20, 1.0);
    // secondary image: fainter, tighter, under the shadow
    float under = arcBand(p, uShadow * 1.28, uShadow * 1.18, 0.10, -1.0) * 0.55;

    // doppler asymmetry — approaching (left) limb brighter, matching the disk
    float beam = 1.0 + 0.45 * cos(theta + 3.14159);

    float glow = (over + under) * (0.7 + 0.5 * streaks) * beam;
    vec3 col = emberRamp(clamp(0.55 + 0.45 * streaks, 0.0, 1.0)) * glow * 2.2;
    col += vec3(1.0, 0.9, 0.75) * ring * 2.2;

    // nothing renders inside the shadow — silhouette stays pure black
    float mask = smoothstep(uShadow * 1.0, uShadow * 1.09, r);
    float alpha = clamp((glow * 0.9 + ring), 0.0, 1.0) * mask * uIgnite;

    gl_FragColor = vec4(col * uIgnite, alpha);
  }
`;

interface GargantuaHaloProps {
  shadowRadius: number;
}

export function GargantuaHalo({ shadowRadius }: GargantuaHaloProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // billboard plane needs to cover the over-arc's reach
  const scale = shadowRadius * 3.6;

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uShadow: { value: shadowRadius },
      uScale: { value: scale },
      uIgnite: { value: 0 },
    }),
    [shadowRadius, scale],
  );

  useFrame(({ clock }) => {
    const mat = materialRef.current;
    if (!mat) return;
    mat.uniforms.uTime.value = clock.elapsedTime;
    mat.uniforms.uIgnite.value = THREE.MathUtils.damp(mat.uniforms.uIgnite.value, 1, 1.4, 0.016);
  });

  return (
    <Billboard>
      <mesh renderOrder={2}>
        <planeGeometry args={[2, 2]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={HALO_VERT}
          fragmentShader={HALO_FRAG}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </Billboard>
  );
}
