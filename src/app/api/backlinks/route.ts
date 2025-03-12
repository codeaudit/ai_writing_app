import { NextRequest, NextResponse } from 'next/server';
import { getBacklinks } from '@/lib/fs-service';

// GET /api/backlinks?id=<docId> - Get all backlinks to a document
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }
    
    const backlinks = getBacklinks(id);
    return NextResponse.json(backlinks);
  } catch (error) {
    console.error('Error getting backlinks:', error);
    return NextResponse.json({ error: 'Failed to get backlinks' }, { status: 500 });
  }
} 