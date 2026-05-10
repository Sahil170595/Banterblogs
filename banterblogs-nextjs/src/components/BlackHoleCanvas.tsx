'use client';

import { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';

// Pseudo-relativistic black hole shader. Not full GR ray-marching — instead
// uses 2D radial light bending around a central singularity, plus an
// accretion-disk sample with Doppler beaming. Looks Interstellar-adjacent
// for a fraction of the GPU cost.
//
// Tuned to the site's hot-copper palette (hsl 16 95 53). The disk runs
// warm-orange where Doppler-bright, deep-red where Doppler-dim, with a
// sharp photon ring at the event horizon.

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
  uniform float uPixelRatio;

  // Brand copper. Brighter / dimmer ends of the Doppler shift on the disk.
  const vec3 COPPER_HOT  = vec3(1.00, 0.62, 0.30);
  const vec3 COPPER_MID  = vec3(0.98, 0.32, 0.08);
  const vec3 COPPER_DARK = vec3(0.45, 0.10, 0.02);

  // Cheap noise for disk turbulence.
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p *= 2.1;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    // Center the coordinates, aspect-correct, and scale so the disk fits.
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);
    float r = length(uv);
    float angle = atan(uv.y, uv.x);

    // Event horizon radius (the dark void). Sized so the void reads big
    // enough to anchor the page even at small viewports.
    float eventHorizon = 0.11;

    // Photon ring sits just outside the horizon. Sharp bright edge.
    float photonRing = smoothstep(eventHorizon + 0.014, eventHorizon, r) *
                       smoothstep(eventHorizon - 0.005, eventHorizon - 0.001, r);

    // Outside the void: render the accretion disk via radial bands plus
    // turbulent FBM noise that rotates over time. Disk is brightest at the
    // inner edge and falls off outward.
    float diskInner = eventHorizon + 0.012;
    float diskOuter = 0.50;

    // Spiral coordinate — angle plus a logarithmic-ish twist so detail
    // streams inward as it rotates.
    float spiral = angle + 4.0 * log(max(r, 0.0001)) - uTime * 0.35;

    // Rotation-driven turbulence
    vec2 noisePos = vec2(spiral * 0.5, r * 8.0) + vec2(uTime * 0.05, 0.0);
    float turb = fbm(noisePos);

    // Disk falloff: bright at inner edge, gone past diskOuter.
    float diskFalloff = smoothstep(diskOuter, diskInner, r);

    // Doppler beaming: the side rotating toward viewer is brighter. Use
    // sin(angle) to pick a hemisphere.
    float doppler = 0.5 + 0.5 * sin(angle + 1.2);
    doppler = pow(doppler, 1.6);

    // Combine into disk intensity.
    float diskIntensity = diskFalloff * (0.5 + 0.7 * turb) * (0.45 + 0.55 * doppler);

    // Mask out the void (no disk inside event horizon).
    diskIntensity *= step(eventHorizon, r);

    // Color the disk: hot near inner edge / bright side, dark at outer edge.
    vec3 diskColor = mix(COPPER_DARK, COPPER_MID, diskIntensity);
    diskColor = mix(diskColor, COPPER_HOT, diskIntensity * doppler);

    // Add the photon ring.
    diskColor += COPPER_HOT * photonRing * 1.2;

    // Soft outer glow that fades to nothing past the disk.
    float glow = exp(-r * 5.5) * 0.3;
    diskColor += COPPER_MID * glow * (1.0 - smoothstep(0.0, eventHorizon, r));

    // Final alpha: present where there's disk or glow or photon ring,
    // transparent elsewhere so the page background shows through.
    float alpha = max(diskIntensity * 1.2, photonRing);
    alpha = max(alpha, glow * (1.0 - step(eventHorizon, r) * step(r, eventHorizon)));
    alpha = clamp(alpha, 0.0, 1.0);

    // Inside the event horizon: pure black, fully opaque (the void).
    if (r < eventHorizon) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    gl_FragColor = vec4(diskColor, alpha);
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

    // Respect motion preferences.
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let renderer: Renderer;
    try {
      renderer = new Renderer({
        alpha: true,
        antialias: true,
        dpr: Math.min(window.devicePixelRatio, 2),
      });
    } catch {
      // No WebGL — leave the container empty; the static SVG fallback
      // rendered server-side will remain visible.
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
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
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

    // For reduced motion: render exactly one frame, no animation loop.
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
