import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Base directory for all files and folders (the vault)
const VAULT_DIR = path.join(process.cwd(), 'vault');

// Templates directory
const TEMPLATES_DIR = path.join(VAULT_DIR, 'templates');

// Composition templates directory
const COMPOSITION_TEMPLATES_DIR = path.join(VAULT_DIR, 'composition_templates');

// GET /api/templates/list - Get templates from a specific directory
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const directory = url.searchParams.get('directory');
    
    let templatesDir = TEMPLATES_DIR; // Default to regular templates
    
    if (directory === 'composition_templates') {
      templatesDir = COMPOSITION_TEMPLATES_DIR;
      
      // Create composition_templates directory if it doesn't exist
      if (!fs.existsSync(COMPOSITION_TEMPLATES_DIR)) {
        fs.mkdirSync(COMPOSITION_TEMPLATES_DIR, { recursive: true });
        
        // Create a sample composition template
        const sampleTemplate = `---
title: {{ title }}
date: {{ date }}
type: composition
tags: ['composition', 'generated']
---

# {{ title }}

Created on {{ date | dateFormat('MMMM d, yyyy') }} at {{ time | timeFormat }}

## Introduction

{% if description %}
{{ description }}
{% else %}
This is a composition document that combines multiple sections into a cohesive narrative.
{% endif %}

## Main Content

### Section 1: Overview

This section provides a high-level overview of the topic.

### Section 2: Details

This section dives deeper into the specifics of the topic.

### Section 3: Analysis

This section analyzes the implications and significance of the topic.

## Conclusion

This composition brings together various elements to create a comprehensive document.

---

*Composition created with the composition template*
`;
        
        fs.writeFileSync(path.join(COMPOSITION_TEMPLATES_DIR, 'sample-composition.md'), sampleTemplate, 'utf8');
      }
    }
    
    // Check if directory exists
    if (!fs.existsSync(templatesDir)) {
      return NextResponse.json({ templates: [] });
    }
    
    // Get templates from the specified directory
    const templateFiles = fs.readdirSync(templatesDir)
      .filter(file => file.endsWith('.md'))
      .map(file => ({
        name: file.replace(/\.md$/, ''),
        path: path.join(templatesDir, file)
      }));
    
    return NextResponse.json({ templates: templateFiles });
  } catch (error) {
    console.error('Error loading templates:', error);
    return NextResponse.json({ error: 'Failed to load templates' }, { status: 500 });
  }
} 