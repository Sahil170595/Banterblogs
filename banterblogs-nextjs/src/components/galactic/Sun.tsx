'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { blackbodyToRGB } from './blackbody';
import { NOISE_GLSL } from './shaderChunks';

// High-fidelity sun: shader surface with animated fbm granulation and limb
// darkening (edges cooler/darker, like a real photosphere), and a soft
// additive corona. Architectural mass controls the stellar radius; no
// invented satellites or orbital data are introduced here.

const STELLAR_SURFACE_RADIANCE = 2.2;
const STELLAR_HOTSPOT_RADIANCE = 4.1;

const SUN_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vPos;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mv.xyz);
    vPos = position;
    gl_Position = projectionMatrix * mv;
  }
`;

const SUN_FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vPos;
  uniform float uTime;
  uniform vec3 uColor;
  uniform vec3 uHot;

  ${NOISE_GLSL}

  void main() {
    vec3 n = normalize(vPos);
    // granulation: two drifting noise slices over the sphere surface
    float g1 = fbm(n.xy * 6.0 + vec2(uTime * 0.05, uTime * 0.03));
    float g2 = fbm(n.yz * 8.0 - vec2(uTime * 0.04, uTime * 0.06));
    float gran = 0.5 * g1 + 0.5 * g2;

    // limb darkening: photosphere edges are cooler and dimmer
    float mu = clamp(dot(normalize(vNormal), normalize(vViewDir)), 0.0, 1.0);
    float limb = 0.45 + 0.55 * pow(mu, 0.65);

    vec3 col = mix(uColor * 0.7, uHot, smoothstep(0.35, 0.75, gran));
    col *= limb * 1.55;

    gl_FragColor = vec4(col, 1.0);
  }
`;

// Soft radial corona on a camera-facing billboard.
const CORONA_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform vec3 uColor;
  void main() {
    vec2 p = vUv - 0.5;
    float r = length(p) * 2.0;
    float a = exp(-r * r * 6.5);
    gl_FragColor = vec4(uColor * 1.4, a);
  }
`;

const CORONA_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

interface SunProps {
  tempK: number;
  size: number;
}

export function Sun({ tempK, size }: SunProps) {
  const sunMat = useRef<THREE.ShaderMaterial>(null);

  const { color, hot } = useMemo(() => {
    const [r, g, b] = blackbodyToRGB(tempK);
    const linearColor = new THREE.Color()
      .setRGB(r, g, b, THREE.SRGBColorSpace)
      .multiplyScalar(STELLAR_SURFACE_RADIANCE);
    return {
      color: linearColor,
      hot: linearColor
        .clone()
        .multiplyScalar(STELLAR_HOTSPOT_RADIANCE / STELLAR_SURFACE_RADIANCE),
    };
  }, [tempK]);

  const sunUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: color },
      uHot: { value: hot },
    }),
    [color, hot],
  );

  const coronaUniforms = useMemo(
    () => ({ uColor: { value: color } }),
    [color],
  );

  useFrame(({ clock }) => {
    if (sunMat.current) sunMat.current.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <group>
      <mesh>
        <sphereGeometry args={[size, 32, 32]} />
        <shaderMaterial
          ref={sunMat}
          vertexShader={SUN_VERT}
          fragmentShader={SUN_FRAG}
          uniforms={sunUniforms}
          toneMapped={false}
        />
      </mesh>

      {/* two-layer corona */}
      <Billboard>
        <mesh scale={size * 5.2} renderOrder={3}>
          <planeGeometry args={[1, 1]} />
          <shaderMaterial
            vertexShader={CORONA_VERT}
            fragmentShader={CORONA_FRAG}
            uniforms={coronaUniforms}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      </Billboard>
    </group>
  );
}
