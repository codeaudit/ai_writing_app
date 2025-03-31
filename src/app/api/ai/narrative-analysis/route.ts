import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/lib/inngest/client';

export async function POST(req: NextRequest) {
  try {
    // Parse request
    const { documentId, structureType } = await req.json();
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    const userId = 'mock-user-id'; // Mock user ID for testing
    
    // Trigger Inngest event
    await inngest.send({
      name: 'narrative.analysis.requested',
      data: {
        documentId,
        structureType: structureType || 'any',
        userId
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Narrative analysis started',
      documentId,
    });

  } catch (error) {
    console.error('Error in narrative analysis API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 