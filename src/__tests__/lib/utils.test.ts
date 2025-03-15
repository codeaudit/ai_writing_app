import { checkAndFixVaultIntegrity } from '../../lib/vault-integrity';
import * as fsService from '../../lib/fs-service';
import fs from 'fs';
import path from 'path';

// Mock the fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  readdirSync: jest.fn(),
  statSync: jest.fn(),
}));

// Mock the fs-service module
jest.mock('../../lib/fs-service', () => ({
  loadDocuments: jest.fn(),
  loadFolders: jest.fn(),
  saveDocument: jest.fn(),
  saveFolder: jest.fn(),
}));

// Mock the internal functions that are used by vault-integrity but not exported
jest.mock('../../lib/vault-integrity', () => {
  const originalModule = jest.requireActual('../../lib/vault-integrity');
  return {
    ...originalModule,
    // Add mocked internal functions here if needed
  };
});

describe('Utility Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Vault Integrity Check', () => {
    it('should run integrity check successfully with empty vault', async () => {
      // Mock the loadDocuments function to return an empty array
      (fsService.loadDocuments as jest.Mock).mockReturnValue([]);
      (fsService.loadFolders as jest.Mock).mockReturnValue([]);
      
      // Mock fs.existsSync to return true for directory checks
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      
      // Run the integrity check
      const result = await checkAndFixVaultIntegrity();
      
      // Verify that the function ran successfully
      expect(result).toBeDefined();
      expect(result.documentsChecked).toBe(0);
      expect(result.foldersChecked).toBe(0);
      expect(result.compositionsChecked).toBe(0);
    });
  });
});
