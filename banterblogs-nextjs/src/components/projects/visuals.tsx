import type { ComponentType } from 'react';
import { VerificationVisual } from './code-verification/VerificationVisual';
import { WhiteboardVisual } from './collaborative-whiteboard/WhiteboardVisual';
import { ServiceVisual } from './customer-service/ServiceVisual';
import { FlightRoutingVisual } from './flight-routing/FlightRoutingVisual';
import { TriageVisual } from './intake-triage/TriageVisual';
import { MissionVisual } from './mission-governance/MissionVisual';
import { OpeVisual } from './offline-policy-evaluation/OpeVisual';
import { PacingVisual } from './send-pacing/PacingVisual';
import { SheetVisual } from './spreadsheet-reasoning/SheetVisual';
import { SearchVisual } from './staged-search/SearchVisual';
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
  'browser-agent-completion': WorkflowVisual,
  'intake-triage': TriageVisual,
  'staged-search': SearchVisual,
  'send-pacing': PacingVisual,
  'mission-governance': MissionVisual,
  'collaborative-whiteboard': WhiteboardVisual,
};
