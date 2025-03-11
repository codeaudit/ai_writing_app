import { NextRequest, NextResponse } from 'next/server';
import { loadFolders, saveFolder, deleteFolder } from '@/lib/pattern-fs-service';
import { Folder } from '@/lib/pattern-store';

// GET /api/pattern-folders - Get all folders
export async function GET() {
  try {
    const folders = loadFolders();
    return NextResponse.json(folders);
  } catch (error) {
    console.error('Error loading folders:', error);
    return NextResponse.json({ error: 'Failed to load folders' }, { status: 500 });
  }
}

// POST /api/pattern-folders - Create or update a folder
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

// DELETE /api/pattern-folders/:id - Delete a folder
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 });
    }
    
    deleteFolder(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting folder:', error);
    return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 });
  }
} 