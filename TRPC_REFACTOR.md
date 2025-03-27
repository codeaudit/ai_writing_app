# tRPC Refactoring Plan

## Overview
This document outlines the plan to refactor the writing application to use tRPC for type-safe API communication between the client and server.

## Current Architecture Analysis

### Backend Services
1. **LLM Service**
   - Handles AI model interactions
   - Manages different providers (OpenAI, Anthropic, Google)
   - Processes templates and generates responses

2. **Template Service**
   - Manages document templates
   - Processes templates with variables
   - Handles template storage and retrieval

3. **Document Store**
   - Manages document CRUD operations
   - Handles document metadata and content
   - Manages document relationships

4. **AI Role System**
   - Manages AI role configurations
   - Handles role-specific prompts and behaviors

### Frontend Components
1. **LLM Dialog**
   - Handles AI interactions
   - Manages template selection and processing
   - Handles context files and document selection

2. **Template Tester**
   - Tests template processing
   - Validates template variables
   - Shows template previews

3. **Document Editor**
   - Manages document editing
   - Handles AI-assisted editing
   - Manages document state

## Refactoring Plan

### 1. Initial Setup

#### 1.1 Install Dependencies
```bash
npm install @trpc/server @trpc/client @trpc/react-query @trpc/next @tanstack/react-query zod
```

#### 1.2 Create tRPC Server Setup
```typescript
// src/server/trpc.ts
import { initTRPC } from '@trpc/server';
import { ZodError } from 'zod';

const t = initTRPC.create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
```

### 2. Backend Refactoring

#### 2.1 Create tRPC Routers

1. **LLM Router**
```typescript
// src/server/routers/llm.ts
export const llmRouter = router({
  generateText: publicProcedure
    .input(z.object({
      prompt: z.string(),
      stream: z.boolean().optional(),
      aiRole: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // Implementation
    }),
  
  getModels: publicProcedure
    .query(async () => {
      // Implementation
    }),
});
```

2. **Template Router**
```typescript
// src/server/routers/template.ts
export const templateRouter = router({
  getTemplates: publicProcedure
    .query(async () => {
      // Implementation
    }),
  
  processTemplate: publicProcedure
    .input(z.object({
      templateId: z.string(),
      variables: z.record(z.string()),
    }))
    .mutation(async ({ input }) => {
      // Implementation
    }),
});
```

3. **Document Router**
```typescript
// src/server/routers/document.ts
export const documentRouter = router({
  getDocuments: publicProcedure
    .query(async () => {
      // Implementation
    }),
  
  updateDocument: publicProcedure
    .input(z.object({
      id: z.string(),
      content: z.string(),
    }))
    .mutation(async ({ input }) => {
      // Implementation
    }),
});
```

4. **AI Roles Router**
```typescript
// src/server/routers/ai-roles.ts
export const aiRolesRouter = router({
  getAvailableRoles: publicProcedure
    .query(async () => {
      // Implementation
    }),
  
  getRoleSystemPrompt: publicProcedure
    .input(z.object({
      role: z.string(),
    }))
    .query(async ({ input }) => {
      // Implementation
    }),
});
```

5. **KV Cache Router**
```typescript
// src/server/routers/kv-cache.ts
export const kvCacheRouter = router({
  flushCache: publicProcedure
    .mutation(async () => {
      // Implementation
    }),
  
  getDebugInfo: publicProcedure
    .input(z.object({
      sessionId: z.string(),
    }))
    .query(async ({ input }) => {
      // Implementation
    }),
});
```

6. **Config Router**
```typescript
// src/server/routers/config.ts
export const configRouter = router({
  getConfig: publicProcedure
    .query(async () => {
      // Implementation
    }),
  
  updateConfig: publicProcedure
    .input(z.object({
      // Configuration fields
      apiKeys: z.record(z.string()).optional(),
      defaultModel: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // Implementation
    }),
});
```

7. **Folders Router**
```typescript
// src/server/routers/folders.ts
export const foldersRouter = router({
  getFolders: publicProcedure
    .query(async () => {
      // Implementation
    }),
  
  createFolder: publicProcedure
    .input(z.object({
      name: z.string(),
      parentId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // Implementation
    }),
});
```

8. **Admin Router**
```typescript
// src/server/routers/admin.ts
export const adminRouter = router({
  getSystemStatus: publicProcedure
    .query(async () => {
      // Implementation
    }),
  
  clearAllData: publicProcedure
    .input(z.object({
      confirmation: z.literal('CONFIRM_CLEAR_ALL_DATA'),
    }))
    .mutation(async ({ input }) => {
      // Implementation
    }),
});
```

#### 2.2 Create Root Router
```typescript
// src/server/routers/_app.ts
import { router } from '../trpc';
import { llmRouter } from './llm';
import { templateRouter } from './template';
import { documentRouter } from './document';
import { aiRolesRouter } from './ai-roles';
import { kvCacheRouter } from './kv-cache';
import { configRouter } from './config';
import { foldersRouter } from './folders';
import { adminRouter } from './admin';

export const appRouter = router({
  llm: llmRouter,
  template: templateRouter,
  document: documentRouter,
  aiRoles: aiRolesRouter,
  kvCache: kvCacheRouter,
  config: configRouter,
  folders: foldersRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
```

