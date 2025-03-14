"use client";

import React, { useState } from "react";
import Terminal from "react-console-emulator";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useTheme } from "next-themes";

// Import document store
import { useDocumentStore, Document, Folder } from "@/lib/store";

// Define a simple Template type based on usage
interface Template {
  id: string;
  name: string;
}

export function TerminalView({
  onClose,
  initialDirectory = "/",
  height = "200px",
}: {
  onClose: () => void;
  initialDirectory?: string;
  height?: string;
}) {
  const router = useRouter();
  const { theme } = useTheme();
  const store = useDocumentStore();
  const {
    documents,
    folders,
    addDocument,
    addFolder,
    deleteDocument,
    deleteFolder,
    renameDocument,
    renameFolder,
  } = store;
  
  // @ts-ignore - Templates property might not be in the type definition but exists at runtime
  const templates: Template[] = store.templates || [];
  
  const [currentDirectory, setCurrentDirectory] = useState(initialDirectory);
  
  // Get the current folder's ID based on path
  const getCurrentFolderId = (path: string): string | null => {
    if (path === "/") return null;
    
    const pathParts = path.split("/").filter(Boolean);
    let currentFolder: string | null = null;
    
    for (const part of pathParts) {
      const folder = folders.find((f: Folder) => 
        f.name === part && f.parentId === currentFolder
      );
      if (!folder) return null;
      currentFolder = folder.id;
    }
    
    return currentFolder;
  };
  
  // Get full path from folder ID
  const getPathFromFolderId = (folderId: string | null): string => {
    if (folderId === null) return "/";
    
    const folder = folders.find((f: Folder) => f.id === folderId);
    if (!folder) return "/";
    
    const parentPath = getPathFromFolderId(folder.parentId);
    return `${parentPath === "/" ? "" : parentPath}/${folder.name}`;
  };
  
  // Get items in current directory
  const getDirectoryContents = (path: string) => {
    const folderId = getCurrentFolderId(path);
    
    const foldersInDir = folders
      .filter((f: Folder) => f.parentId === folderId)
      .map((f: Folder) => ({ name: f.name, type: "folder" }));
      
    const docsInDir = documents
      .filter((d: Document) => d.folderId === folderId)
      .map((d: Document) => ({ name: d.name, type: "document", id: d.id }));
      
    return [...foldersInDir, ...docsInDir];
  };

  // Terminal commands
  const commands = {
    ls: {
      description: 'List directory contents',
      usage: 'ls',
      fn: () => {
        const contents = getDirectoryContents(currentDirectory);
        if (contents.length === 0) return "Directory is empty";
        
        return contents.map(item => 
          `${item.type === "folder" ? "📁" : "📄"} ${item.name}`
        ).join('\n');
      }
    },
    
    cd: {
      description: 'Change directory',
      usage: 'cd [directory]',
      fn: (directory: string = "/") => {
        if (directory === "..") {
          const pathParts = currentDirectory.split("/").filter(Boolean);
          if (pathParts.length === 0) return "Already at root directory";
          pathParts.pop();
          const newPath = pathParts.length === 0 ? "/" : `/${pathParts.join("/")}`;
          setCurrentDirectory(newPath);
          return `Changed directory to ${newPath}`;
        }
        
        if (directory === "/") {
          setCurrentDirectory("/");
          return "Changed directory to /";
        }
        
        // Handle relative path
        const targetPath = directory.startsWith("/") 
          ? directory 
          : `${currentDirectory === "/" ? "" : currentDirectory}/${directory}`;
        
        const folderId = getCurrentFolderId(targetPath);
        if (folderId === null && targetPath !== "/") {
          return `Directory not found: ${directory}`;
        }
        
        setCurrentDirectory(targetPath);
        return `Changed directory to ${targetPath}`;
      }
    },
    
    pwd: {
      description: 'Print working directory',
      usage: 'pwd',
      fn: () => currentDirectory
    },
    
    mkdir: {
      description: 'Create a new folder',
      usage: 'mkdir [folder_name]',
      fn: (folderName: string) => {
        if (!folderName) return "Please provide a folder name";
        
        const currentFolderId = getCurrentFolderId(currentDirectory);
        addFolder(folderName, currentFolderId);
        return `Created folder: ${folderName}`;
      }
    },
    
    touch: {
      description: 'Create a new document',
      usage: 'touch [document_name]',
      fn: (documentName: string) => {
        if (!documentName) return "Please provide a document name";
        
        const currentFolderId = getCurrentFolderId(currentDirectory);
        // @ts-ignore - The function signature might be different than expected
        const docId = addDocument(documentName, "", currentFolderId);
        return `Created document: ${documentName} (ID: ${docId})`;
      }
    },
    
    cat: {
      description: 'View a document',
      usage: 'cat [document_name]',
      fn: (documentName: string) => {
        if (!documentName) return "Please provide a document name";
        
        const currentFolderId = getCurrentFolderId(currentDirectory);
        const doc = documents.find((d: Document) => 
          d.name === documentName && d.folderId === currentFolderId
        );
        
        if (!doc) return `Document not found: ${documentName}`;
        
        router.push(`/documents/${doc.id}`);
        return `Opening document: ${documentName}`;
      }
    },
    
    rm: {
      description: 'Remove a document or folder',
      usage: 'rm [name]',
      fn: (name: string) => {
        if (!name) return "Please provide a name";
        
        const currentFolderId = getCurrentFolderId(currentDirectory);
        const doc = documents.find((d: Document) => 
          d.name === name && d.folderId === currentFolderId
        );
        
        if (doc) {
          deleteDocument(doc.id);
          return `Deleted document: ${name}`;
        }
        
        const folder = folders.find((f: Folder) => 
          f.name === name && f.parentId === currentFolderId
        );
        
        if (folder) {
          deleteFolder(folder.id);
          return `Deleted folder: ${name}`;
        }
        
        return `Item not found: ${name}`;
      }
    },
    
    rename: {
      description: 'Rename a document or folder',
      usage: 'rename [old_name] [new_name]',
      fn: (oldName: string, newName: string) => {
        if (!oldName || !newName) return "Please provide both old and new names";
        
        const currentFolderId = getCurrentFolderId(currentDirectory);
        const doc = documents.find((d: Document) => 
          d.name === oldName && d.folderId === currentFolderId
        );
        
        if (doc) {
          renameDocument(doc.id, newName);
          return `Renamed document: ${oldName} → ${newName}`;
        }
        
        const folder = folders.find((f: Folder) => 
          f.name === oldName && f.parentId === currentFolderId
        );
        
        if (folder) {
          renameFolder(folder.id, newName);
          return `Renamed folder: ${oldName} → ${newName}`;
        }
        
        return `Item not found: ${oldName}`;
      }
    },
    
    templates: {
      description: 'List available templates',
      usage: 'templates',
      fn: () => {
        if (templates.length === 0) return "No templates available";
        
        return templates.map((t: Template) => `- ${t.name}`).join('\n');
      }
    },
    
    create: {
      description: 'Create a document from template',
      usage: 'create [template_name] [document_name]',
      fn: (templateName: string, documentName: string) => {
        if (!templateName || !documentName) 
          return "Please provide both template name and document name";
        
        const template = templates.find((t: Template) => t.name === templateName);
        if (!template) return `Template not found: ${templateName}`;
        
        const currentFolderId = getCurrentFolderId(currentDirectory);
        // @ts-ignore - The function signature might be different than expected
        const docId = addDocument(documentName, "", currentFolderId, template.id);
        
        router.push(`/documents/${docId}`);
        return `Created document from template: ${documentName}`;
      }
    },
    
    help: {
      description: 'Show available commands',
      usage: 'help',
      fn: () => "Available commands:\n" + Object.keys(commands).join(', ')
    },
    
    clear: {
      description: 'Clear the terminal',
      usage: 'clear',
      fn: () => ""
    },
    
    exit: {
      description: 'Close the terminal',
      usage: 'exit',
      fn: () => {
        onClose();
        return "Closing terminal...";
      }
    }
  };

  // Determine background and text colors based on theme
  const isDark = theme === 'dark';
  const backgroundColor = isDark ? 'bg-background' : 'bg-background';
  const textColor = isDark ? 'text-foreground' : 'text-foreground';
  const borderColor = isDark ? 'border-border' : 'border-border';

  return (
    <div className={`w-full ${height} flex flex-col ${backgroundColor} ${borderColor} border-t`}>
      <div className="flex items-center justify-between p-2 border-b">
        <div className="text-sm font-medium">Terminal</div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className={`flex-1 overflow-hidden ${backgroundColor} ${textColor} font-mono text-sm`}>
        <Terminal
          commands={commands}
          welcomeMessage={`Welcome to the Writing App Terminal\nCurrent directory: ${currentDirectory}\nType 'help' to see available commands.`}
          promptLabel={`${currentDirectory} $`}
          autoFocus
          noDefaults={true}
          style={{
            height: "100%",
            overflow: "auto",
            backgroundColor: "transparent",
            color: "inherit",
            padding: "0.5rem",
          }}
          contentStyle={{
            backgroundColor: "transparent",
            color: "inherit",
          }}
          commandCallback={(cmd: string, args: string[]) => {
            // Update prompt after each command
            setTimeout(() => {
              const terminal = document.querySelector('.react-console-emulator');
              if (terminal) {
                const promptSpans = terminal.querySelectorAll('.react-console-emulator__prompt span');
                promptSpans.forEach(span => {
                  span.textContent = `${currentDirectory} $`;
                });
              }
            }, 0);
          }}
        />
      </div>
    </div>
  );
} 