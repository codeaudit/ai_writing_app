/**
 * TypeScript declarations for Electron API
 */

interface FileData {
  path: string;
  name: string;
  content: string;
}

interface FolderData {
  path: string;
  files: FileData[];
}

interface SaveFileData {
  content: string;
  defaultPath?: string;
  name?: string;
}

interface ExportDocumentData {
  content: string;
  format: 'pdf' | 'html';
  name?: string;
}

interface ElectronVersions {
  electron: string;
  chrome: string;
  node: string;
}

interface ElectronAPI {
  // File operations
  openFile: () => Promise<FileData | null>;
  openFolder: () => Promise<FolderData | null>;
  saveFile: (data: SaveFileData) => Promise<{ path: string; name: string } | null>;
  exportDocument: (data: ExportDocumentData) => Promise<{ path: string; name: string } | null>;
  
  // App version
  getVersion: () => ElectronVersions;
  
  // Event listeners
  onMenuAction: (channel: string, callback: (...args: unknown[]) => void) => (() => void) | null;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
} 