import { z } from 'zod';

// The part of ProjectWyvern's mission contract (src/wyvern/contracts.py at the
// linked commit) that its validator, safety guard and executor read, and its
// own sample mission (tests/fixtures/sample_mission.json).

const waypoint = z.object({ seq: z.number().int().min(1), lat: z.number().finite(), lon: z.number().finite(), alt_m: z.number().finite() }).strict();

export const missionSchema = z
  .object({
    mission_id: z.string().min(1).max(64),
    geofence: z.array(z.tuple([z.number().finite(), z.number().finite()])).min(3).max(32),
    waypoints: z.array(waypoint).min(1).max(32),
    constraints: z
      .object({
        max_altitude_m: z.number().finite(),
        min_battery_percent: z.number().min(0).max(100),
        telemetry_freshness_ms: z.number().int().min(1),
        mission_timeout_s: z.number().int().min(1),
        /** declared, and required, by the contract; no service reads it */
        link_loss_policy: z.enum(['hold', 'rtl', 'land']),
        rtl_policy: z.string(),
      })
      .strict(),
    regulatory: z
      .object({
        operation_type: z.string(),
        remote_id_required: z.boolean(),
        remote_id_status: z.enum(['active', 'inactive', 'unknown']),
        airspace_authorization_ref: z.string().nullable(),
      })
      .strict(),
  })
  .strict();
export type Mission = z.infer<typeof missionSchema>;
export type Waypoint = Mission['waypoints'][number];

export const SAMPLE_MISSION: Mission = missionSchema.parse({
  mission_id: 'mis_test_001',
  // [lon, lat], as the contract stores them
  geofence: [
    [-71.11, 42.29],
    [-71.09, 42.29],
    [-71.09, 42.31],
    [-71.11, 42.31],
  ],
  waypoints: [
    { seq: 1, lat: 42.3002, lon: -71.1, alt_m: 22.0 },
    { seq: 2, lat: 42.3005, lon: -71.0997, alt_m: 24.0 },
    { seq: 3, lat: 42.3003, lon: -71.0995, alt_m: 22.0 },
  ],
  constraints: {
    max_altitude_m: 30.0,
    min_battery_percent: 25.0,
    telemetry_freshness_ms: 1500,
    mission_timeout_s: 600,
    link_loss_policy: 'rtl',
    rtl_policy: 'immediate_on_critical',
  },
  regulatory: { operation_type: 'part107', remote_id_required: true, remote_id_status: 'active', airspace_authorization_ref: 'laanc_auth_test_001' },
});

/** the sample route flown twice, so a fault that starts mid-flight has a flight left to change */
export const LONG_MISSION: Mission = {
  ...SAMPLE_MISSION,
  waypoints: [...SAMPLE_MISSION.waypoints, ...SAMPLE_MISSION.waypoints].map((w, i) => ({ ...w, seq: i + 1 })),
};