### 3. Frontend Refactoring

#### 3.1 Setup tRPC Client
```typescript
// src/utils/trpc.ts
import { createTRPCReact } from '@trpc/react-query';
import { type AppRouter } from '@/server/routers/_app';

export const trpc = createTRPCReact<AppRouter>();
```

#### 3.2 Update Store Management

1. **LLM Store**
```typescript
// src/lib/store.ts
import { trpc } from '@/utils/trpc';

export const useLLMStore = create<LLMStore>((set) => ({
  // ... existing state
  generateText: async (params) => {
    const result = await trpc.llm.generateText.mutate(params);
    return result;
  },
}));
```

2. **Document Store**
```typescript
// src/lib/store.ts
export const useDocumentStore = create<DocumentStore>((set) => ({
  // ... existing state
  updateDocument: async (id, content) => {
    const result = await trpc.document.updateDocument.mutate({ id, content });
    return result;
  },
}));
```

#### 3.3 Update Components

1. **LLM Dialog**
```typescript
// src/components/llm-dialog.tsx
export function LLMDialog({ isOpen, onClose, selectedText, position, editor, selection }: LLMDialogProps) {
  const utils = trpc.useUtils();
  const generateText = trpc.llm.generateText.useMutation({
    onSuccess: (data) => {
      // Handle success
    },
  });
  
  // ... rest of component
}
```

2. **Template Tester**
```typescript
// src/components/template-tester.tsx
export function TemplateTester() {
  const { data: templates } = trpc.template.getTemplates.useQuery();
  const processTemplate = trpc.template.processTemplate.useMutation();
  
  // ... rest of component
}
```

### 4. API Routes Migration

1. **Remove Existing API Routes**
- Delete `/api/llm/route.ts`
- Delete `/api/templates/route.ts`
- Delete `/api/documents/route.ts`
- Delete `/api/ai-roles/route.ts`
- Delete `/api/chat/route.ts`
- Delete `/api/config/route.ts`
- Delete `/api/admin/route.ts`
- Delete `/api/folders/route.ts`
- Delete `/api/backlinks/route.ts`
- Delete `/api/patterns/route.ts`
- Delete `/api/pattern-folders/route.ts`
- Delete `/api/vault/route.ts`
- Delete `/api/filter/route.ts`

2. **Create tRPC API Handler**
```typescript
// src/app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/routers/_app';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => ({}),
  });

export { handler as GET, handler as POST };
```

### 5. Testing and Validation

1. **Type Safety**
- Ensure all API endpoints are properly typed
- Validate input/output schemas
- Test error handling

2. **Performance Testing**
- Measure API response times
- Test concurrent requests
- Validate caching behavior

3. **Integration Testing**
- Test end-to-end workflows
- Validate error scenarios
- Test offline behavior

### 6. Deployment Considerations

1. **Environment Setup**
- Update environment variables
- Configure production endpoints
- Set up monitoring

2. **Build Process**
- Update build configuration
- Optimize bundle size
- Configure caching

## Implementation Phases

### Phase 1: Setup and Basic Integration
1. Install dependencies
2. Set up tRPC server
3. Create basic routers
4. Update client configuration

### Phase 2: Core Functionality Migration
1. Migrate LLM service
2. Migrate template service
3. Migrate document service
4. Update store management

### Phase 3: Component Updates
1. Update LLM Dialog
2. Update Template Tester
3. Update Document Editor
4. Test component integration

### Phase 4: Testing and Optimization
1. Implement comprehensive testing
2. Optimize performance
3. Add error handling
4. Document changes

## Rollback Plan

1. **Version Control**
- Maintain separate branches for refactoring
- Keep detailed commit history
- Document all changes

2. **Backup Strategy**
- Backup current API routes
- Document current functionality
- Maintain test coverage

3. **Rollback Procedure**
- Revert to previous version
- Restore API routes
- Validate functionality

## Success Criteria

1. **Functionality**
- All current features work as expected
- No regression in existing functionality
- Improved type safety

2. **Performance**
- Equal or better response times
- Reduced bundle size
- Improved caching

3. **Developer Experience**
- Better type safety
- Improved error handling
- Easier debugging

## Timeline

1. **Week 1**: Setup and Basic Integration
2. **Week 2**: Core Functionality Migration
3. **Week 3**: Component Updates
4. **Week 4**: Testing and Optimization

## Next Steps

1. Review and approve refactoring plan
2. Set up development environment
3. Begin Phase 1 implementation
4. Schedule regular progress reviews 

## Missing Services and Additional Considerations

### 1. Streaming Response Handling
The current plan needs to account for streaming responses from LLM services. tRPC provides streaming capabilities that should be leveraged:

