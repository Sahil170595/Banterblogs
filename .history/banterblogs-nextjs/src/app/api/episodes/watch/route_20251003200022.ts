import { NextResponse } from 'next/server';

export async function GET() {
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
      const id = setInterval(() => send('ping', { t: Date.now() }), 25000);

      // when the stream is cancelled
      controller.signal.addEventListener('abort', () => clearInterval(id));
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