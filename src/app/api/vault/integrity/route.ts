import { NextRequest, NextResponse } from 'next/server';
import { checkAndFixVaultIntegrity } from '@/lib/vault-integrity';
import fs from 'fs';
import path from 'path';

// Ensure the vault and .obsidian directories exist
const ensureVaultDirectories = () => {
  const vaultDir = path.join(process.cwd(), 'vault');
  const obsidianDir = path.join(vaultDir, '.obsidian');
  
  if (!fs.existsSync(vaultDir)) {
    fs.mkdirSync(vaultDir, { recursive: true });
  }
  
  if (!fs.existsSync(obsidianDir)) {
    fs.mkdirSync(obsidianDir, { recursive: true });
  }
  
  // Ensure the index files exist with at least empty arrays
  const documentsIndex = path.join(obsidianDir, 'documents-index.json');
  const foldersIndex = path.join(obsidianDir, 'folders-index.json');
  
  if (!fs.existsSync(documentsIndex)) {
    fs.writeFileSync(documentsIndex, '[]', 'utf8');
  }
  
  if (!fs.existsSync(foldersIndex)) {
    fs.writeFileSync(foldersIndex, '[]', 'utf8');
  }
};

export async function GET(request: NextRequest) {
  try {
    // Ensure required directories and files exist
    ensureVaultDirectories();
    
    // Run the vault integrity check
    const result = await checkAndFixVaultIntegrity();
    
    // Add success flag to the result
    const enhancedResult = { ...result, success: true };
    
    // Return the results
    return NextResponse.json(enhancedResult);
  } catch (error) {
    console.error('Error in vault integrity API:', error);
    
    // Provide more detailed error information
    const errorMessage = (error as Error).message;
    const errorStack = (error as Error).stack;
    
    return NextResponse.json(
      { 
        error: 'Failed to check vault integrity', 
        message: errorMessage,
        stack: errorStack,
        success: false 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Ensure required directories and files exist
    ensureVaultDirectories();
    
    // Run the vault integrity check
    const result = await checkAndFixVaultIntegrity();
    
    // Add success flag to the result
    const enhancedResult = { ...result, success: true };
    
    // Return the results
    return NextResponse.json(enhancedResult);
  } catch (error) {
    console.error('Error in vault integrity API:', error);
    
    // Provide more detailed error information
    const errorMessage = (error as Error).message;
    const errorStack = (error as Error).stack;
    
    return NextResponse.json(
      { 
        error: 'Failed to check vault integrity', 
        message: errorMessage,
        stack: errorStack,
        success: false 
      },
      { status: 500 }
    );
  }
}
