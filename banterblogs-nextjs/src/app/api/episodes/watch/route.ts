import { NextResponse } from 'next/server';
export const runtime = 'nodejs';

export async function GET() {
  let pingInterval: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const send = (evt?: string, data?: any) => {
        let chunk = '';
        if (evt) chunk += `event: ${evt}\n`;
        if (data !== undefined) chunk += `data: ${JSON.stringify(data)}\n`;
        chunk += '\n';
        controller.enqueue(new TextEncoder().encode(chunk));
      };

      // initial hello
      send('connected', { message: 'SSE connected' });

      // keep alive ping (prevents proxies from closing the connection)
      pingInterval = setInterval(() => {
        try {
          send('ping', { t: Date.now() });
        } catch {
          clearInterval(pingInterval);
        }
      }, 25000);
    },
    cancel() {
      clearInterval(pingInterval);
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}