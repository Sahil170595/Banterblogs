import { ImageResponse } from 'next/og';
import { loadReportData } from '@/lib/reports/loadPublishReady';
import { renderTimeseriesSVG } from '@/visuals/server/snapshot';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const title = id.replace(/[-_]/g, ' ');
  let svg = '';
  try {
    const report = await loadReportData(id);
    if (report?.charts) {
      svg = renderTimeseriesSVG(report.charts.timeseries, { width: 560, height: 220 });
    }
  } catch (error) {
    void error;
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          padding: '48px',
          background: 'linear-gradient(135deg,#0b0b0c 0%,#11121a 60%,#191a22 100%)',
          color: 'white',
          fontFamily: 'Inter, ui-sans-serif, system-ui',
        }}
      >
        <div style={{ fontSize: 20, opacity: 0.7, marginBottom: 16 }}>Banterblogs - Report</div>
        <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: -1 }}>{title}</div>
        {svg && (
          <div style={{ marginTop: 24 }} dangerouslySetInnerHTML={{ __html: svg }} />
        )}
      </div>
    ),
    { ...size },
  );
}
