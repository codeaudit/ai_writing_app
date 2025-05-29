"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDocumentStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/components/ui/use-toast';
import { Document, Folder } from '@/lib/store';

// Define command registry
const commandRegistry = {
  help: {
    description: 'Display available commands',
    usage: 'help [command]',
    execute: async (args: string[], terminal: Terminal) => {
      if (args.length === 0) {
        terminal.println('Available commands:');
        Object.entries(commandRegistry).forEach(([name, cmd]) => {
          terminal.println(`  ${name.padEnd(12)} - ${cmd.description}`);
        });
        terminal.println('\nType "help <command>" for more information on a specific command.');
      } else {
        const cmdName = args[0];
        const cmd = commandRegistry[cmdName as keyof typeof commandRegistry];
        if (cmd) {
          terminal.println(`Command: ${cmdName}`);
          terminal.println(`Description: ${cmd.description}`);
          terminal.println(`Usage: ${cmd.usage}`);
        } else {
          terminal.println(`Unknown command: ${cmdName}`);
        }
      }
      return true;
    }
  },
  
  clear: {
    description: 'Clear the terminal screen',
    usage: 'clear',
    execute: async (args: string[], terminal: Terminal) => {
      terminal.clear();
      return true;
    }
  },
  
  ls: {
    description: 'List documents and folders',
    usage: 'ls [folder_id]',
    execute: async (args: string[], terminal: Terminal) => {
      const { documents, folders } = terminal.store;
      const folderId = args.length > 0 ? args[0] : null;
      
      // Filter documents and folders by the specified folder ID
      const filteredDocs = documents.filter((doc: Document) => doc.folderId === folderId);
      const filteredFolders = folders.filter((folder: Folder) => folder.parentId === folderId);
      
      if (folderId) {
        const folder = folders.find((f: Folder) => f.id === folderId);
        if (!folder) {
          terminal.println(`Folder not found: ${folderId}`);
          return true;
        }
        terminal.println(`Contents of folder: ${folder.name} (${folderId})`);
      } else {
        terminal.println('Contents of root:');
      }
      
      terminal.println('\nFolders:');
      if (filteredFolders.length === 0) {
        terminal.println('  No folders found');
      } else {
        filteredFolders.forEach((folder: Folder) => {
          terminal.println(`  📁 ${folder.name.padEnd(30)} [${folder.id}]`);
        });
      }
      
      terminal.println('\nDocuments:');
      if (filteredDocs.length === 0) {
        terminal.println('  No documents found');
      } else {
        filteredDocs.forEach((doc: Document) => {
          terminal.println(`  📄 ${doc.name.padEnd(30)} [${doc.id}]`);
        });
      }
      
      return true;
    }
  },
  
  cd: {
    description: 'Change to a folder',
    usage: 'cd <folder_id>',
    execute: async (args: string[], terminal: Terminal) => {
      if (args.length === 0) {
        terminal.println('Usage: cd <folder_id>');
        return true;
      }
      
      const folderId = args[0];
      const { folders, selectFolder } = terminal.store;
      
      if (folderId === '..') {
        // Go to parent folder
        const currentFolder = folders.find((f: Folder) => f.id === terminal.currentFolderId);
        if (currentFolder && currentFolder.parentId) {
          terminal.currentFolderId = currentFolder.parentId;
          selectFolder(currentFolder.parentId);
          terminal.println(`Changed to parent folder`);
        } else {
          terminal.currentFolderId = null;
          selectFolder(null);
          terminal.println('Changed to root folder');
        }
        return true;
      }
      
      if (folderId === '/') {
        // Go to root
        terminal.currentFolderId = null;
        selectFolder(null);
        terminal.println('Changed to root folder');
        return true;
      }
      
      const folder = folders.find((f: Folder) => f.id === folderId);
      if (!folder) {
        terminal.println(`Folder not found: ${folderId}`);
        return true;
      }
      
      terminal.currentFolderId = folderId;
      selectFolder(folderId);
      terminal.println(`Changed to folder: ${folder.name}`);
      return true;
    }
  },
  
  pwd: {
    description: 'Print current folder path',
    usage: 'pwd',
    execute: async (args: string[], terminal: Terminal) => {
      const { folders } = terminal.store;
      
      if (!terminal.currentFolderId) {
        terminal.println('/');
        return true;
      }
      
      // Build path by traversing up the folder hierarchy
      const buildPath = (folderId: string | null): string => {
        if (!folderId) return '/';
        
        const folder = folders.find((f: Folder) => f.id === folderId);
        if (!folder) return '/';
        
        const parentPath = buildPath(folder.parentId);
        return `${parentPath === '/' ? '' : parentPath}/${folder.name}`;
      };
      
      terminal.println(buildPath(terminal.currentFolderId));
      return true;
    }
  },
  
  cat: {
    description: 'Display document content',
    usage: 'cat <document_id>',
    execute: async (args: string[], terminal: Terminal) => {
      if (args.length === 0) {
        terminal.println('Usage: cat <document_id>');
        return true;
      }
      
      const docId = args[0];
      const { documents } = terminal.store;
      const doc = documents.find((d: Document) => d.id === docId);
      
      if (!doc) {
        terminal.println(`Document not found: ${docId}`);
        return true;
      }
      
      terminal.println(`# ${doc.name}\n`);
      terminal.println(doc.content);
      return true;
    }
  },
  
  mkdir: {
    description: 'Create a new folder',
    usage: 'mkdir <folder_name>',
    execute: async (args: string[], terminal: Terminal) => {
      if (args.length === 0) {
        terminal.println('Usage: mkdir <folder_name>');
        return true;
      }
      
      const folderName = args.join(' ');
      const { addFolder } = terminal.store;
      
      try {
        await addFolder(folderName, terminal.currentFolderId);
        terminal.println(`Folder created: ${folderName}`);
      } catch (error) {
        terminal.println(`Error creating folder: ${error}`);
      }
      
      return true;
    }
  },
  
  touch: {
    description: 'Create a new empty document',
    usage: 'touch <document_name>',
    execute: async (args: string[], terminal: Terminal) => {
      if (args.length === 0) {
        terminal.println('Usage: touch <document_name>');
        return true;
      }
      
      const docName = args.join(' ');
      const { addDocument } = terminal.store;
      
      try {
        const docId = await addDocument(docName, '', terminal.currentFolderId);
        terminal.println(`Document created: ${docName} [${docId}]`);
      } catch (error) {
        terminal.println(`Error creating document: ${error}`);
      }
      
      return true;
    }
  },
  
  rm: {
    description: 'Remove a document or folder',
    usage: 'rm <id> [--force]',
    execute: async (args: string[], terminal: Terminal) => {
      if (args.length === 0) {
        terminal.println('Usage: rm <id> [--force]');
        return true;
      }
      
      const id = args[0];
      const force = args.includes('--force');
      const { documents, folders, deleteDocument, deleteFolder } = terminal.store;
      
      const doc = documents.find((d: Document) => d.id === id);
      const folder = folders.find((f: Folder) => f.id === id);
      
      if (doc) {
        if (!force) {
          terminal.println(`Are you sure you want to delete document "${doc.name}"? (y/n)`);
          terminal.setConfirmCallback(async (answer) => {
            if (answer.toLowerCase() === 'y') {
              try {
                await deleteDocument(id);
                terminal.println(`Document deleted: ${doc.name}`);
              } catch (error) {
                terminal.println(`Error deleting document: ${error}`);
              }
            } else {
              terminal.println('Operation cancelled');
            }
          });
          return false; // Don't show prompt yet
        } else {
          try {
            await deleteDocument(id);
            terminal.println(`Document deleted: ${doc.name}`);
          } catch (error) {
            terminal.println(`Error deleting document: ${error}`);
          }
        }
      } else if (folder) {
        if (!force) {
          terminal.println(`Are you sure you want to delete folder "${folder.name}" and all its contents? (y/n)`);
          terminal.setConfirmCallback(async (answer) => {
            if (answer.toLowerCase() === 'y') {
              try {
                await deleteFolder(id);
                terminal.println(`Folder deleted: ${folder.name}`);
              } catch (error) {
                terminal.println(`Error deleting folder: ${error}`);
              }
            } else {
              terminal.println('Operation cancelled');
            }
          });
          return false; // Don't show prompt yet
        } else {
          try {
            await deleteFolder(id);
            terminal.println(`Folder deleted: ${folder.name}`);
          } catch (error) {
            terminal.println(`Error deleting folder: ${error}`);
          }
        }
      } else {
        terminal.println(`Item not found: ${id}`);
      }
      
      return true;
    }
  },
  
  mv: {
    description: 'Move a document or folder',
    usage: 'mv <id> <target_folder_id>',
    execute: async (args: string[], terminal: Terminal) => {
      if (args.length < 2) {
        terminal.println('Usage: mv <id> <target_folder_id>');
        return true;
      }
      
      const id = args[0];
      const targetFolderId = args[1] === 'root' ? null : args[1];
      const { documents, folders, moveDocument, moveFolder } = terminal.store;
      
      const doc = documents.find((d: Document) => d.id === id);
      const folder = folders.find((f: Folder) => f.id === id);
      
      if (doc) {
        try {
          await moveDocument(id, targetFolderId);
          terminal.println(`Document moved: ${doc.name}`);
        } catch (error) {
          terminal.println(`Error moving document: ${error}`);
        }
      } else if (folder) {
        try {
          await moveFolder(id, targetFolderId);
          terminal.println(`Folder moved: ${folder.name}`);
        } catch (error) {
          terminal.println(`Error moving folder: ${error}`);
        }
      } else {
        terminal.println(`Item not found: ${id}`);
      }
      
      return true;
    }
  },
  
  rename: {
    description: 'Rename a document or folder',
    usage: 'rename <id> <new_name>',
    execute: async (args: string[], terminal: Terminal) => {
      if (args.length < 2) {
        terminal.println('Usage: rename <id> <new_name>');
        return true;
      }
      
      const id = args[0];
      const newName = args.slice(1).join(' ');
      const { documents, folders, renameDocument, renameFolder } = terminal.store;
      
      const doc = documents.find((d: Document) => d.id === id);
      const folder = folders.find((f: Folder) => f.id === id);
      
      if (doc) {
        try {
          await renameDocument(id, newName);
          terminal.println(`Document renamed to: ${newName}`);
        } catch (error) {
          terminal.println(`Error renaming document: ${error}`);
        }
      } else if (folder) {
        try {
          await renameFolder(id, newName);
          terminal.println(`Folder renamed to: ${newName}`);
        } catch (error) {
          terminal.println(`Error renaming folder: ${error}`);
        }
      } else {
        terminal.println(`Item not found: ${id}`);
      }
      
      return true;
    }
  },
  
  templates: {
    description: 'List available templates',
    usage: 'templates',
    execute: async (args: string[], terminal: Terminal) => {
      terminal.println('Fetching templates...');
      
      try {
        const response = await fetch('/api/templates');
        if (!response.ok) {
          throw new Error(`Failed to fetch templates: ${response.statusText}`);
        }
        
        const templates = await response.json();
        
        terminal.println('\nAvailable templates:');
        templates.forEach((template: { name: string; path: string }) => {
          terminal.println(`  📝 ${template.name}`);
        });
      } catch (error) {
        terminal.println(`Error fetching templates: ${error}`);
      }
      
      return true;
    }
  },
  
  create: {
    description: 'Create a document from a template',
    usage: 'create <template_name> <document_name>',
    execute: async (args: string[], terminal: Terminal) => {
      if (args.length < 2) {
        terminal.println('Usage: create <template_name> <document_name>');
        return true;
      }
      
      const templateName = args[0];
      const documentName = args.slice(1).join(' ');
      const { addDocument } = terminal.store;
      
      terminal.println(`Creating document "${documentName}" from template "${templateName}"...`);
      
      try {
        // Fetch template content
        const contentResponse = await fetch(`/api/templates/content?name=${encodeURIComponent(templateName)}`);
        if (!contentResponse.ok) {
          throw new Error(`Failed to fetch template content: ${contentResponse.statusText}`);
        }
        
        const { content } = await contentResponse.json();
        
        // Process template with basic variables
        const processResponse = await fetch(`/api/templates?name=${encodeURIComponent(templateName)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: documentName,
            date: new Date().toISOString(),
            time: new Date().toLocaleTimeString(),
          }),
        });
        
        if (!processResponse.ok) {
          throw new Error(`Failed to process template: ${processResponse.statusText}`);
        }
        
        const { content: processedContent } = await processResponse.json();
        
        // Create document
        const docId = await addDocument(documentName, processedContent, terminal.currentFolderId);
        terminal.println(`Document created: ${documentName} [${docId}]`);
      } catch (error) {
        terminal.println(`Error creating document from template: ${error}`);
      }
      
      return true;
    }
  },
  
  open: {
    description: 'Open a document in the editor',
    usage: 'open <document_id>',
    execute: async (args: string[], terminal: Terminal) => {
      if (args.length === 0) {
        terminal.println('Usage: open <document_id>');
        return true;
      }
      
      const docId = args[0];
      const { documents, selectDocument } = terminal.store;
      const doc = documents.find((d: Document) => d.id === docId);
      
      if (!doc) {
        terminal.println(`Document not found: ${docId}`);
        return true;
      }
      
      selectDocument(docId);
      terminal.router.push(`/documents/${docId}`);
      terminal.println(`Opening document: ${doc.name}`);
      return true;
    }
  },
  
  exit: {
    description: 'Exit the terminal',
    usage: 'exit',
    execute: async (args: string[], terminal: Terminal) => {
      terminal.onClose();
      return true;
    }
  }
};

// Terminal class
class Terminal {
  history: string[] = [];
  output: string[] = [];
  currentInput: string = '';
  currentFolderId: string | null = null;
  confirmCallback: ((answer: string) => void) | null = null;
  store: any;
  router: any;
  onClose: () => void;
  
  constructor(store: any, router: any, onClose: () => void) {
    this.store = store;
    this.router = router;
    this.onClose = onClose;
    
    // Initialize with welcome message
    this.output = [
      '📝 Writing App Terminal v1.0',
      '----------------------------------------',
      'Welcome to the Writing App Terminal!',
      'Type "help" to see available commands.',
      ''
    ];
  }
  
  println(text: string) {
    this.output.push(text);
  }
  
  clear() {
    this.output = [
      '📝 Writing App Terminal v1.0',
      '----------------------------------------',
      'Type "help" to see available commands.',
      ''
    ];
  }
  
  setConfirmCallback(callback: (answer: string) => void) {
    this.confirmCallback = callback;
  }
  
  async processCommand(input: string): Promise<void> {
    if (this.confirmCallback) {
      const callback = this.confirmCallback;
      this.confirmCallback = null;
      await callback(input);
      return;
    }
    
    this.history.push(input);
    this.output.push(`$ ${input}`);
    
    if (!input.trim()) {
      return;
    }
    
    const parts = input.trim().split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    const cmd = commandRegistry[command as keyof typeof commandRegistry];
    
    if (cmd) {
      const showPrompt = await cmd.execute(args, this);
      if (!showPrompt) {
        return; // Don't show prompt yet (waiting for confirmation)
      }
    } else {
      this.output.push(`Command not found: ${command}`);
      this.output.push('Type "help" to see available commands.');
    }
  }
}

interface TerminalViewProps {
  onClose: () => void;
}

export function TerminalView({ onClose }: TerminalViewProps) {
  const [input, setInput] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [terminalInstance, setTerminalInstance] = useState<Terminal | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const store = useDocumentStore();
  const router = useRouter();
  
  // Initialize terminal instance
  useEffect(() => {
    setTerminalInstance(new Terminal(store, router, onClose));
  }, [store, router, onClose]);
  
  // Auto-scroll to bottom when output changes
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [terminalInstance?.output]);
  
  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  
  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!terminalInstance) return;
    
    if (e.key === 'Enter') {
      e.preventDefault();
      const currentInput = input;
      setInput('');
      setHistoryIndex(-1);
      await terminalInstance.processCommand(currentInput);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (terminalInstance.history.length > 0) {
        const newIndex = historyIndex < terminalInstance.history.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setInput(terminalInstance.history[terminalInstance.history.length - 1 - newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(terminalInstance.history[terminalInstance.history.length - 1 - newIndex] || '');
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Simple tab completion for commands
      if (input.indexOf(' ') === -1) {
        const matches = Object.keys(commandRegistry).filter(cmd => cmd.startsWith(input));
        if (matches.length === 1) {
          setInput(matches[0] + ' ');
        } else if (matches.length > 1) {
          terminalInstance.println(`\nPossible commands:`);
          matches.forEach(match => {
            terminalInstance.println(`  ${match}`);
          });
        }
      }
    }
  };
  
  if (!terminalInstance) {
    return <div>Loading terminal...</div>;
  }
  
  return (
    <Card className="w-full h-full flex flex-col border-none shadow-none">
      <CardContent className="flex flex-col h-full p-0">
        <div className="flex-1 flex flex-col h-full">
          <ScrollArea className="flex-1 p-4 font-mono text-sm bg-black text-green-500" ref={scrollAreaRef}>
            <div className="whitespace-pre-wrap">
              {terminalInstance.output.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
              {!terminalInstance.confirmCallback && (
                <div className="flex items-center">
                  <span>$ </span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-transparent border-none outline-none text-green-500 font-mono"
                    autoFocus
                  />
                </div>
              )}
              {terminalInstance.confirmCallback && (
                <div className="flex items-center">
                  <span>&gt; </span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-transparent border-none outline-none text-yellow-500 font-mono"
                    autoFocus
                  />
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
} 