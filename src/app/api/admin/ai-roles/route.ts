import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Set runtime to Node.js since we need file system access
export const runtime = 'nodejs';

// Path to the AI roles configuration file
const AI_ROLES_PATH = path.join(process.cwd(), 'vault/system/ai-roles.md');

// Default content if the file doesn't exist
const DEFAULT_CONTENT = `# AI Roles Configuration

This document defines the system prompts for different AI roles in the writing application.

## Assistant

You are a helpful writing assistant. I will provide suggestions only when asked.

## Co-creator

You are an active writing partner. I will collaborate with you, suggesting ideas and content as we work together.

## Validator

You are a critical reviewer. I will analyze your writing for issues with structure, clarity, and style.

## Autopilot

I will take the lead on generating complete content based on your parameters.`;

// GET handler to retrieve the current content
export async function GET() {
  try {
    let content = '';
    
    // Check if the file exists
    if (fs.existsSync(AI_ROLES_PATH)) {
      content = fs.readFileSync(AI_ROLES_PATH, 'utf8');
    } else {
      // Create the directory if it doesn't exist
      const dir = path.dirname(AI_ROLES_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Create the default file
      fs.writeFileSync(AI_ROLES_PATH, DEFAULT_CONTENT);
      content = DEFAULT_CONTENT;
    }
    
    return NextResponse.json({ content });
  } catch (error) {
    console.error('Error reading AI roles file:', error);
    return NextResponse.json(
      { error: 'Failed to read AI roles configuration' },
      { status: 500 }
    );
  }
}

// POST handler to update the content
export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();
    
    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }
    
    // Create the directory if it doesn't exist
    const dir = path.dirname(AI_ROLES_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write the updated content to the file
    fs.writeFileSync(AI_ROLES_PATH, content);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating AI roles file:', error);
    return NextResponse.json(
      { error: 'Failed to update AI roles configuration' },
      { status: 500 }
    );
  }
} 