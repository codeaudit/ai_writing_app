import { router } from '../trpc';
import { llmRouter } from './llm';
import { templateRouter } from './template';
import { documentRouter } from './document';
import { aiRolesRouter } from './ai-roles';
import { kvCacheRouter } from './kv-cache';
import { jsxVmRouter } from './jsx-vm';
import { foldersRouter } from './folders';
import { adminRouter } from './admin';
import { backlinksRouter } from './backlinks';
import { patternsRouter } from './patterns';
import { configRouter } from './config';

export const appRouter = router({
  llm: llmRouter,
  template: templateRouter,
  document: documentRouter,
  aiRoles: aiRolesRouter,
  kvCache: kvCacheRouter,
  jsxVm: jsxVmRouter,
  folders: foldersRouter,
  admin: adminRouter,
  backlinks: backlinksRouter,
  patterns: patternsRouter,
  config: configRouter,
});

export type AppRouter = typeof appRouter; 