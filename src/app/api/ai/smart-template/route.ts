import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/lib/inngest/client';

export async function POST(req: NextRequest) {
  try {
    // Parse request
    const { templateType, customInstructions, requestId } = await req.json();
    
    if (!templateType) {
      return NextResponse.json(
        { error: 'Template type is required' },
        { status: 400 }
      );
    }

    const userId = 'mock-user-id'; // Mock user ID for testing
    
    // Trigger Inngest event
    await inngest.send({
      name: 'template.generation.requested',
      data: {
        userId,
        templateType,
        customInstructions: customInstructions || '',
        requestId
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Template generation started',
      requestId,
    });

  } catch (error) {
    console.error('Error in smart template API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 