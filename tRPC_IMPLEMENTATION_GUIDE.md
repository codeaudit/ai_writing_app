# tRPC Implementation Guide

This guide explains the tRPC implementation in the writing application, including patterns, conventions, and best practices for working with the codebase.

## Overview

Our application has been refactored to use tRPC for type-safe API communication between the client and server. This provides several benefits:

- **Type Safety**: Full end-to-end type safety between client and server
- **Improved Developer Experience**: Better autocompletion, error checking at compile time
- **Simplified API Layer**: No need for manual API route handlers and validation
- **Reduced Boilerplate**: Less code to write and maintain

## Architecture

### Directory Structure

```
src/
├── server/
│   ├── trpc.ts                    # tRPC server setup
│   ├── context.ts                 # Request context creation
│   └── routers/                   # API routers
│       ├── _app.ts                # Root router
│       ├── llm.ts                 # LLM router
│       ├── template.ts            # Template router
│       ├── document.ts            # Document router
│       ├── config.ts              # Config router
│       ├── ai-roles.ts            # AI roles router
│       └── ...                    # Other routers
├── utils/
│   └── trpc.ts                    # tRPC client setup
├── lib/
│   ├── trpc-config-store.ts       # Config store with tRPC
│   ├── trpc-kv-cache-store.ts     # KV Cache store with tRPC
│   └── trpc-ai-roles-store.ts     # AI Roles store with tRPC
├── components/
│   ├── trpc-provider.tsx          # tRPC provider for app
│   └── ...                        # Other components
└── app/
    └── api/
        └── trpc/
            └── [trpc]/
                └── route.ts       # tRPC API handler
```

## Implementation Details

### Server-Side Setup

#### Server Entry Point (`src/server/trpc.ts`)

```typescript
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

#### Request Context (`src/server/context.ts`)

```typescript
import { inferAsyncReturnType } from '@trpc/server';
import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';

export function createContext({ req }: FetchCreateContextFnOptions) {
  const sessionId = req.headers.get('x-session-id');
  return { sessionId };
}

export type Context = inferAsyncReturnType<typeof createContext>;
```

### Router Implementation

We follow consistent patterns for router implementation:

#### Input Validation

All inputs are validated using Zod schemas:

```typescript
import { z } from 'zod';
import { router, publicProcedure } from '../trpc';

export const llmRouter = router({
  generateText: publicProcedure
    .input(z.object({
      prompt: z.string(),
      model: z.string(),
      maxTokens: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      // Implementation
    }),
});
```

#### Query vs. Mutation

- **Queries**: Used for read operations (getting data)
- **Mutations**: Used for write operations (creating, updating, deleting)

```typescript
// Example query
getTemplates: publicProcedure
  .query(async () => {
    // Implementation to fetch templates
  }),

// Example mutation
updateTemplate: publicProcedure
  .input(z.object({
    id: z.string(),
    content: z.string(),
  }))
  .mutation(async ({ input }) => {
    // Implementation to update template
  }),
```

#### Error Handling

Consistent error handling across all routers:

```typescript
try {
  // Implementation
  return result;
} catch (error) {
  console.error('Error in router:', error);
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
    cause: error,
  });
}
```

### Client-Side Setup

#### TRPC Client (`src/utils/trpc.ts`)

```typescript
import { createTRPCReact } from '@trpc/react-query';
import { type AppRouter } from '@/server/routers/_app';

export const trpc = createTRPCReact<AppRouter>();
```

#### Provider Setup (`src/app/providers.tsx`)

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { useState } from 'react';
import { trpc } from '@/utils/trpc';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() => 
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

## Store Integration

Our application uses Zustand stores integrated with tRPC. Each store follows a consistent pattern:

### Pattern for tRPC Stores

```typescript
import { create } from 'zustand';
import { trpc } from '@/utils/trpc';

export interface StoreState {
  // State properties
}

export interface StoreActions {
  // Action methods
}

export type Store = StoreState & StoreActions;

