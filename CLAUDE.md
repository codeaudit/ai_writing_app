# AI Writing App - Development Guide

A sophisticated AI-powered writing assistant built with Next.js, React, and TypeScript, featuring multi-provider LLM support, document management, and cross-platform desktop support via Electron.

## Quick Reference Commands

### Development
```bash
npm run dev              # Start Next.js dev server (Turbopack)
npm run electron-dev     # Run Electron + Next.js together
npm run build            # Production build
npm run start            # Start production server
npm run lint             # Run ESLint
```

### Testing
```bash
npm test                           # Run all tests
npm run test:watch                 # Watch mode
npm run test:coverage              # Coverage report
npx jest path/to/test.test.ts      # Single test file
```

### Electron Packaging
```bash
npm run package          # Build & package for current platform
npm run package-all      # Build for all platforms
npm run package-mac      # macOS only
npm run package-win      # Windows only
npm run package-linux    # Linux only
```

### Utilities
```bash
npm run init-vault                 # Initialize vault directory
npm run inngest:dev                # Run Inngest job processor
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/                # API routes
│   │   ├── documents/      # Document CRUD
│   │   ├── folders/        # Folder management
│   │   ├── templates/      # Template operations
│   │   ├── ai-roles/       # AI role configuration
│   │   ├── sessions/       # Session management
│   │   ├── config/         # App configuration
│   │   ├── trpc/           # tRPC endpoint
│   │   └── auth/           # NextAuth authentication
│   ├── chat/               # Chat interface pages
│   ├── documents/          # Document management pages
│   └── settings/           # Settings page
├── components/             # React components (~88 total)
│   ├── auth/               # Authentication components
│   ├── schema-form/        # Form input components
│   └── ui/                 # Shadcn UI components
├── lib/                    # Core utilities
│   ├── store.ts            # Zustand stores (main state)
│   ├── fs-service.ts       # File system operations
│   ├── api-service.ts      # API client
│   ├── cache-utils.ts      # Caching utilities
│   └── llm/                # LLM provider integrations
├── server/                 # tRPC routers
├── contexts/               # React Context providers
├── hooks/                  # Custom React hooks
├── types/                  # TypeScript definitions
├── utils/                  # Utility functions
└── __tests__/              # Jest test files

electron/
├── main.js                 # Electron main process
└── preload.js              # Context bridge (IPC)

vault/                      # Document storage (file-based)
├── .obsidian/              # Metadata (indexes, sessions)
├── system/                 # System files
├── templates/              # User templates
└── [folders]/              # User documents (.md, .mdx)
```

## Technology Stack

### Core Framework
- **Next.js 15.2.1** with App Router & Turbopack
- **React 19.0.0** with Server Components
- **TypeScript 5** (strict mode)
- **Electron** for desktop app

### UI Layer
- **Tailwind CSS 4** - Utility-first styling
- **Shadcn UI** - Component library (Radix UI primitives)
- **Framer Motion** - Animations
- **Lucide React** - Icons
- **Monaco Editor** - Code/markdown editing

### State Management
- **Zustand 5** - Global state with localStorage persistence
- **React Query (TanStack)** - Server state
- **tRPC 11** - End-to-end typesafe APIs
- **React Context** - Theme, comparison mode

### AI/LLM Providers
- **Anthropic SDK** - Claude models
- **OpenAI SDK** - GPT models
- **Google Generative AI** - Gemini models
- **Vercel AI SDK** - Streaming support
- **MCP SDK** - Model Context Protocol integration
- **LangChain** - LLM framework utilities

### Markdown/Content
- **MDX** - Enhanced markdown with components
- **react-markdown** - Rendering
- **gray-matter** - Frontmatter parsing
- **rehype/remark plugins** - Processing pipeline
- **KaTeX** - Math rendering

### Storage
- **File-based** - Markdown files in `/vault`
- **Vercel KV** - Optional Redis caching
- **localStorage** - Client state persistence

## Architecture Overview

### State Management (src/lib/store.ts)

Three main Zustand stores:

**DocumentStore** - Document/folder management
```typescript
- documents, folders, compositions
- CRUD operations: addDocument, updateDocument, deleteDocument
- Folder operations: addFolder, moveFolder, copyFolder
- Annotations: addAnnotation, updateAnnotation, deleteAnnotation
- Version management and comparison mode
```

**LLMStore** - AI configuration
```typescript
- config: { provider, apiKey, model, temperature, maxTokens, aiRole }
- Provider-specific API key management
- Server config synchronization
```

**AIChatStore** - Chat/threading
```typescript
- chatTree with nodes and activeThread
- Branching: createSiblingNode, addResponseNode
- Thread navigation and history
```

### API Structure

| Endpoint | Purpose |
|----------|---------|
| `/api/documents` | Document CRUD, rename, move |
| `/api/folders` | Folder CRUD, copy, rename |
| `/api/templates/*` | Template list, process, preview |
| `/api/ai-roles/*` | AI role management |
| `/api/sessions` | Session tracking |
| `/api/config` | App configuration |
| `/api/backlinks` | Document backlink resolution |
| `/api/trpc/[trpc]` | tRPC endpoint |

### Data Flow
```
User Input → React Component → Zustand Store → API Route → File System
                    ↓
              tRPC Client → tRPC Server → Business Logic
```

