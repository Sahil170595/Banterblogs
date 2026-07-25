'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { blackbodyToRGB } from './blackbody';

const STARFIELD_VERT = /* glsl */ `
  attribute float aSize;
  varying vec3 vColor;

  void main() {
    vColor = color;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float attenuation = clamp(170.0 / max(45.0, -mv.z), 0.55, 3.2);
    gl_PointSize = aSize * attenuation;
  }
`;

const STARFIELD_FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vColor;

  void main() {
    vec2 point = gl_PointCoord - 0.5;
    float radius = length(point);
    if (radius > 0.5) discard;
    float core = 1.0 - smoothstep(0.08, 0.5, radius);
    gl_FragColor = vec4(vColor * (0.7 + core * 0.55), core);
  }
`;

interface StarfieldProps {
  count?: number;
}

export function Starfield({ count = 4600 }: StarfieldProps) {
  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const random = mulberry32(0xc0ffee);
    const linearColor = new THREE.Color();

    for (let index = 0; index < count; index += 1) {
      const inBand = random() < 0.34;
      const radius = 90 + random() * 80;
      const theta = random() * Math.PI * 2;
      const bandSqueeze = inBand ? 0.12 : 1;
      const phi = Math.acos(2 * random() - 1);
      const y = Math.cos(phi) * bandSqueeze;
      const radial = Math.sqrt(Math.max(0, 1 - y * y));
      positions[index * 3] = radius * radial * Math.cos(theta);
      positions[index * 3 + 1] = radius * y;
      positions[index * 3 + 2] = radius * radial * Math.sin(theta);

      const population = random();
      const kelvin =
        population < 0.6
          ? 2600 + random() * 2200
          : population < 0.9
            ? 4800 + random() * 2400
            : 7500 + random() * 8000;
      const [red, green, blue] = blackbodyToRGB(kelvin);
      linearColor.setRGB(red, green, blue, THREE.SRGBColorSpace);

      const magnitude = random();
      const brightness =
        magnitude < 0.92
          ? 0.18 + random() * 0.42
          : magnitude < 0.992
            ? 0.72 + random() * 0.62
            : 1.45 + random() * 1.35;
      sizes[index] =
        magnitude < 0.92
          ? 0.62 + random() * 0.45
          : magnitude < 0.992
            ? 1.2 + random() * 0.7
            : 2.1 + random() * 1.1;
      colors[index * 3] = linearColor.r * brightness;
      colors[index * 3 + 1] = linearColor.g * brightness;
      colors[index * 3 + 2] = linearColor.b * brightness;
    }

    return { positions, colors, sizes };
  }, [count]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={STARFIELD_VERT}
        fragmentShader={STARFIELD_FRAG}
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

function mulberry32(seed: number): () => number {
  let value = seed;
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let sample = Math.imul(value ^ (value >>> 15), 1 | value);
    sample = (sample + Math.imul(sample ^ (sample >>> 7), 61 | sample)) ^ sample;
    return ((sample ^ (sample >>> 14)) >>> 0) / 4294967296;
  };
}