```typescript
// src/server/routers/llm.ts
export const llmRouter = router({
  // ... existing routes
  
  generateTextStream: publicProcedure
    .input(z.object({
      prompt: z.string(),
      aiRole: z.string().optional(),
    }))
    .subscription(async ({ input }) => {
      // Return an observable that emits chunks of the response
      return observable<string>((emit) => {
        // Implementation of streaming
        // Each emit.next() will send a chunk to the client
        
        // Function to clean up when subscription is cancelled
        return () => {
          // Cleanup logic
        };
      });
    }),
});
```

### 2. Context Creation and Middleware
The plan should include context creation for authentication and request tracking:

```typescript
// src/server/context.ts
import { inferAsyncReturnType } from '@trpc/server';
import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';

export async function createContext({ req }: FetchCreateContextFnOptions) {
  // Get session from cookie
  const sessionId = req.cookies.get('session-id')?.value;
  
  return {
    sessionId,
    isAdmin: false, // Implement admin check logic
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
```

### 3. JSX VM Integration
The application appears to have a JSX VM component that should be included in the refactoring:

```typescript
// src/server/routers/jsx-vm.ts
export const jsxVmRouter = router({
  executeTemplate: publicProcedure
    .input(z.object({
      template: z.string(),
      variables: z.record(z.any()),
    }))
    .mutation(async ({ input }) => {
      // Implementation
    }),
});
```

### 4. Error Handling Strategy
Implement consistent error handling across all routers:

```typescript
// src/server/utils/error-handling.ts
export class TRPCCustomError extends Error {
  constructor(
    message: string,
    public code: 'BAD_REQUEST' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'INTERNAL_SERVER_ERROR',
    public cause?: unknown
  ) {
    super(message);
    this.name = 'TRPCCustomError';
  }
}
```

## TODO List for tRPC Implementation

### Phase 1: Initial Setup
- [ ] Install required dependencies: `@trpc/server`, `@trpc/client`, `@trpc/react-query`, `@tanstack/react-query`, `zod`
- [ ] Set up tRPC server infrastructure
  - [ ] Create `src/server/trpc.ts` with base setup
  - [ ] Create context provider in `src/server/context.ts`
  - [ ] Set up error handling utilities

### Phase 2: API Router Creation
- [ ] Create core routers:
  - [ ] LLM Router (`src/server/routers/llm.ts`)
  - [ ] Templates Router (`src/server/routers/template.ts`)
  - [ ] Documents Router (`src/server/routers/document.ts`)
  - [ ] AI Roles Router (`src/server/routers/ai-roles.ts`)
  - [ ] Config Router (`src/server/routers/config.ts`) 
  - [ ] KV Cache Router (`src/server/routers/kv-cache.ts`)
  - [ ] Folders Router (`src/server/routers/folders.ts`)
  - [ ] Admin Router (`src/server/routers/admin.ts`)
  - [ ] Backlinks Router (`src/server/routers/backlinks.ts`)
  - [ ] Patterns Router (`src/server/routers/patterns.ts`)
- [ ] Create and export root router (`src/server/routers/_app.ts`)
- [ ] Implement subscription handlers for streaming responses

### Phase 3: Client Integration
- [ ] Set up tRPC client in `src/utils/trpc.ts`
- [ ] Create Provider wrapper for the application
- [ ] Update Next.js Provider in `src/app/providers.tsx`

### Phase 4: Store Migration
- [ ] Update all stores to use tRPC client:
  - [ ] LLM Store
  - [ ] Document Store
  - [ ] Template Store
  - [ ] Config Store
  - [ ] Folders Store
- [ ] Refactor store methods to handle optimistic updates

### Phase 5: Component Updates
- [ ] Update UI components to use tRPC hooks:
  - [ ] LLM Dialog
  - [ ] Template Tester
  - [ ] Document Editor
  - [ ] AI Role Switcher
  - [ ] Settings Panel
  - [ ] Folder Browser
  - [ ] Admin Panel

### Phase 6: API Route Migration
- [ ] Create tRPC handler at `src/app/api/trpc/[trpc]/route.ts`
- [ ] Remove all existing API routes after confirming functionality
- [ ] Update environment configuration for production deployment

### Phase 7: Testing
- [ ] Create automated tests for all routers
- [ ] Test streaming functionality
- [ ] Test error handling
- [ ] Performance testing for core workflows
- [ ] Cross-browser testing

### Phase 8: Documentation and Cleanup
- [ ] Update project documentation
- [ ] Create type definitions for common types
- [ ] Remove unused code and dependencies
- [ ] Optimize bundle size

## Risk Assessment

1. **Streaming Performance**
   - Risk: Streaming implementations might not perform as well as the current solution
   - Mitigation: Benchmark and optimize streaming performance, consider fallback options

2. **Migration Complexity**
   - Risk: Large-scale refactoring might introduce bugs or regressions
   - Mitigation: Implement in phases, maintain comprehensive tests, provide fallback mechanisms

3. **Browser Compatibility**
   - Risk: Some features might not work in all browsers
   - Mitigation: Test across browsers, implement polyfills where necessary 