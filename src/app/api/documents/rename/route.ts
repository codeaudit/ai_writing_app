import { NextRequest, NextResponse } from 'next/server';
import { renameDocument, updateLinks } from '@/lib/fs-service';

// POST /api/documents/rename - Rename a document and update links
export async function POST(request: NextRequest) {
  try {
    const { id, newName } = await request.json();
    
    if (!id || !newName) {
      return NextResponse.json({ error: 'Document ID and new name are required' }, { status: 400 });
    }
    
    // First get the document to get its old name
    const document = renameDocument(id, newName);
    
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    
    // Update links in other documents
    const updatedCount = updateLinks(document.name, newName);
    
    return NextResponse.json({ 
      document, 
      updatedLinks: updatedCount 
    });
  } catch (error) {
    console.error('Error renaming document:', error);
    return NextResponse.json({ error: 'Failed to rename document' }, { status: 500 });
  }
} 