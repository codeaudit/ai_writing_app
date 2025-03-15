import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Base directory for all files and folders (the vault)
const VAULT_DIR = path.join(process.cwd(), 'vault');
const FILTER_CONFIG_PATH = path.join(VAULT_DIR, '.filter-config.json');

// Default filter configuration
const DEFAULT_FILTER_CONFIG = {
  enabled: false,
  patterns: ['*.md', '!.obsidian/*'],
};

// GET /api/filter - Get the current filter configuration
export async function GET(request: NextRequest) {
  try {
    // Check if filter config exists
    if (!fs.existsSync(FILTER_CONFIG_PATH)) {
      // Create default filter config if it doesn't exist
      fs.writeFileSync(FILTER_CONFIG_PATH, JSON.stringify(DEFAULT_FILTER_CONFIG, null, 2), 'utf8');
      return NextResponse.json(DEFAULT_FILTER_CONFIG);
    }

    // Read and parse the filter config
    const filterConfigStr = fs.readFileSync(FILTER_CONFIG_PATH, 'utf8');
    const filterConfig = JSON.parse(filterConfigStr);

    return NextResponse.json(filterConfig);
  } catch (error) {
    console.error('Error reading filter config:', error);
    return NextResponse.json(
      { error: 'Failed to read filter configuration' },
      { status: 500 }
    );
  }
}

// POST /api/filter - Update the filter configuration
export async function POST(request: NextRequest) {
  try {
    const filterConfig = await request.json();
    
    // Validate the filter config
    if (typeof filterConfig !== 'object' || 
        typeof filterConfig.enabled !== 'boolean' || 
        !Array.isArray(filterConfig.patterns)) {
      return NextResponse.json(
        { error: 'Invalid filter configuration format' },
        { status: 400 }
      );
    }
    
    // Ensure vault directory exists
    if (!fs.existsSync(VAULT_DIR)) {
      fs.mkdirSync(VAULT_DIR, { recursive: true });
    }
    
    // Write the filter config to file
    fs.writeFileSync(FILTER_CONFIG_PATH, JSON.stringify(filterConfig, null, 2), 'utf8');
    
    return NextResponse.json({ success: true, config: filterConfig });
  } catch (error) {
    console.error('Error saving filter config:', error);
    return NextResponse.json(
      { error: 'Failed to save filter configuration' },
      { status: 500 }
    );
  }
}
