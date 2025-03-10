import { NextRequest, NextResponse } from 'next/server';
import { loadDocuments, saveDocument, deleteDocument } from '@/lib/fs-service';
import { Document } from '@/lib/store';

// GET /api/documents - Get all documents
export async function GET() {
  try {
    const documents = loadDocuments();
    return NextResponse.json(documents);
  } catch (error) {
    console.error('Error loading documents:', error);
    return NextResponse.json({ error: 'Failed to load documents' }, { status: 500 });
  }
}

// POST /api/documents - Create or update a document
export async function POST(request: NextRequest) {
  try {
    const document = await request.json() as Document;
    
    if (!document || !document.id || !document.name) {
      return NextResponse.json({ error: 'Invalid document data' }, { status: 400 });
    }
    
    // Fix dates that might have been serialized as strings
    if (typeof document.createdAt === 'string') {
      document.createdAt = new Date(document.createdAt);
    }
    if (typeof document.updatedAt === 'string') {
      document.updatedAt = new Date(document.updatedAt);
    }
    if (document.versions) {
      document.versions = document.versions.map(ver => ({
        ...ver,
        createdAt: typeof ver.createdAt === 'string' ? new Date(ver.createdAt) : ver.createdAt
      }));
    }
    
    const savedDocument = saveDocument(document);
    return NextResponse.json(savedDocument);
  } catch (error) {
    console.error('Error saving document:', error);
    return NextResponse.json({ error: 'Failed to save document' }, { status: 500 });
  }
}

// DELETE /api/documents/:id - Delete a document
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }
    
    deleteDocument(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
} 