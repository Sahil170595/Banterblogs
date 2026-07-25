import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  solveEccentricAnomaly,
  segmentOccludedBySphere,
  segmentCrossesDiskAnnulus,
} from '../galacticMath';
import { blackbodyToRGB } from '../blackbody';

describe('solveEccentricAnomaly', () => {
  it('is exact for circular orbits', () => {
    for (const M of [0, 0.5, Math.PI, 5.5]) {
      expect(solveEccentricAnomaly(M, 0)).toBeCloseTo(M, 10);
    }
  });

  it('satisfies Kepler equation for the Wyvern-class plunge (e = 0.82)', () => {
    for (const M of [0.1, 1.0, Math.PI, 5.0]) {
      const E = solveEccentricAnomaly(M, 0.82);
      // residual of M = E - e·sin(E) after Newton iterations
      expect(E - 0.82 * Math.sin(E) - M).toBeCloseTo(0, 6);
    }
  });
});

describe('segmentOccludedBySphere', () => {
  const R = 3;

  it('detects a star directly behind the sphere', () => {
    const cam = new THREE.Vector3(0, 0, 20);
    const star = new THREE.Vector3(0, 0, -10);
    expect(segmentOccludedBySphere(cam, star, R)).toBe(true);
  });

  it('passes a star well off-axis', () => {
    const cam = new THREE.Vector3(0, 0, 20);
    const star = new THREE.Vector3(15, 0, -10);
    expect(segmentOccludedBySphere(cam, star, R)).toBe(false);
  });

  it('passes a star in FRONT of the sphere (closest approach beyond the star)', () => {
    const cam = new THREE.Vector3(0, 0, 20);
    const star = new THREE.Vector3(0, 0, 10);
    expect(segmentOccludedBySphere(cam, star, R)).toBe(false);
  });
});

describe('segmentCrossesDiskAnnulus', () => {
  const INNER = 3.465;
  const OUTER = 15;

  it('detects a star below the plane hidden behind the near disk sheet', () => {
    const cam = new THREE.Vector3(0, 6, 28); // above the plane
    const star = new THREE.Vector3(0, -6, -4); // below; crossing at r = 12, mid-annulus
    expect(segmentCrossesDiskAnnulus(cam, star, INNER, OUTER)).toBe(true);
  });

  it('passes a crossing inside the ISCO gap', () => {
    const cam = new THREE.Vector3(0, 6, 8);
    const star = new THREE.Vector3(0, -6, -8); // crosses the plane near the origin
    expect(segmentCrossesDiskAnnulus(cam, star, INNER, OUTER)).toBe(false);
  });

  it('passes a crossing beyond the disk rim', () => {
    const cam = new THREE.Vector3(30, 6, 30);
    const star = new THREE.Vector3(30, -6, 30); // crossing at r ≈ 42
    expect(segmentCrossesDiskAnnulus(cam, star, INNER, OUTER)).toBe(false);
  });

  it('passes when both points are on the same side of the plane', () => {
    const cam = new THREE.Vector3(0, 6, 28);
    const star = new THREE.Vector3(5, 2, 5);
    expect(segmentCrossesDiskAnnulus(cam, star, INNER, OUTER)).toBe(false);
  });

  it('intersects the actual tilted disk plane in disk-local coordinates', () => {
    const orientation = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(THREE.MathUtils.degToRad(6), 0, THREE.MathUtils.degToRad(-4)),
    );
    const cam = new THREE.Vector3(0, 6, 28).applyQuaternion(orientation);
    const star = new THREE.Vector3(0, -6, -4).applyQuaternion(orientation);

    expect(segmentCrossesDiskAnnulus(cam, star, INNER, OUTER, orientation)).toBe(true);
  });
});

describe('blackbodyToRGB', () => {
  it('clamps out-of-range temperatures instead of exploding', () => {
    for (const kelvin of [0, 500, 1000, 40000, 100000]) {
      const [r, g, b] = blackbodyToRGB(kelvin);
      for (const channel of [r, g, b]) {
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(1);
        expect(Number.isFinite(channel)).toBe(true);
      }
    }
  });

  it('orders hue correctly: cool stars redder, hot stars bluer', () => {
    const cool = blackbodyToRGB(3000);
    const hot = blackbodyToRGB(12000);
    expect(cool[0]).toBeGreaterThan(cool[2]); // red dominates at 3000K
    expect(hot[2]).toBeGreaterThanOrEqual(hot[0] * 0.95); // blue-white at 12000K
  });
});
