import * as THREE from 'three';

// Pure math for the galactic scene — extracted so the label-occlusion and
// orbit logic are unit-testable instead of living inline in useFrame.

export const KEPLER_NEWTON_ITERATIONS = 5;

/** Solve Kepler's equation M = E - e·sin(E) by Newton iteration. */
export function solveEccentricAnomaly(meanAnomaly: number, e: number): number {
  let eccentricAnomaly = meanAnomaly;
  for (let i = 0; i < KEPLER_NEWTON_ITERATIONS; i++) {
    eccentricAnomaly -=
      (eccentricAnomaly - e * Math.sin(eccentricAnomaly) - meanAnomaly) /
      (1 - e * Math.cos(eccentricAnomaly));
  }
  return eccentricAnomaly;
}

const scratchClosest = new THREE.Vector3();
const scratchDir = new THREE.Vector3();

/**
 * True when the segment camera→point passes through a sphere at the origin —
 * the "star is behind the black hole's shadow" test.
 */
export function segmentOccludedBySphere(
  cam: THREE.Vector3,
  point: THREE.Vector3,
  sphereRadius: number,
): boolean {
  scratchDir.copy(point).sub(cam);
  const lengthSq = scratchDir.lengthSq();
  if (lengthSq === 0) return false;
  const t = -cam.dot(scratchDir) / lengthSq;
  if (t <= 0 || t >= 1) return false;
  return scratchClosest.copy(scratchDir).multiplyScalar(t).add(cam).length() < sphereRadius;
}

/**
 * True when the segment camera→point crosses the (opaque) accretion-disk
 * annulus in the y=0 plane between camera and point. The real disk carries a
 * ~6° tilt; at our camera distances the flat-plane approximation is within a
 * fraction of the disk's thickness feather.
 */
export function segmentCrossesDiskAnnulus(
  cam: THREE.Vector3,
  point: THREE.Vector3,
  innerRadius: number,
  outerRadius: number,
): boolean {
  const dy = point.y - cam.y;
  if (dy === 0) return false; // parallel to the plane
  const t = -cam.y / dy;
  if (t <= 0 || t >= 1) return false; // crossing not between camera and point
  const x = cam.x + (point.x - cam.x) * t;
  const z = cam.z + (point.z - cam.z) * t;
  const r = Math.hypot(x, z);
  return r > innerRadius && r < outerRadius;
}
