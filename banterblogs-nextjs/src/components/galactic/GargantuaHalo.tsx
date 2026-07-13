'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { NOISE_GLSL, EMBER_RAMP_GLSL } from './shaderChunks';

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

  ${NOISE_GLSL}
  ${EMBER_RAMP_GLSL}

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

    // photon ring: razor-thin at the shadow edge (1.0 R), brightest stroke;
    // own cutoff so the arc mask doesn't attenuate it
    float ringD = (r - uShadow * 1.015) / (uShadow * 0.022);
    float ring = exp(-ringD * ringD) * (0.7 + 0.4 * smoothstep(-0.2, 0.6, p.y / uShadow));
    ring *= smoothstep(uShadow * 0.99, uShadow * 1.005, r);
    // slow breathing pulse — the idle affordance that the core is interactive
    ring *= 1.0 + 0.12 * sin(uTime * 1.1);

    // primary image: far side of the disk lensed over the top
    float over = arcBand(p, uShadow * 1.66, uShadow * 1.46, 0.20, 1.0);
    // secondary image: fainter, tighter, under the shadow
    float under = arcBand(p, uShadow * 1.28, uShadow * 1.18, 0.10, -1.0) * 0.55;

    // doppler asymmetry — approaching (left) limb brighter, matching the disk
    float beam = 1.0 + 0.45 * cos(theta + 3.14159);

    float glow = (over + under) * (0.7 + 0.5 * streaks) * beam;
    vec3 col = emberRamp(clamp(0.55 + 0.45 * streaks, 0.0, 1.0)) * glow * 2.2;
    col += vec3(1.0, 0.9, 0.75) * ring * 2.2;

    // nothing renders inside the shadow — silhouette stays pure black;
    // mask applies to the arcs, the ring carries its own cutoff above
    float mask = smoothstep(uShadow * 1.0, uShadow * 1.09, r);
    float alpha = clamp((glow * 0.9 * mask + ring), 0.0, 1.0) * uIgnite;

    gl_FragColor = vec4(col, alpha);
  }
`;

interface GargantuaHaloProps {
  shadowRadius: number;
}

export function GargantuaHalo({ shadowRadius }: GargantuaHaloProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // billboard plane needs to cover the over-arc's reach
  const scale = shadowRadius * 4.0;

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uShadow: { value: shadowRadius },
      uScale: { value: scale },
      uIgnite: { value: 0 },
    }),
    [shadowRadius, scale],
  );

  useFrame(({ clock }, delta) => {
    const mat = materialRef.current;
    if (!mat) return;
    mat.uniforms.uTime.value = clock.elapsedTime;
    mat.uniforms.uIgnite.value = THREE.MathUtils.damp(mat.uniforms.uIgnite.value, 1, 1.4, delta);
  });

  return (
    <Billboard>
      {/* vertex-shader-scaled geometry — see AccretionDisk culling note */}
      <mesh renderOrder={2} frustumCulled={false}>
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
