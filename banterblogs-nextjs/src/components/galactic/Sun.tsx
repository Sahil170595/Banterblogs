'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { blackbodyToRGB } from './blackbody';

// High-fidelity sun: shader surface with animated fbm granulation and limb
// darkening (edges cooler/darker, like a real photosphere), a two-layer
// additive corona, and optional tiny planets on fast local orbits so each
// repo reads as a SYSTEM, not a dot.

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
      p = p * 2.15 + vec2(11.3, 5.7);
      amp *= 0.5;
    }
    return v;
  }

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
  uniform float uTime;
  void main() {
    vec2 p = vUv - 0.5;
    float r = length(p) * 2.0;
    float pulse = 1.0 + 0.06 * sin(uTime * 1.7);
    float a = exp(-r * r * 6.5 * pulse);
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

interface PlanetDef {
  radius: number;
  orbit: number;
  speed: number;
  phase: number;
}

interface SunProps {
  tempK: number;
  size: number;
  /** deterministic per-system seed for planet layout */
  seed: number;
}

export function Sun({ tempK, size, seed }: SunProps) {
  const sunMat = useRef<THREE.ShaderMaterial>(null);
  const coronaMat = useRef<THREE.ShaderMaterial>(null);
  const planetRefs = useRef<(THREE.Mesh | null)[]>([]);

  const { color, hot } = useMemo(() => {
    const [r, g, b] = blackbodyToRGB(tempK);
    return {
      color: new THREE.Color(r, g, b),
      hot: new THREE.Color(Math.min(1.6, r * 1.5), Math.min(1.6, g * 1.5), Math.min(1.6, b * 1.4)),
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
    () => ({ uColor: { value: color }, uTime: { value: 0 } }),
    [color],
  );

  // 2 tiny planets for the larger systems, deterministic per seed
  const planets = useMemo<PlanetDef[]>(() => {
    if (size < 0.22) return [];
    const rand = (i: number) => {
      const x = Math.sin(seed * 91.7 + i * 47.3) * 43758.5453;
      return x - Math.floor(x);
    };
    return [0, 1].map((i) => ({
      radius: size * (0.16 + 0.1 * rand(i)),
      orbit: size * (3.2 + 2.2 * i + rand(i + 2)),
      speed: 0.9 - 0.35 * i + 0.3 * rand(i + 4),
      phase: rand(i + 6) * Math.PI * 2,
    }));
  }, [size, seed]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (sunMat.current) sunMat.current.uniforms.uTime.value = t;
    if (coronaMat.current) coronaMat.current.uniforms.uTime.value = t + seed;
    planets.forEach((p, i) => {
      const mesh = planetRefs.current[i];
      if (!mesh) return;
      const a = p.phase + t * p.speed;
      mesh.position.set(Math.cos(a) * p.orbit, Math.sin(a * 0.3) * p.orbit * 0.12, Math.sin(a) * p.orbit);
    });
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
            ref={coronaMat}
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

      {planets.map((p, i) => (
        <mesh
          key={i}
          ref={(m) => {
            planetRefs.current[i] = m;
          }}
        >
          <sphereGeometry args={[p.radius, 10, 10]} />
          <meshBasicMaterial color="#5b6470" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
