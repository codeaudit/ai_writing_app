import { NextResponse } from 'next/server';
import { saveDocument, saveFolder } from '@/lib/fs-service';
import { Document, Folder } from '@/lib/store';

// POST /api/migrate - Initialize the file system with sample data
export async function POST() {
  try {
    // Create sample folders
    const folders: Folder[] = [
      {
        id: "folder-1",
        name: "Getting Started",
        createdAt: new Date(),
        parentId: null,
      }
    ];
    
    // Create sample documents
    const documents: Document[] = [
      {
        id: "doc1",
        name: "Welcome",
        content: "# Getting Started\n\nWelcome to the Markdown Writing App!",
        createdAt: new Date(),
        updatedAt: new Date(),
        versions: [],
        folderId: "folder-1",
        annotations: []
      },
      {
        id: "doc2",
        name: "Features",
        content: "# Features\n\n- Markdown editing\n- AI assistance\n- Multiple document support",
        createdAt: new Date(),
        updatedAt: new Date(),
        versions: [],
        folderId: null,
        annotations: []
      },
      {
        id: "doc3",
        name: "Tips & Tricks",
        content: "# Tips & Tricks\n\n1. Use keyboard shortcuts\n2. Save often\n3. Experiment with AI",
        createdAt: new Date(),
        updatedAt: new Date(),
        versions: [],
        folderId: null,
        annotations: []
      },
    ];
    
    // Save folders
    for (const folder of folders) {
      saveFolder(folder);
    }
    
    // Save documents
    for (const document of documents) {
      saveDocument(document);
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'File system initialized with sample data',
      folders: folders.length,
      documents: documents.length
    });
  } catch (error) {
    console.error('Error initializing file system:', error);
    return NextResponse.json({ 
      error: 'Failed to initialize file system', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
} 