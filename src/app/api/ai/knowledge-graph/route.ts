import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/lib/inngest/client';

export async function POST(req: NextRequest) {
  try {
    // Parse request
    const { documentId, focusAreas, depth } = await req.json();
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    const userId = 'mock-user-id'; // Mock user ID for testing
    
    // Trigger Inngest event
    await inngest.send({
      name: 'knowledge.graph.generation.requested',
      data: {
        documentId,
        focusAreas: focusAreas || [],
        depth: typeof depth === 'number' ? depth : 3,
        userId
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Knowledge graph generation started',
      documentId,
    });

  } catch (error) {
    console.error('Error in knowledge graph API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 