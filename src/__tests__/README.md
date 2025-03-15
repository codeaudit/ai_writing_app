# Writing App Test Suite

This directory contains the test suite for the Writing App, focusing on validating core functionality related to vault integrity, file system operations, and utility functions.

## Test Structure

The tests are organized by module:

```
__tests__/
└── lib/
    ├── fs-service.test.ts    # Tests for file system operations
    ├── utils.test.ts         # Tests for utility functions
    └── vault-integrity.test.ts # Tests for vault integrity checks
```

## Test Modules

### fs-service.test.ts

Tests the file system service that handles reading from and writing to the file system:

- **parseInternalLinks**: Tests for correctly parsing wiki-style links (`[[link]]` and `[[link|alias]]`)
- **Document Loading**: Tests for loading documents from the file system and parsing their metadata
- **Document Saving**: Tests for saving documents to the file system with proper formatting

### utils.test.ts

Tests utility functions used throughout the application:

- **Vault Integrity Check**: Basic test to ensure the integrity check runs without errors on an empty vault

### vault-integrity.test.ts

Comprehensive tests for the vault integrity checking and fixing functionality:

- **Basic Integrity Checks**: Validates the structure and counts returned by the integrity checker
- **Frontmatter Validation**: Tests for detecting and fixing missing or invalid frontmatter
- **Metadata Validation**: Tests for duplicate IDs, missing metadata, orphaned documents/folders
- **Reference Integrity**: Tests for broken references between documents and compositions

## Testing Approach

The tests use Jest's mocking capabilities to simulate file system operations without actually reading from or writing to the disk:

1. **Module Mocking**: Core modules like `fs`, `path`, and application modules are mocked
2. **Function Mocking**: Individual functions are mocked to return predefined values
3. **Mock Implementation**: Custom implementations simulate specific scenarios
4. **Assertion Patterns**: Various Jest matchers verify behavior

## Running Tests

Run all tests:
```
npm test
```

Run a specific test file:
```
npm test -- --testPathPattern=fs-service.test.ts
```

Run tests with coverage report:
```
npm test -- --coverage
```

## Adding New Tests

When adding new tests:

1. Follow the existing pattern of mocking external dependencies
2. Create test files that match the pattern `*.test.ts` in the appropriate directory
3. Use descriptive test names that explain what is being tested
4. Mock only what is necessary to isolate the functionality being tested
5. Clean up mocks in `beforeEach` and `afterEach` hooks

## Common Mocking Patterns

```typescript
// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  // Add other methods as needed
}));

// Mock path module
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  dirname: jest.fn((p) => p.split('/').slice(0, -1).join('/')),
  // Add other methods as needed
}));

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});
```

## Best Practices

1. **Isolation**: Test functions in isolation to identify issues precisely
2. **Readability**: Write clear, descriptive test cases
3. **Maintenance**: Keep tests DRY (Don't Repeat Yourself) with helper functions
4. **Coverage**: Aim for comprehensive coverage of edge cases
5. **Performance**: Keep tests fast by minimizing unnecessary operations

## Troubleshooting Common Issues

### Mock Function Not Called

If you're expecting a mock function to be called but the test fails:

1. Check that the mock is properly set up in the test file
2. Verify that the function is actually called in the code path being tested
3. Make sure you're not resetting mocks before checking expectations

### TypeScript Errors in Tests

When encountering TypeScript errors:

1. Ensure you're properly typing mock functions: `(fs.readFileSync as jest.Mock).mockReturnValue(...)`
2. Use proper type assertions when needed: `expect.any(Date) as any`
3. Make sure you're only testing exported functions unless you've set up module internals for testing

### Nunjucks Errors

When testing code that uses Nunjucks:

1. Make sure to mock the Nunjucks module completely
2. Include all necessary methods like `addFilter`, `addGlobal`, etc.
3. Provide mock implementations that return expected values
