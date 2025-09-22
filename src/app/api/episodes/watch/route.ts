import { NextResponse } from 'next/server';
import { watch } from 'fs';
import path from 'path';

export async function GET(request: Request) {
  const postsDir = path.join(process.cwd(), 'posts');
  const encoder = new TextEncoder();
  let watcher: ReturnType<typeof watch> | null = null;
  let keepAlive: NodeJS.Timeout | null = null;

  const closeResources = (controller: ReadableStreamDefaultController<Uint8Array>) => {
    if (keepAlive) {
      clearInterval(keepAlive);
      keepAlive = null;
    }
    if (watcher) {
      watcher.close();
      watcher = null;
    }
    controller.close();
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      watcher = watch(postsDir, (eventType, filename) => {
        if (!filename || !filename.endsWith('.md')) {
          return;
        }

        const payload = {
          type: eventType,
          filename,
          timestamp: new Date().toISOString(),
        };

        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      });

      controller.enqueue(encoder.encode('event: connected\ndata: "ready"\n\n'));

      keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(': keep-alive\n\n'));
      }, 20000);

      const close = () => {
        closeResources(controller);
      };

      request.signal.addEventListener('abort', close);
    },
    cancel(controller) {
      closeResources(controller);
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
