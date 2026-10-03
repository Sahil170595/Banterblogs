import type { Mission } from './engine';

export const FIXTURE_VERSION = 'synthetic-mission-v1';
export const DEFAULT_MISSION: Mission = {
  missionId: 'synthetic-mission-001', approvalRef: 'synthetic-approval-001',
  geofence: [[0,0],[100,0],[100,100],[0,100]],
  waypoints: [{ seq:1,x:20,y:20,altitude:20 },{ seq:2,x:80,y:20,altitude:25 },{ seq:3,x:80,y:80,altitude:25 },{ seq:4,x:20,y:80,altitude:20 }],
  maxAltitude:30, minBattery:30, freshnessMs:1500, timeoutSeconds:1200,
  complianceEnabled:true, remoteRequired:true, remoteStatus:'active', operationType:'part107', airspaceRef:'synthetic-authorization-001',
};
export const TEMPLATES = {
  patrol: DEFAULT_MISSION,
  concave: { ...DEFAULT_MISSION, geofence: [[0,0],[100,0],[100,40],[40,40],[40,100],[0,100]], waypoints: [{ seq:1,x:20,y:80,altitude:20 },{ seq:2,x:80,y:20,altitude:25 }] },
  boundary: { ...DEFAULT_MISSION, waypoints: [{ seq:1,x:100,y:50,altitude:20 },{ seq:2,x:50,y:50,altitude:35 }] },
} satisfies Record<string, Mission>;