## Code Conventions

### Naming
- **Components**: PascalCase (`AIChat`, `DocumentView`)
- **Files**: kebab-case (`ai-chat.tsx`, `document-view.tsx`)
- **Functions/Variables**: camelCase (`generateResponse`, `documentId`)
- **Types/Interfaces**: PascalCase (`Document`, `Folder`, `Annotation`)
- **Constants**: UPPER_SNAKE_CASE (`VAULT_DIR`, `TEMPLATES_DIR`)

### Imports
Always use path aliases:
```typescript
import { Button } from '@/components/ui/button';
import { useDocumentStore } from '@/lib/store';
import { Document } from '@/types/document';
```

### Components
```typescript
'use client'; // Only when needed (hooks, interactivity)

interface ComponentProps {
  title: string;
  onAction: () => void;
}

export function ComponentName({ title, onAction }: ComponentProps) {
  // Implementation
}
```

### State Management
- **Global state**: Zustand stores in `src/lib/store.ts`
- **Local sharing**: React Context in `src/contexts/`
- **Server state**: tRPC with React Query
- **Form state**: react-hook-form with Zod validation

### Error Handling
```typescript
try {
  await performOperation();
} catch (error) {
  console.error('Operation failed:', error);
  toast.error('Operation failed. Please try again.');
}
```

### TypeScript
- Explicit types for all function parameters and returns
- Use Zod schemas for runtime validation
- Avoid `any` - use `unknown` with type guards
- Define interfaces for all component props

## Testing

### Test Structure
```typescript
// src/__tests__/lib/example.test.ts
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

describe('FeatureName', () => {
  beforeEach(() => {
    // Reset state
  });

  it('should perform expected behavior', () => {
    // Arrange
    // Act
    // Assert
  });
});
```

### Test Files Location
- Unit tests: `src/__tests__/lib/`
- Component tests: `src/__tests__/components/`
- Integration tests: `src/__tests__/integration/`

### Key Test Areas
- Store operations (documents, annotations)
- API service mocking
- File system service
- Cache utilities
- Vault integrity checks

## Electron Desktop App

### Architecture
```
Main Process (electron/main.js)
    ↓ IPC
Preload Script (electron/preload.js)
    ↓ Context Bridge
Renderer Process (Next.js App)
```

### Exposed APIs (window.electron)
- `openFile()`, `openFolder()`, `saveFile(data)`
- `exportDocument(data)`
- `getTemplates()`, `getTemplateContent(name)`
- `processTemplate(name, variables)`
- `onMenuAction(channel, callback)`

### Keyboard Shortcuts
| Action | Shortcut |
|--------|----------|
| New Document | Ctrl/Cmd + N |
| Open File | Ctrl/Cmd + O |
| Save | Ctrl/Cmd + S |
| Find | Ctrl/Cmd + F |
| Toggle Left Panel | Ctrl/Cmd + B |
| Toggle Right Panel | Ctrl/Cmd + J |
| Toggle Dark Mode | Ctrl/Cmd + Shift + D |

## Key Components

### Chat System
- `ai-chat.tsx` - Main chat interface with threading/branching
- `ai-composer.tsx` - AI writing assistant panel
- `prompt-enhancement.tsx` - Prompt improvement suggestions
- `branch-menu.tsx` - Chat thread branching UI

### Document Management
- `directory-view.tsx` - File/folder browser
- `document-navigation.tsx` - Document tree
- `document-view.tsx` - Document display
- `markdown-editor.tsx` - Monaco-based editor
- `markdown-renderer.tsx` - Markdown preview

### MCP Integration
- `mcp-servers-indicator.tsx` - Active MCP servers status
- `mcp-toggle.tsx` - Server initialization control

## Environment Variables

Required in `.env.local`:
```bash
# LLM Provider Keys (at least one required)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=

# Optional
ENABLE_AI_CACHE=true
KV_REST_API_URL=
KV_REST_API_TOKEN=
NEXTAUTH_SECRET=
```

## Common Tasks

### Adding a New API Route
1. Create route file in `src/app/api/[route]/route.ts`
2. Export HTTP method handlers (GET, POST, etc.)
3. Use Zod for request validation
4. Return NextResponse with appropriate status

### Adding a New Component
1. Create file in `src/components/` (kebab-case)
2. Add `'use client'` if interactive
3. Define TypeScript interface for props
4. Export named function component

### Modifying Store State
1. Update interface in `src/lib/store.ts`
2. Add action methods to store
3. Update persistence configuration if needed
4. Add tests in `src/__tests__/lib/store.test.ts`

### Adding tRPC Procedures
1. Create/modify router in `src/server/routers/`
2. Add to main router in `src/server/routers/_app.ts`
3. Use from client with `trpc.routerName.procedureName.useQuery/useMutation`

## Pre-Commit Checklist

1. Run `npm run lint` - fix any ESLint errors
2. Run `npm test` - ensure all tests pass
3. Check TypeScript: no type errors in changed files
4. Test in browser: verify UI changes work correctly
5. For Electron changes: test with `npm run electron-dev`

## Additional Documentation

- `ARCHITECTURE.md` - Detailed architecture overview
- `ELECTRON.md` - Electron-specific setup and troubleshooting
