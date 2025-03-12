import { NextRequest, NextResponse } from 'next/server';
import { moveDocument } from '@/lib/fs-service';

// POST /api/documents/move - Move a document to a different folder
export async function POST(request: NextRequest) {
  try {
    const { id, targetFolderId } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }
    
    // targetFolderId can be null (to move to root)
    const document = moveDocument(id, targetFolderId);
    
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    
    return NextResponse.json(document);
  } catch (error) {
    console.error('Error moving document:', error);
    return NextResponse.json({ error: 'Failed to move document' }, { status: 500 });
  }
} 