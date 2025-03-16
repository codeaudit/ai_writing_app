import * as FuseModule from 'fuse.js';
const Fuse = FuseModule.default || FuseModule;

/**
 * Creates a Fuse.js instance for fuzzy searching
 * @param items Array of items to search through
 * @param keys Array of keys to search on
 * @param options Additional Fuse.js options
 * @returns Fuse instance
 */
export function createFuseInstance<T>(
  items: T[],
  keys: string[],
  options: Partial<FuseModule.IFuseOptions<T>> = {}
) {
  const defaultOptions = {
    keys,
    threshold: 0.4,
    distance: 100,
    includeScore: true,
    includeMatches: true,
    ...options
  };
  
  return new Fuse(items, defaultOptions);
}

/**
 * Performs a fuzzy search on an array of items
 * @param items Array of items to search through
 * @param query Search query
 * @param keys Array of keys to search on
 * @param options Additional Fuse.js options
 * @returns Array of search results
 */
export function fuzzySearch<T>(
  items: T[],
  query: string,
  keys: string[],
  options: Partial<FuseModule.IFuseOptions<T>> = {}
): T[] {
  if (!query.trim()) {
    return items;
  }
  
  const fuse = createFuseInstance<T>(items, keys, options);
  const results = fuse.search(query);
  
  // Return the original items in the order of their search relevance
  return results.map((result: FuseModule.FuseResult<T>) => result.item);
} 