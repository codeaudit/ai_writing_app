# Writing App Development Guide

## Commands
- **Dev**: `npm run dev` (Next.js) or `npm run electron-dev` (Electron + Next.js)
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Tests**: 
  - All tests: `npm test`
  - Single test: `npx jest path/to/test.test.ts`
  - Watch mode: `npm run test:watch`
  - Coverage: `npm run test:coverage`

## Code Style
- **Imports**: Use path aliases (`@/components/`, `@/lib/`)
- **Components**: PascalCase, client directive when needed
- **Files**: kebab-case (e.g., `document-navigation.tsx`)
- **Functions/Variables**: camelCase
- **Types**: Explicit types for props, state, functions
- **State**: Zustand for global, Context for local sharing
- **Error Handling**: Try/catch + toast notifications
- **Tests**: Jest + React Testing Library with describe/it blocks

Always run linting and tests before committing changes.