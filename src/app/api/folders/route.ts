import { NextRequest, NextResponse } from 'next/server';
import { loadFolders, saveFolder, deleteFolder } from '@/lib/fs-service';
import { Folder } from '@/lib/store';

// GET /api/folders - Get all folders
export async function GET() {
  try {
    const folders = loadFolders();
    return NextResponse.json(folders);
  } catch (error) {
    console.error('Error loading folders:', error);
    return NextResponse.json({ error: 'Failed to load folders' }, { status: 500 });
  }
}

// POST /api/folders - Create or update a folder
export async function POST(request: NextRequest) {
  try {
    const folder = await request.json() as Folder;
    
    if (!folder || !folder.id || !folder.name) {
      return NextResponse.json({ error: 'Invalid folder data' }, { status: 400 });
    }
    
    // Fix dates that might have been serialized as strings
    if (typeof folder.createdAt === 'string') {
      folder.createdAt = new Date(folder.createdAt);
    }
    
    const savedFolder = saveFolder(folder);
    return NextResponse.json(savedFolder);
  } catch (error) {
    console.error('Error saving folder:', error);
    return NextResponse.json({ error: 'Failed to save folder' }, { status: 500 });
  }
}

// DELETE /api/folders/:id - Delete a folder
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const recursive = url.searchParams.get('recursive') === 'true';
    
    if (!id) {
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 });
    }
    
    const result = deleteFolder(id, { recursive });
    
    if (!result.success) {
      if (result.canRecurse) {
        // Special case: the folder has contents but could be deleted recursively
        return NextResponse.json({ 
          error: result.error,
          canRecurse: true,
          documentCount: result.documentCount
        }, { status: 409 }); // Conflict status code
      }
      
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting folder:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to delete folder' 
    }, { status: 500 });
  }
} 