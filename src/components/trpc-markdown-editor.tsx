"use client";

import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import dynamic from 'next/dynamic';
import { Save, X, History, BookmarkIcon, Sparkles, Hash, ArrowRight, Play, FileJson } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Annotation, Document } from "@/lib/store";
import { useTrpcDocumentStore } from "@/lib/trpc-document-store";
import { OnMount, useMonaco } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { VersionHistory } from "./version-history";
import { useToast } from "@/components/ui/use-toast";
import { formatDistanceToNow } from "date-fns";
import { TrpcLLMDialog } from "./trpc-llm-dialog";
import React from "react";
import { MarkdownRenderer } from "./markdown-renderer";
import { AnnotationDialog } from "./annotation-dialog";
import { TokenCounterDialog } from "./token-counter-dialog";
import { CompositionComposer } from "./composition-composer";
import matter from "gray-matter";
import { TerminalView } from "./terminal-view";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/utils/trpc";

// Dynamically import components that might cause hydration issues
const Editor = dynamic(() => import('@monaco-editor/react').then(mod => mod.default), { ssr: false });
const DiffEditor = dynamic(() => import('@monaco-editor/react').then(mod => mod.DiffEditor), { ssr: false });

// Define Monaco Editor types
interface EditorModel {
  getValueInRange: (range: any) => string;
  getPositionAt: (offset: number) => { lineNumber: number; column: number };
  pushEditOperations: (selections: any[], operations: any[], callback: () => null) => void;
}

interface MonacoEditor {
  getModel: () => EditorModel;
  getSelection: () => any;
  getPosition: () => { lineNumber: number; column: number } | null;
  setSelection: (selection: any) => void;
  revealRangeInCenter: (range: any) => void;
  focus: () => void;
  getValue: () => string;
  setValue: (value: string) => void;
  onContextMenu: (handler: (e: any) => void) => void;
  addCommand: (keybinding: number, handler: () => void) => void;
}

// Props interface required for forwardRef typing
interface TrpcMarkdownEditorProps {
  // This component doesn't currently require props, but we keep the interface for future extensibility
}

// Export the component with forwardRef to expose methods to the parent
const TrpcMarkdownEditor = forwardRef<
  { 
    compareDocuments: (doc1Id: string, doc2Id: string) => void;
    scrollToAnnotation?: (annotation: Annotation) => void;
  },
  TrpcMarkdownEditorProps
