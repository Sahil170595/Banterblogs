import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

// Simple webhook authentication
function verifyWebhookSignature(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  const secretToken = process.env.WEBHOOK_SECRET_TOKEN;
  
  if (!secretToken) {
    console.warn('WEBHOOK_SECRET_TOKEN not configured');
    return false;
  }
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  
  const token = authHeader.substring(7);
  return token === secretToken;
}

export async function POST(request: Request) {
  try {
    // Verify authentication
    if (!verifyWebhookSignature(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    const data = await request.json();
    console.log('Webhook payload received:', data);

    // Revalidate the episodes pages
    revalidatePath('/episodes');
    revalidatePath('/episodes-dynamic');
    revalidatePath('/episodes-live');
    revalidatePath('/');
    revalidatePath('/tags');
    revalidatePath('/api/episodes');

    console.log('Pages revalidated successfully');

    return NextResponse.json({ 
      message: 'Pages revalidated successfully',
      timestamp: new Date().toISOString(),
      revalidated: [
        '/episodes',
        '/episodes-dynamic', 
        '/episodes-live',
        '/',
        '/tags',
        '/api/episodes'
      ]
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' }, 
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({ ok: true }, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' 
        ? 'https://banterblogs.vercel.app' 
        : 'http://localhost:3000',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
