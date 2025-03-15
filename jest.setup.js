// Mock the Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    pathname: '/',
    query: {},
  }),
  usePathname: jest.fn().mockReturnValue('/'),
  useSearchParams: jest.fn().mockReturnValue(new URLSearchParams()),
}));

// Mock the process.cwd() function to return a fixed path for tests
global.process.cwd = jest.fn().mockReturnValue('/mock-cwd');

// Suppress console errors during tests
global.console.error = jest.fn();
global.console.warn = jest.fn();
