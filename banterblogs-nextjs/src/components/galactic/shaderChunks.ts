// Shared GLSL chunks — hash/value-noise/fbm and the ember color ramp were
// duplicated verbatim across AccretionDisk, GargantuaHalo, and Sun (with the
// brand primary hard-coded twice). One source now.

export const NOISE_GLSL = /* glsl */ `
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
`;

// deep red -> brand ember hsl(16 95% 53%) -> amber -> white-hot
export const EMBER_RAMP_GLSL = /* glsl */ `
  vec3 emberRamp(float t) {
    vec3 c1 = vec3(0.28, 0.05, 0.01);
    vec3 c2 = vec3(0.976, 0.322, 0.082);
    vec3 c3 = vec3(1.0, 0.72, 0.35);
    vec3 c4 = vec3(1.0, 0.96, 0.90);
    if (t < 0.4) return mix(c1, c2, t / 0.4);
    if (t < 0.75) return mix(c2, c3, (t - 0.4) / 0.35);
    return mix(c3, c4, (t - 0.75) / 0.25);
  }
`;
