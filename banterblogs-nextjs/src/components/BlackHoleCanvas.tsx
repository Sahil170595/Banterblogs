'use client';

import { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';

// Real-time black hole with accretion disk. Adapted from set111's
// Shadertoy `tsBXW3` ("Black hole with accretion disk", MIT-spirited).
// Algorithm: iterative ray-bending with inverse-square force per step
// (Newtonian approximation, magic factor 0.625 calibrated to match
// Schwarzschild lensing visually). 20 outer steps × 6 substeps = 120
// march iterations. The disk is sampled by raymarchDisk() with 12
// layered samples through the disk plane, with value-noise turbulence
// for plasma flame structure.
//
// Adaptations from the original:
//   - Background nebula/stars (iChannel0) removed; escaped rays return
//     transparent so page content shows through underneath.
//   - Mouse interaction removed; camera is fixed at the Gargantua
//     composition (slight elevation above disk plane).
//   - Disk colors retuned from gold/yellow to copper-orange to match
//     the brand palette.

const VERT = /* glsl */ `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;

  uniform vec2 uResolution;
  uniform float uTime;

  #define _Speed 1.4   // disk rotation speed (slower than original 3.0)
  #define _Steps 12.0  // disk texture layers
  #define _Size  0.3   // black hole size

  // ── Hash + value noise ───────────────────────────────────────────
  float hash1(float x) { return fract(sin(x) * 152754.742); }
  float hash2(vec2 x)  { return hash1(x.x + hash1(x.y)); }

  float value(vec2 p, float f) {
    float bl = hash2(floor(p * f + vec2(0.0, 0.0)));
    float br = hash2(floor(p * f + vec2(1.0, 0.0)));
    float tl = hash2(floor(p * f + vec2(0.0, 1.0)));
    float tr = hash2(floor(p * f + vec2(1.0, 1.0)));
    vec2 fr = fract(p * f);
    fr = (3.0 - 2.0 * fr) * fr * fr;
    float b = mix(bl, br, fr.x);
    float t = mix(tl, tr, fr.x);
    return mix(b, t, fr.y);
  }

  // ── Accretion disk (12-layer raymarch through z=0 plane) ─────────
  vec4 raymarchDisk(vec3 ray, vec3 zeroPos) {
    vec3 position = zeroPos;
    float lengthPos = length(position.xz);
    float dist = min(1.0, lengthPos * (1.0 / _Size) * 0.5)
               * _Size * 0.4 * (1.0 / _Steps) / abs(ray.y);

    position += dist * _Steps * ray * 0.5;

    vec2 deltaPos;
    deltaPos.x = -zeroPos.z * 0.01 + zeroPos.x;
    deltaPos.y =  zeroPos.x * 0.01 + zeroPos.z;
    deltaPos = normalize(deltaPos - zeroPos.xz);

    float parallel = dot(ray.xz, deltaPos);
    parallel /= sqrt(lengthPos);
    parallel *= 0.5;
    float redShift = parallel + 0.3;
    redShift *= redShift;
    redShift = clamp(redShift, 0.0, 1.0);

    float disMix = clamp((lengthPos - _Size * 2.0) * (1.0 / _Size) * 0.24, 0.0, 1.0);

    // Copper palette (was gold→deep-red in original):
    //   inner hot: brand copper (~hsl 16 95% 53%)
    //   outer cool: deep ember red, dimmed
    vec3 insideCol = mix(
      vec3(1.00, 0.55, 0.18),                 // copper hot
      vec3(0.50, 0.13, 0.02) * 0.2,           // deep red (kept from original)
      disMix
    );

    // Doppler: warm (approaching) ↔ cool (receding). Blue-shift damped
    // so the disk stays in the copper family (less chromatic noise).
    insideCol *= mix(vec3(0.40, 0.20, 0.10), vec3(1.4, 1.5, 2.2), redShift);
    insideCol *= 0.85;  // overall dimmer so content reads cleanly on top
    redShift += 0.12;
    redShift *= redShift;

    vec4 o = vec4(0.0);

    for (float i = 0.0; i < _Steps; i++) {
      position -= dist * ray;

      float intensity = clamp(1.0 - abs((i - 0.8) * (1.0 / _Steps) * 2.0), 0.0, 1.0);
      float lengthPos2 = length(position.xz);
      float distMult = 1.0;

      distMult *= clamp((lengthPos2 - _Size * 0.75) * (1.0 / _Size) * 1.5, 0.0, 1.0);
      distMult *= clamp((_Size * 10.0 - lengthPos2) * (1.0 / _Size) * 0.20, 0.0, 1.0);
      distMult *= distMult;

      float u = lengthPos2 + uTime * _Size * 0.3 + intensity * _Size * 0.2;

      vec2 xy;
      float rot = mod(uTime * _Speed, 8192.0);
      xy.x = -position.z * sin(rot) + position.x * cos(rot);
      xy.y =  position.x * sin(rot) + position.z * cos(rot);

      float x = abs(xy.x / xy.y);
      float angle = 0.02 * atan(x);

      // Smoother disk: lower noise frequency + flatten contrast so the
      // disk reads as a continuous ring instead of plasma static.
      const float f = 45.0;
      float n = value(vec2(angle, u * (1.0 / _Size) * 0.05), f);
      n = n * 0.75 + 0.25 * value(vec2(angle, u * (1.0 / _Size) * 0.05), f * 1.6);
      n = mix(0.5, n, 0.7); // pull noise toward mean → less stippling

      float extraWidth = n * 0.7 * (1.0 - clamp(i * (1.0 / _Steps) * 2.0 - 1.0, 0.0, 1.0));

      float alpha = clamp(
        n * (intensity + extraWidth) * ((1.0 / _Size) * 10.0 + 0.01) * dist * distMult,
        0.0, 1.0
      );

      vec3 col = 1.4 * mix(vec3(0.3, 0.2, 0.15) * insideCol, insideCol, min(1.0, intensity * 2.0));
      o = clamp(vec4(col * alpha + o.rgb * (1.0 - alpha),
                     o.a * (1.0 - alpha) + alpha),
                vec4(0.0), vec4(1.0));

      lengthPos2 *= (1.0 / _Size);
      // Inner-ring glow contribution (was 100.0 — way too hot, blew out
      // the inner edge and bled chromatic noise into content above).
      o.rgb += redShift * (intensity * 1.0 + 0.5) * (1.0 / _Steps) * 50.0
             * distMult / (lengthPos2 * lengthPos2);
    }

    o.rgb = clamp(o.rgb - 0.005, 0.0, 1.0);
    return o;
  }

  // ── Camera rotation helper ───────────────────────────────────────
  void Rotate(inout vec3 v, vec2 angle) {
    v.yz = cos(angle.y) * v.yz + sin(angle.y) * vec2(-1, 1) * v.zy;
    v.xz = cos(angle.x) * v.xz + sin(angle.x) * vec2(-1, 1) * v.zx;
  }

  void main() {
    // Dead-center composition: no screen rotation, no off-axis offset.
    // BH sits exactly at viewport center so it reads as a centermass.
    vec2 fragCoordRot = gl_FragCoord.xy;

    // Camera: fixed at slight elevation above disk plane, looking at BH.
    // FOV multiplier 0.55 zooms in so the void dominates the viewport and
    // the bright disk crescent pushes past the screen edges (where the
    // CSS mask fades it out), keeping the content-occupied middle calm.
    vec3 ray = normalize(vec3((fragCoordRot - uResolution * 0.5) / uResolution.x * 0.55, 1.0));
    vec3 pos = vec3(0.0, 0.05, -5.0);
    vec2 angle = vec2(0.0, 3.24);
    float dist = length(pos);
    Rotate(pos, angle);
    angle.xy -= min(0.3 / dist, 3.14) * vec2(1.0, 0.5);
    Rotate(ray, angle);

    vec4 col = vec4(0.0);
    vec4 glow = vec4(0.0);
    vec4 outCol = vec4(100.0);
    bool resolved = false;

    for (int disks = 0; disks < 20; disks++) {
      // 6 substeps per outer iteration to amortize exit-condition cost.
      for (int h = 0; h < 6; h++) {
        float dotpos    = dot(pos, pos);
        float invDist   = inversesqrt(dotpos);
        float centDist  = dotpos * invDist;
        float stepDist  = 0.92 * abs(pos.y / ray.y);
        float farLimit  = centDist * 0.5;
        float closeLimit = centDist * 0.1
                         + 0.05 * centDist * centDist * (1.0 / _Size);
        stepDist = min(stepDist, min(farLimit, closeLimit));

        float invDistSqr = invDist * invDist;
        float bendForce  = stepDist * invDistSqr * _Size * 0.625;
        ray = normalize(ray - (bendForce * invDist) * pos);
        pos += stepDist * ray;

        // Halo/photon-sphere glow. Dimmer than original (was 0.012) so
        // the bright ring around the void doesn't fight foreground text.
        glow += vec4(1.2, 1.0, 0.85, 1.0) * (
          0.006 * stepDist * invDistSqr * invDistSqr
          * clamp(centDist * 2.0 - 1.2, 0.0, 1.0)
        );
      }

      float dist2 = length(pos);

      if (dist2 < _Size * 0.1) {
        // Sucked in — opaque void (with glow that accumulated up to plunge).
        outCol = vec4(col.rgb * col.a + glow.rgb * (1.0 - col.a), 1.0);
        resolved = true;
        break;
      } else if (dist2 > _Size * 1000.0) {
        // Escaped to infinity — transparent sky (no nebula). Composite
        // disk + glow against transparent background.
        outCol = vec4(
          col.rgb * col.a + glow.rgb * (1.0 - col.a),
          clamp(col.a + glow.a * (1.0 - col.a), 0.0, 1.0)
        );
        resolved = true;
        break;
      } else if (abs(pos.y) <= _Size * 0.002) {
        // Hit the accretion disk plane — sample disk, continue marching.
        vec4 diskCol = raymarchDisk(ray, pos);
        pos.y = 0.0;
        pos += abs(_Size * 0.001 / ray.y) * ray;
        col = vec4(diskCol.rgb * (1.0 - col.a) + col.rgb,
                   col.a + diskCol.a * (1.0 - col.a));
      }
    }

    if (!resolved) {
      outCol = vec4(col.rgb + glow.rgb * (col.a + glow.a),
                    clamp(col.a + glow.a, 0.0, 1.0));
    }

    // Gamma adjustment (matches original).
    outCol.rgb = pow(outCol.rgb, vec3(0.6));
    gl_FragColor = outCol;
  }
`;

interface BlackHoleCanvasProps {
  className?: string;
}

export function BlackHoleCanvas({ className }: BlackHoleCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let renderer: Renderer;
    try {
      renderer = new Renderer({
        alpha: true,
        antialias: true,
        // Cap dpr — 120 march iterations per pixel is heavy.
        dpr: Math.min(window.devicePixelRatio, 1.5),
      });
    } catch {
      return;
    }

    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    container.appendChild(gl.canvas);
    gl.canvas.style.width = '100%';
    gl.canvas.style.height = '100%';
    gl.canvas.style.display = 'block';

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        uResolution: { value: [container.clientWidth, container.clientHeight] },
        uTime: { value: 0 },
      },
      transparent: true,
    });
    const mesh = new Mesh(gl, { geometry, program });

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      program.uniforms.uResolution.value = [w * renderer.dpr, h * renderer.dpr];
    };
    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    let raf = 0;
    const start = performance.now();
    const render = (now: number) => {
      program.uniforms.uTime.value = (now - start) / 1000;
      renderer.render({ scene: mesh });
      if (!reducedMotion) {
        raf = requestAnimationFrame(render);
      }
    };
    raf = requestAnimationFrame(render);

    if (reducedMotion) {
      cancelAnimationFrame(raf);
      renderer.render({ scene: mesh });
    }

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      if (gl.canvas.parentElement === container) {
        container.removeChild(gl.canvas);
      }
    };
  }, []);

  return <div ref={containerRef} aria-hidden className={className} />;
}