export const useTrpcStore = create<Store>((set, get) => ({
  // Initial state
  
  // Actions that use tRPC
  someAction: async (params) => {
    try {
      const utils = trpc.useUtils?.() || null;
      
      if (utils) {
        // Use tRPC hooks when in component context
        const result = await utils.client.someRouter.someAction.mutate(params);
        // Update state based on result
        set({ /* updated state */ });
        return result;
      } else {
        // Fallback for non-component contexts using fetch
        const response = await fetch('/api/trpc/someRouter.someAction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            json: params
          }),
        });
        const data = await response.json();
        // Update state based on result
        set({ /* updated state */ });
        return data.result.data;
      }
    } catch (error) {
      console.error('Error in store action:', error);
      // Handle error appropriately
      throw error;
    }
  },
}));
```

### Key Features

1. **Dual Implementation**: Each action supports both tRPC hooks (for component contexts) and direct fetch (for non-component contexts)
2. **Error Handling**: Consistent error handling
3. **State Updates**: Store state is updated based on operation results
4. **Optimistic Updates**: Where appropriate, state is updated optimistically before the server operation completes

## Component Integration

Components using tRPC follow these patterns:

### Direct tRPC Hooks

Components can use tRPC hooks directly:

```typescript
import { trpc } from '@/utils/trpc';

export function MyComponent() {
  const { data, isLoading } = trpc.someRouter.someQuery.useQuery();
  const mutation = trpc.someRouter.someAction.useMutation();
  
  const handleAction = async () => {
    await mutation.mutateAsync({ /* params */ });
  };
  
  return (
    // Component implementation
  );
}
```

### Store-Based Integration

Most components use tRPC indirectly through stores:

```typescript
import { useTrpcStore } from '@/lib/trpc-store';

export function MyComponent() {
  const { someState, someAction } = useTrpcStore();
  
  const handleAction = async () => {
    await someAction({ /* params */ });
  };
  
  return (
    // Component implementation
  );
}
```

## Best Practices

### 1. Use Zod for Input Validation

Always validate inputs on the server using Zod schemas:

```typescript
.input(z.object({
  required: z.string(),
  optional: z.number().optional(),
  withDefault: z.string().default('default value'),
}))
```

### 2. Consistent Error Handling

Always use structured error handling:

```typescript
try {
  // Implementation
} catch (error) {
  if (error instanceof SomeSpecificError) {
    // Handle specific error
  } else {
    // Handle generic error
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      cause: error,
    });
  }
}
```

### 3. Optimistic Updates

Use optimistic updates for better UX where appropriate:

```typescript
const handleUpdate = async () => {
  // Optimistically update local state
  set(state => ({
    items: state.items.map(item => 
      item.id === itemId ? { ...item, ...newData } : item
    )
  }));
  
  try {
    // Perform server update
    await trpc.items.update.mutate({ id: itemId, ...newData });
  } catch (error) {
    // Revert optimistic update on error
    set(state => ({ items: originalItems }));
    throw error;
  }
};
```

### 4. Component Naming Conventions

Use consistent prefixes for tRPC-integrated components:

- `Trpc` prefix for components using tRPC directly
- Example: `TrpcDocumentView`, `TrpcSettingsPanel`

### 5. Store Naming Conventions

Use consistent naming for tRPC stores:

- `useTrpc` prefix for store hooks
- Example: `useTrpcDocumentStore`, `useTrpcLLMStore`

## Common Troubleshooting

### "Property does not exist on type" Errors

If you encounter TypeScript errors about properties not existing on types:

1. Ensure your router is properly exported in the root router (`_app.ts`)
2. Check that the return types in your router match the expected types in the client
3. If using tRPC utils outside components, implement proper fallbacks

### React Query Errors

If you encounter React Query related errors:

1. Check that you're using hooks within React components
2. Ensure you have the proper Provider setup
3. Verify that your query/mutation keys are unique

### Network Errors

If you encounter network errors:

1. Check that your API endpoint is correctly configured (`/api/trpc/[trpc]/route.ts`)
2. Verify the correct URL is used in the client setup
3. Check for CORS issues if working in a development environment

## Migration Guide

When migrating existing components to use tRPC:

1. Create a new version of the component with the `Trpc` prefix
2. Implement the component using tRPC stores or hooks
3. Test the new component thoroughly
4. Replace the old component with the new one in the application
5. Update all imports to use the new component

This pattern allows for gradual migration without disrupting existing functionality.

## Testing

Testing tRPC implementations:

1. Use the integration test page for manual testing
2. Create unit tests for individual routers
3. Create integration tests for the combined client/server functionality
4. Test error scenarios by mocking failures

## Resources

- [tRPC Documentation](https://trpc.io/docs)
- [Zod Documentation](https://zod.dev)
- [React Query Documentation](https://tanstack.com/query/latest/docs/react/overview)
- [Zustand Documentation](https://github.com/pmndrs/zustand) 
 