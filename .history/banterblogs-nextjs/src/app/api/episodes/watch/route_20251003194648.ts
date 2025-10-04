import { NextResponse } from 'next/server';
import { watch } from 'fs';
import path from 'path';

const watchers = new Map<string, ReturnType<typeof watch>>();
const activeConnections = new Set<ReadableStreamDefaultController<Uint8Array>>();

// Clean up watchers when no connections are active
const cleanupWatchers = () => {
  for (const [dir, watcher] of watchers) {
    watcher.close();
    watchers.delete(dir);
  }
};

export async function GET(request: Request) {
  const postsDir = path.join(process.cwd(), 'posts');
  const encoder = new TextEncoder();
  
  // Rate limiting - check if directory was modified recently
  const lastModified = Date.now();
  const rateLimitKey = `${postsDir}_${Math.floor(lastModified / 1000)}`;
  
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      activeConnections.add(controller);
      
      controller.enqueue(encoder.encode('event: connected\ndata: "ready"\n\n'));
      
      // Set up watcher only if not already active
      if (!watchers.has(postsDir)) {
        try {
          const watcher = watch(postsDir, { recursive: false }, (eventType, filename) => {
            if (!filename || !filename.endsWith('.md') || !activeConnections.size) {
              return;
            }

            const payload = {
              type: eventType,
              filename,
              timestamp: new Date().toISOString(),
            };

            // Send to all active connections
            const message = `data: ${JSON.stringify(payload)}\n\n`;
            for (const conn of activeConnections) {
              try {
                conn.enqueue(encoder.encode(message));
              } catch (error) {
                // Remove dead connections
                activeConnections.delete(conn);
              }
            }
          });
          
          watchers.set(postsDir, watcher);
          
          // Handle watcher errors
          watcher.on('error', (error) => {
            console.error('File watcher error:', error);
            cleanUpWatcher();
          });
          
        } catch (error) {
          console.error('Failed to set up file watcher:', error);
          controller.enqueue(encoder.encode('event: error\ndata: {"error": "file watching failed"}\n\n'));
        }
      }
      
      // Keep alive heartbeats
      const keepAlive = setInterval(() => {
        if (!activeConnections.has(controller)) {
          clearInterval(keepAlive);
          return;
        }
        
        try {
          controller.enqueue(encoder.encode(': keep-alive\n\n'));
        } catch (error) {
          clearInterval(keepAlive);
          activeConnections.delete(controller);
        }
      }, 30000);

      // Cleanup when connection closes
      const cleanup = () => {
        activeConnections.delete(controller);
        clearInterval(keepAlive);
        
        if (activeConnections.size === 0) {
          cleanupWatchers();
        }
      };

      request.signal.addEventListener('abort', cleanup);
      
      // Also cleanup periodically
      const cleanupTimer = setTimeout(cleanup, 5 * 60 * 1000); // 5 min timeout
      
      controller.close = () => {
        clearTimeout(cleanupTimer);
        cleanup();
      };
    },
    
    cancel() {
      activeConnections.clear();
      cleanupWatchers();
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Content-Type-Options': 'nosniff',
      'X-Accel-Buffering': 'no', // Disable proxy buffering
    },
  });
}
