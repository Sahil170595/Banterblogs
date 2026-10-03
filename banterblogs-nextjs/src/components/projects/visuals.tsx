import type { ComponentType } from 'react';
import { VerificationVisual } from './code-verification/VerificationVisual';
import { ServiceVisual } from './customer-service/ServiceVisual';
import { FlightRoutingVisual } from './flight-routing/FlightRoutingVisual';
import { TriageVisual } from './intake-triage/TriageVisual';
import { OpeVisual } from './offline-policy-evaluation/OpeVisual';
import { SheetVisual } from './spreadsheet-reasoning/SheetVisual';
import { WorkflowVisual } from './workflow-observatory/WorkflowVisual';

export interface ProjectVisualProps {
  /** the accent squares or strokes in ember */
  accent?: boolean;
}

/** Each project's card picture, by slug; the catalog test requires one per project. */
export const PROJECT_VISUALS: Record<string, ComponentType<ProjectVisualProps>> = {
  'flight-routing': FlightRoutingVisual,
  'offline-policy-evaluation': OpeVisual,
  'customer-service': ServiceVisual,
  'code-verification': VerificationVisual,
  'spreadsheet-reasoning': SheetVisual,
  'workflow-observatory': WorkflowVisual,
  'intake-triage': TriageVisual,
};
