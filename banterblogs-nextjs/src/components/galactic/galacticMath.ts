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
const scratchLocalCam = new THREE.Vector3();
const scratchLocalPoint = new THREE.Vector3();
const scratchInverseOrientation = new THREE.Quaternion();

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
 * True when the segment camera→point crosses the optically thick accretion
 * annulus between camera and point. When an orientation is supplied the ray
 * is transformed into the rendered disk's exact local plane.
 */
export function segmentCrossesDiskAnnulus(
  cam: THREE.Vector3,
  point: THREE.Vector3,
  innerRadius: number,
  outerRadius: number,
  diskOrientation?: THREE.Quaternion,
): boolean {
  const localCam = scratchLocalCam.copy(cam);
  const localPoint = scratchLocalPoint.copy(point);
  if (diskOrientation) {
    scratchInverseOrientation.copy(diskOrientation).invert();
    localCam.applyQuaternion(scratchInverseOrientation);
    localPoint.applyQuaternion(scratchInverseOrientation);
  }

  const dy = localPoint.y - localCam.y;
  if (dy === 0) return false; // parallel to the plane
  const t = -localCam.y / dy;
  if (t <= 0 || t >= 1) return false; // crossing not between camera and point
  const x = localCam.x + (localPoint.x - localCam.x) * t;
  const z = localCam.z + (localPoint.z - localCam.z) * t;
  const r = Math.hypot(x, z);
  return r > innerRadius && r < outerRadius;
}
