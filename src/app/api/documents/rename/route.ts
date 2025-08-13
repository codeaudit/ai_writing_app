import { NextRequest, NextResponse } from 'next/server';
import { renameDocument } from '@/lib/fs-service';

// POST /api/documents/rename - Rename a document and update links
export async function POST(request: NextRequest) {
  try {
    const { id, newName } = await request.json();
    
    if (!id || !newName) {
      return NextResponse.json({ error: 'Document ID and new name are required' }, { status: 400 });
    }
    
    const result = renameDocument(id, newName);
    
    if (!result) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error renaming document:', error);
    return NextResponse.json({ error: 'Failed to rename document' }, { status: 500 });
  }
} 