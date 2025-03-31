import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/lib/inngest/client';

export async function POST(req: NextRequest) {
  try {
    // Parse request
    const { content, theme, tone, requestId } = await req.json();
    
    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    const userId = 'mock-user-id'; // Mock user ID for testing
    
    // Trigger Inngest event
    await inngest.send({
      name: 'metaphor.enhancement.requested',
      data: {
        content,
        theme: theme || 'general',
        tone: tone || 'neutral',
        userId,
        requestId
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Metaphor enhancement started',
      requestId,
    });

  } catch (error) {
    console.error('Error in metaphor enhancement API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 