import { findReportLocations } from './locator';
import { readReportSections, type ReportSection } from './content';

export interface ReportData {
  sections: ReportSection[];
  source: string;
}

export async function loadReportData(id: string): Promise<ReportData | null> {
  const locations = findReportLocations(id);
  if (!locations.length) return null;

  const sectionsMap = new Map<string, ReportSection>();
  for (const candidate of locations) {
    const sections = await readReportSections(id, candidate);
    for (const section of sections) {
      if (!sectionsMap.has(section.originKey)) {
        sectionsMap.set(section.originKey, section);
      }
    }
  }

  return {
    sections: Array.from(sectionsMap.values()),
    source: locations[0].source,
  };
}
