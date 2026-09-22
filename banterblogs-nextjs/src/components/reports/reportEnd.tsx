// The end of a reading page's body, for the contents' scroll-spy
// (ReportTocSpy): once it is on screen, the last section on screen is being
// read. A plain module, so a server page reads the attribute as a string; a
// value exported from a 'use client' module reaches a server page as a
// client reference.

/** marks the end of the body */
export const REPORT_END_ATTRIBUTE = 'data-report-end';

export function ReportEnd() {
  return <div {...{ [REPORT_END_ATTRIBUTE]: '' }} />;
}
