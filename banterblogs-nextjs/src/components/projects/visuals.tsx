import type { ComponentType } from 'react';
import { FlightRoutingVisual } from './flight-routing/FlightRoutingVisual';
import { OpeVisual } from './offline-policy-evaluation/OpeVisual';

export interface ProjectVisualProps {
  /** the accent squares or strokes in ember */
  accent?: boolean;
}

/** Each project's card picture, by slug; the catalog test requires one per project. */
export const PROJECT_VISUALS: Record<string, ComponentType<ProjectVisualProps>> = {
  'flight-routing': FlightRoutingVisual,
  'offline-policy-evaluation': OpeVisual,
};
