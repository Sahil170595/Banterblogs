import { NextResponse } from 'next/server';

export async function GET() {
  // Simple implementation without file watching for now
  return new NextResponse(
    'data: {"message": "simple SSE" event: connected\n\n',
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    }
  );
}