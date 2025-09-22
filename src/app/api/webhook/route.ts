import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  try {
    await request.json();

    // Revalidate the episodes pages
    revalidatePath('/episodes');
    revalidatePath('/episodes-dynamic');
    revalidatePath('/episodes-live');
    revalidatePath('/');

    console.log('Webhook received, pages revalidated');

    return NextResponse.json({ 
      message: 'Pages revalidated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' }, 
      { status: 500 }
    );
  }
}