>((props, ref) => {
  const { documents, selectedDocumentId, updateDocument, selectDocument, loadData } = useTrpcDocumentStore();
  const [content, setContent] = useState("");
  const [activeTab, setActiveTab] = useState("edit");
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(true);
  const editorRef = useRef<MonacoEditor | null>(null);
  const monaco = useMonaco();
  const { theme, systemTheme } = useTheme();
  const [editorTheme, setEditorTheme] = useState<string>(() => {
    // Initialize with the correct theme based on current system/user preference
    if (typeof window !== 'undefined') {
      const currentTheme = theme === 'system' ? systemTheme : theme;
      return currentTheme === "dark" ? "vs-dark" : "vs";
    }
    return "vs-dark"; // Default for SSR
  });
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  
  // Diff viewer state
  const [showDiff, setShowDiff] = useState(false);
  const [diffOriginal, setDiffOriginal] = useState("");
  const [diffModified, setDiffModified] = useState("");
  const [diffOriginalTitle, setDiffOriginalTitle] = useState("");
  const [diffModifiedTitle, setDiffModifiedTitle] = useState("");

  // Add a reference to the current selection
  const [showLLMDialog, setShowLLMDialog] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [currentSelection, setCurrentSelection] = useState<any>(null);

  // Client-side only code
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Get the selected document
  const selectedDocument = documents.find(doc => doc.id === selectedDocumentId);

  // Comparison state
  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparisonDocuments, setComparisonDocuments] = useState<{
    original: string;
    modified: string;
    originalTitle?: string;
    modifiedTitle?: string;
  }>({
    original: "",
    modified: "",
  });

  // Add state for token counter dialog
  const [showTokenCounterDialog, setShowTokenCounterDialog] = useState(false);
  const [showCompositionComposer, setShowCompositionComposer] = useState(false);

  // Add state for showing/hiding the terminal
  const [showTerminal, setShowTerminal] = useState(false);

  // Add state for frontmatter dialog
  const [showFrontmatterDialog, setShowFrontmatterDialog] = useState(false);
  const [frontmatterContent, setFrontmatterContent] = useState("");
  const [documentContent, setDocumentContent] = useState("");

  // Add a toggle terminal function
  const toggleTerminal = useCallback(() => {
    setShowTerminal(prev => !prev);
  }, []);

  // Use tRPC mutation for document versions
  const saveDocumentVersion = trpc.document.createDocumentVersion.useMutation({
    onSuccess: () => {
      toast({
        title: "Version created",
        description: "A new document version has been saved.",
      });
    }
  });

  // Fetch document data on component mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update content when selected document changes
  useEffect(() => {
    if (selectedDocument) {
      setContent(selectedDocument.content || "");
    } else {
      setContent("");
    }
  }, [selectedDocument]);

  // Update editor theme when theme changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentTheme = theme === 'system' ? systemTheme : theme;
      setEditorTheme(currentTheme === "dark" ? "vs-dark" : "vs");
    }
  }, [theme, systemTheme]);

  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    compareDocuments: (doc1Id: string, doc2Id: string) => {
      const doc1 = documents.find(doc => doc.id === doc1Id);
      const doc2 = documents.find(doc => doc.id === doc2Id);
      
      if (doc1 && doc2) {
        setComparisonMode(true);
        setComparisonDocuments({
          original: doc1.content || "",
          modified: doc2.content || "",
          originalTitle: doc1.name,
          modifiedTitle: doc2.name
        });
        
        // Switch to diff view
        handleShowDiff(
          doc1.content,
          doc2.content,
          doc1.name,
          doc2.name
        );
      }
    },
    scrollToAnnotation: (annotation: Annotation) => {
      // Switch to edit tab
      setActiveTab("edit");
      
      // Wait for the editor to be ready
      setTimeout(() => {
        if (editorRef.current) {
          const editor = editorRef.current;
          const model = editor.getModel();
          
          if (model) {
            // Get the position from the offset
            const startPosition = model.getPositionAt(annotation.startOffset);
            const endPosition = model.getPositionAt(annotation.endOffset);
            
            // Set selection and reveal range
            editor.setSelection({
              startLineNumber: startPosition.lineNumber,
              startColumn: startPosition.column,
              endLineNumber: endPosition.lineNumber,
              endColumn: endPosition.column
            });
            
            editor.revealRangeInCenter({
              startLineNumber: startPosition.lineNumber,
              startColumn: startPosition.column,
              endLineNumber: endPosition.lineNumber,
              endColumn: endPosition.column
            });
            
            // Focus the editor
            editor.focus();
          }
        }
      }, 100);
    }
  }));

  // Handle editor initialization
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Add custom right-click menu options
    editor.onContextMenu((e) => {
      const selection = editor.getSelection();
      
      // If there's a selection, save it for use in context menu actions
      if (selection && !selection.isEmpty()) {
        const selectedText = editor.getModel().getValueInRange(selection);
        setSelectedText(selectedText);
        setCurrentSelection(selection);
      }
    });
    
    // Add keyboard shortcuts for common actions
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });
    
    // Add keyboard shortcut for AI assistant
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KeyA, () => {
      const selection = editor.getSelection();
      if (selection && !selection.isEmpty()) {
        const selectedText = editor.getModel().getValueInRange(selection);
        handleOpenLLMDialog(selectedText, selection);
      } else {
        handleOpenLLMDialog("", null);
      }
    });
  };

  // Extract frontmatter and content from a document
  const extractFrontmatterAndContent = useCallback((text: string) => {
    try {
      if (/^---\n[\s\S]*?\n---/.test(text)) {
        const { data, content } = matter(text);
        return { 
          frontmatter: Object.keys(data).length > 0 
            ? `---\n${Object.entries(data).map(([key, value]) => {
                if (typeof value === 'object') {
                  return `${key}: ${JSON.stringify(value, null, 2)
                    .split('\n')
                    .map((line, i) => i === 0 ? line : '  ' + line)
                    .join('\n')}`;
                }
                return `${key}: ${value}`;
              }).join('\n')}\n---` 
            : '',
          content: content.trim()
        };
      }
    } catch (error) {
      console.error("Error parsing frontmatter:", error);
    }
    
    return { frontmatter: '', content: text };
  }, []);
  
  // Reconstruct a document with frontmatter
  const reconstructFrontmatter = useCallback((document: Document) => {
    // Create a frontmatter object from document properties
    const frontmatterData: Record<string, any> = {};
    
    // Add basic metadata
    if (document.name) frontmatterData.title = document.name;
    if (document.id) frontmatterData.id = document.id;
    if (document.createdAt) frontmatterData.created = document.createdAt;
    if (document.updatedAt) frontmatterData.updated = document.updatedAt;
    
    // Add annotations if they exist
    if (Array.isArray(document.annotations) && document.annotations.length > 0) {
      frontmatterData.annotations = document.annotations.map(anno => ({
        id: anno.id,
        text: anno.text,
        startOffset: anno.startOffset,
        endOffset: anno.endOffset,
        createdAt: anno.createdAt
      }));
    }
    
    // Add contextDocuments if they exist
    if (Array.isArray(document.contextDocuments) && document.contextDocuments.length > 0) {
      frontmatterData.contextDocuments = document.contextDocuments.map(doc => ({
        id: doc.id,
        name: doc.name
      }));
    }
    
    // Convert to YAML format
    let frontmatter = '---\n';
    Object.entries(frontmatterData).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        frontmatter += `${key}: ${JSON.stringify(value, null, 2)
          .split('\n')
          .map((line, i) => i === 0 ? line : '  ' + line)
          .join('\n')}\n`;
      } else {
        frontmatter += `${key}: ${value}\n`;
      }
    });
    frontmatter += '---';
    
    return { frontmatter, content: document.content };
  }, []);

  // Function to handle opening the frontmatter dialog
  const handleOpenFrontmatterDialog = useCallback(() => {
    if (selectedDocument) {
      const { frontmatter, content } = extractFrontmatterAndContent(selectedDocument.content);
      
      setFrontmatterContent(frontmatter);
      setDocumentContent(content);
      setShowFrontmatterDialog(true);
    }
  }, [selectedDocument, extractFrontmatterAndContent]);

  // Function to save frontmatter changes
  const handleSaveFrontmatter = useCallback(() => {
    if (selectedDocumentId) {
      // Combine frontmatter and content
      let newContent = documentContent;
      
      if (frontmatterContent.trim()) {
        newContent = `${frontmatterContent}\n\n${documentContent}`;
      }
      
      // Update the document with new content
      updateDocument(selectedDocumentId, { content: newContent }, true, "Updated frontmatter");
      
      // Set the new content in the editor
      setContent(newContent);
      
      // Close the dialog
      setShowFrontmatterDialog(false);
    }
  }, [selectedDocumentId, frontmatterContent, documentContent, updateDocument]);

  // Handle editor content changes
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setContent(value);
      
      if (isAutoSaveEnabled) {
        // Clear any existing auto-save timer
        if (autoSaveTimerRef.current) {
          clearTimeout(autoSaveTimerRef.current);
        }
        
        // Set a new timer for auto-save
        autoSaveTimerRef.current = setTimeout(() => {
          saveContent(value);
        }, 1000); // Auto-save after 1 second of inactivity
      }
    }
  };

  // Save content to the document
  const saveContent = (valueToSave: string) => {
    if (!selectedDocumentId || !selectedDocument) return;
    
    setIsSaving(true);
    
    try {
      // Update the document with the new content
      updateDocument(selectedDocumentId, { content: valueToSave }, false)
        .finally(() => {
          setIsSaving(false);
        });
    } catch (error) {
      console.error("Error saving content:", error);
      setIsSaving(false);
      
      toast({
        title: "Error",
        description: "Failed to save document. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle manual save with version creation
  const handleSave = useCallback(() => {
    if (selectedDocumentId && selectedDocument && content !== selectedDocument.content) {
      setIsSaving(true);
      
      try {
        // Create a version message
        const versionMessage = `Manual save on ${new Date().toLocaleString()}`;
        
        // Update document with version creation
        updateDocument(
          selectedDocumentId, 
          { content }, 
          true, 
          versionMessage
        ).then(() => {
          setIsSaving(false);
          
          // Show success notification
          toast({
            title: "Document saved",
            description: "A new version has been created.",
          });
        });
      } catch (error) {
        console.error("Error saving document:", error);
        setIsSaving(false);
        
        toast({
          title: "Error",
          description: "Failed to save document. Please try again.",
          variant: "destructive",
        });
      }
    }
  }, [selectedDocumentId, content, selectedDocument, updateDocument, toast]);

  // Handle showing diff view
  const handleShowDiff = (originalContent: string, modifiedContent: string, originalTitle: string, modifiedTitle: string) => {
    setDiffOriginal(originalContent);
    setDiffModified(modifiedContent);
    setDiffOriginalTitle(originalTitle);
    setDiffModifiedTitle(modifiedTitle);
    setShowDiff(true);
  };

  // Handle closing diff view
  const handleCloseDiff = () => {
    setShowDiff(false);
  };

  // Handle opening the LLM dialog
  const handleOpenLLMDialog = (text: string, selection: any) => {
    setSelectedText(text);
    setCurrentSelection(selection);
    setShowLLMDialog(true);
  };

  // Handle closing the LLM dialog
  const handleCloseLLMDialog = () => {
    setShowLLMDialog(false);
  };

  // Handle applying changes from LLM dialog to editor
  const handleApplyChanges = (text: string) => {
    if (editorRef.current && currentSelection) {
      const editor = editorRef.current;
      const model = editor.getModel();
      
      if (model) {
        // Replace the selected text with the generated text
        model.pushEditOperations(
          [],
          [
            {
              range: currentSelection,
              text: text
            }
          ],
          () => null
        );
        
        // Focus the editor
        editor.focus();
      }
    } else if (editorRef.current) {
      // If no selection, insert at current cursor position
      const editor = editorRef.current;
      const position = editor.getPosition();
      
      if (position) {
        editor.setValue(editor.getValue() + "\n\n" + text);
        editor.focus();
      }
    }
    
    setShowLLMDialog(false);
  };

  // Handle restore version
  const handleRestoreVersion = (version: any) => {
    if (selectedDocumentId && version) {
      setContent(version.content);
      saveContent(version.content);
      
      toast({
        title: "Version restored",
        description: `Restored version from ${formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}`,
      });
    }
  };

  // Handle adding an annotation
  const handleAddAnnotation = () => {
    if (editorRef.current && selectedDocumentId) {
      const editor = editorRef.current;
      const selection = editor.getSelection();
      
      if (selection && !selection.isEmpty()) {
        const model = editor.getModel();
        const selectedText = model.getValueInRange(selection);
        
        // Calculate text offsets
        const startOffset = model.getOffsetAt({
          lineNumber: selection.startLineNumber,
          column: selection.startColumn
        });
        
        const endOffset = model.getOffsetAt({
          lineNumber: selection.endLineNumber,
          column: selection.endColumn
        });
        
        setSelectedTextRange({
          startOffset,
          endOffset,
          selectedText
        });
        
        setShowAnnotationDialog(true);
      } else {
        // Show notification to select text first
        toast({
          title: "Select text",
          description: "Please select text to annotate.",
          variant: "default",
        });
      }
    }
  };

  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showAnnotationDialog, setShowAnnotationDialog] = useState(false);
  const [selectedTextRange, setSelectedTextRange] = useState<{
    startOffset: number;
    endOffset: number;
    selectedText: string;
  } | null>(null);

  return (
    <div className="flex flex-col w-full h-full">
      {showDiff ? (
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-center p-2 bg-muted">
            <div className="flex items-center">
              <span className="text-sm font-medium mr-2">Comparing:</span>
              <span className="text-xs mr-2">{diffOriginalTitle}</span>
              <ArrowRight className="h-4 w-4 mx-1" />
              <span className="text-xs">{diffModifiedTitle}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleCloseDiff}>
              <X className="h-4 w-4 mr-2" />
              Close Diff
            </Button>
          </div>
          <div className="flex-1">
            {isClient && (
              <DiffEditor
                original={diffOriginal}
                modified={diffModified}
                language="markdown"
                theme={editorTheme}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                  diffWordWrap: "on",
                }}
              />
            )}
          </div>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
          <div className="border-b px-2">
            <div className="flex justify-between items-center">
              <TabsList>
                <TabsTrigger value="edit">Edit</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              
              <div className="flex items-center space-x-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  disabled={!selectedDocumentId}
                  onClick={handleSave}
                  title="Save (Ctrl+S)"
                >
                  <Save className="h-4 w-4" />
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  disabled={!selectedDocumentId}
                  onClick={() => setShowVersionHistory(true)}
                  title="Version History"
                >
                  <History className="h-4 w-4" />
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  disabled={!selectedDocumentId}
                  onClick={handleAddAnnotation}
                  title="Add Annotation"
                >
                  <BookmarkIcon className="h-4 w-4" />
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  disabled={!selectedDocumentId}
                  onClick={() => setShowTokenCounterDialog(true)}
                  title="Token Counter"
                >
                  <Hash className="h-4 w-4" />
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  disabled={!selectedDocumentId}
                  onClick={() => setShowCompositionComposer(true)}
                  title="Composition Composer"
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  disabled={!selectedDocumentId}
                  onClick={toggleTerminal}
                  title="Terminal"
                >
                  <Play className="h-4 w-4" />
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  disabled={!selectedDocumentId}
                  onClick={handleOpenFrontmatterDialog}
                  title="Edit Frontmatter"
                >
                  <FileJson className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          <TabsContent value="edit" className="flex-1 overflow-hidden p-0 m-0">
            <div className="h-full">
              {isClient && (
                <Editor
                  language="markdown"
                  value={content}
                  onChange={handleEditorChange}
                  onMount={handleEditorDidMount}
                  options={{
                    minimap: { enabled: false },
                    lineNumbers: "on",
                    wordWrap: "on",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    fontFamily: "Menlo, Monaco, 'Courier New', monospace",
                    fontSize: 14,
                    tabSize: 2,
                    padding: { top: 16 },
                    cursorBlinking: "smooth",
                    cursorSmoothCaretAnimation: "on",
                    smoothScrolling: true,
                    renderWhitespace: "none",
                    colorDecorators: true,
                  }}
                  theme={editorTheme}
                  className="editor-container"
                />
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="preview" className="flex-1 overflow-auto">
            <div className="p-4">
              <MarkdownRenderer content={content} />
            </div>
          </TabsContent>
        </Tabs>
      )}
      
      {/* Version History Dialog */}
      {showVersionHistory && selectedDocument && (
        <VersionHistory 
          documentId={selectedDocument.id}
          onClose={() => setShowVersionHistory(false)} 
          onRestore={handleRestoreVersion}
        />
      )}
      
      {/* Annotation Dialog */}
      {showAnnotationDialog && selectedDocument && selectedTextRange && (
        <AnnotationDialog
          open={showAnnotationDialog}
          onOpenChange={setShowAnnotationDialog}
          documentId={selectedDocument.id}
          selectionRange={selectedTextRange}
        />
      )}
      
      {/* Token Counter Dialog */}
      <TokenCounterDialog
        isOpen={showTokenCounterDialog}
        onClose={() => setShowTokenCounterDialog(false)}
        selectedText={selectedText}
      />
      
      {/* LLM Dialog */}
      {showLLMDialog && (
        <TrpcLLMDialog
          isOpen={showLLMDialog}
          onClose={handleCloseLLMDialog}
          selectedText={selectedText}
          editor={editorRef.current}
          selection={currentSelection}
          onApplyChanges={handleApplyChanges}
        />
      )}
      
      {/* Multi-File Token Counter Dialog */}
      {showCompositionComposer && selectedDocument && (
        <CompositionComposer
          isOpen={showCompositionComposer}
          onClose={() => setShowCompositionComposer(false)}
          documents={[selectedDocument]}
        />
      )}

      {/* Terminal View */}
      {showTerminal && (
        <TerminalView 
          onClose={() => setShowTerminal(false)} 
          initialDirectory="/"
          height="200px"
        />
      )}

      {/* Add Frontmatter Dialog */}
      <Dialog open={showFrontmatterDialog} onOpenChange={setShowFrontmatterDialog}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Document Frontmatter</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-4 flex-grow overflow-hidden">
            <div className="flex flex-col h-full overflow-hidden">
              <Label htmlFor="frontmatter" className="mb-2">Frontmatter (YAML format)</Label>
              <Textarea
                id="frontmatter"
                value={frontmatterContent}
                onChange={(e) => setFrontmatterContent(e.target.value)}
                className="font-mono text-sm h-40 resize-none"
                placeholder="---
title: Document Title
date: 2023-06-15
tags: [tag1, tag2]
---"
              />
              
              <Label htmlFor="content" className="mb-2 mt-4">Document Content</Label>
              <Textarea
                id="content"
                value={documentContent}
                onChange={(e) => setDocumentContent(e.target.value)}
                className="font-mono text-sm flex-grow resize-none"
                placeholder="Document content goes here..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFrontmatterDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveFrontmatter}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

TrpcMarkdownEditor.displayName = "TrpcMarkdownEditor";

export default TrpcMarkdownEditor; 