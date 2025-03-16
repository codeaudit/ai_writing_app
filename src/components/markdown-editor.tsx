"use client";

import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import dynamic from 'next/dynamic';
import { Bold, Italic, List, ListOrdered, Heading1, Heading2, Heading3, Code, Save, X, History, Undo, BookmarkIcon, Search, Sparkles, Hash, ArrowRight, Play, FileJson } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDocumentStore, Annotation, Document } from "@/lib/store";
import { OnMount, useMonaco, type Monaco, type EditorProps } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { VersionHistory } from "./version-history";
import { useToast } from "@/components/ui/use-toast";
import { formatDistanceToNow } from "date-fns";
import { LLMDialog } from "./llm-dialog";
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

// Dynamically import components that might cause hydration issues
const Editor = dynamic(() => import('@monaco-editor/react').then(mod => mod.default), { ssr: false });
const DiffEditor = dynamic(() => import('@monaco-editor/react').then(mod => mod.DiffEditor), { ssr: false });

interface MarkdownEditorProps {}

// Export the component with forwardRef to expose methods to the parent
const MarkdownEditor = forwardRef<
  { 
    compareDocuments: (doc1Id: string, doc2Id: string) => void;
    scrollToAnnotation?: (annotation: Annotation) => void;
  },
  MarkdownEditorProps
>((props, ref) => {
  const { documents, selectedDocumentId, updateDocument, selectDocument } = useDocumentStore();
  const [content, setContent] = useState("");
  const [activeTab, setActiveTab] = useState("edit");
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(true);
  const editorRef = useRef<any>(null);
  const monaco = useMonaco();
  const { theme, systemTheme } = useTheme();
  const [editorTheme, setEditorTheme] = useState<string>(() => {
    // Initialize with the correct theme based on current system/user preference
    // Use a function for the initial state to avoid hydration mismatches
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
  const [dialogPosition, setDialogPosition] = useState<{ x: number; y: number } | null>(null);
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
        if (editorRef.current && annotation.startOffset !== undefined) {
          // Get the position from the offset
          const position = editorRef.current.getModel()?.getPositionAt(annotation.startOffset);
          
          if (position) {
            // Scroll to the position
            editorRef.current.revealPositionInCenter(position);
            
            // Set the cursor at the position
            editorRef.current.setPosition(position);
            
            // Focus the editor
            editorRef.current.focus();
            
            // Highlight the text range if we have both start and end offsets
            if (annotation.endOffset !== undefined) {
              const endPosition = editorRef.current.getModel()?.getPositionAt(annotation.endOffset);
              if (endPosition) {
                editorRef.current.setSelection({
                  startLineNumber: position.lineNumber,
                  startColumn: position.column,
                  endLineNumber: endPosition.lineNumber,
                  endColumn: endPosition.column
                });
              }
            }
          }
        }
      }, 100);
    }
  }));

  // Update editor theme when app theme changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentTheme = theme === 'system' ? systemTheme : theme;
      setEditorTheme(currentTheme === "dark" ? "vs-dark" : "vs");
    }
  }, [theme, systemTheme]);

  // Configure Monaco Editor
  useEffect(() => {
    if (monaco) {
      // Set editor options
      monaco.editor.defineTheme('lightTheme', {
        base: 'vs',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#ffffff',
        }
      });
      
      monaco.editor.defineTheme('darkTheme', {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#1e1e2e',
        }
      });
      
      // Register custom keyboard shortcuts
      monaco.editor.addKeybindingRules([
        {
          keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
          command: "editor.action.customSave",
          when: "editorTextFocus"
        },
        {
          keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK,
          command: "editor.action.customLLMDialog",
          when: "editorTextFocus"
        },
        {
          keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL,
          command: "editor.action.customTokenCounter",
          when: "editorTextFocus"
        },
        // Explicitly register undo shortcut to ensure it works as expected
        {
          keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ,
          command: "undo",
          when: "editorTextFocus && !editorReadonly"
        }
      ]);
    }
  }, [monaco]);

  useEffect(() => {
    if (selectedDocument) {
      // Just set the content as is, without generating frontmatter
      setContent(selectedDocument.content);
    } else {
      setContent("");
    }
  }, [selectedDocumentId, selectedDocument]);

  // Auto-save functionality
  useEffect(() => {
    if (isAutoSaveEnabled && selectedDocumentId && selectedDocument && content !== selectedDocument.content) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      
      autoSaveTimerRef.current = setTimeout(() => {
        if (selectedDocumentId && selectedDocument && content !== selectedDocument.content) {
          setIsSaving(true);
          // Auto-save without creating a version (explicitly set createVersion to false)
          updateDocument(selectedDocumentId, { content }, false);
          setIsSaving(false);
        }
      }, 2000); // Auto-save after 2 seconds of inactivity
    }
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [content, isAutoSaveEnabled, selectedDocumentId, selectedDocument, updateDocument]);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Register custom commands
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    }, "editorTextFocus");
    
    // Use the same command ID as registered in the keyboard shortcuts
    editor.addAction({
      id: "editor.action.customLLMDialog",
      label: "Show AI Assistant",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK],
      contextMenuGroupId: "navigation",
      run: (ed) => {
        const selection = ed.getSelection();
        if (selection) {
          const selectedText = ed.getModel()?.getValueInRange(selection) || "";
          
          // Get the coordinates of the selection
          const selectionCoords = ed.getScrolledVisiblePosition({
            lineNumber: selection.startLineNumber,
            column: selection.startColumn
          });

          if (selectionCoords) {
            // Get the editor container's position
            const editorContainer = ed.getContainerDomNode();
            const editorRect = editorContainer.getBoundingClientRect();

            // Calculate absolute position
            const x = editorRect.left + selectionCoords.left;
            // Position it above the cursor by subtracting some pixels
            const y = editorRect.top + selectionCoords.top - 10;

            setDialogPosition({ x, y });
            setSelectedText(selectedText);
            setCurrentSelection(selection);
            setShowLLMDialog(true);
          }
        } else {
          // If no text is selected, show the dialog at the current cursor position
          const position = ed.getPosition();
          if (position) {
            const cursorCoords = ed.getScrolledVisiblePosition(position);
            
            if (cursorCoords) {
              const editorContainer = ed.getContainerDomNode();
              const editorRect = editorContainer.getBoundingClientRect();
              
              const x = editorRect.left + cursorCoords.left;
              // Position it above the cursor by subtracting some pixels
              const y = editorRect.top + cursorCoords.top - 10;
              
              setDialogPosition({ x, y });
              setSelectedText("");
              setCurrentSelection(null);
              setShowLLMDialog(true);
            }
          }
        }
      }
    });

    // Add token counter action
    editor.addAction({
      id: "editor.action.customTokenCounter",
      label: "Compose",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL],
      contextMenuGroupId: "navigation",
      run: (ed) => {
        const selection = ed.getSelection();
        if (selection && !selection.isEmpty()) {
          const selectedText = ed.getModel()?.getValueInRange(selection) || "";
          if (selectedText) {
            setSelectedText(selectedText);
            setShowTokenCounterDialog(true);
          }
        } else {
          // If no text is selected, show a message
          toast({
            title: "No text selected",
            description: "Please select some text to compose.",
            variant: "default"
          });
        }
      }
    });

    // Configure editor options for better undo/redo experience
    editor.getModel()?.setEOL(monaco.editor.EndOfLineSequence.LF);
  };

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

  const saveContent = (valueToSave: string) => {
    if (!selectedDocumentId || !selectedDocument) return;
    
    setIsSaving(true);
    
    try {
      // Check if content has frontmatter
      if (/^---\n[\s\S]*?\n---/.test(valueToSave)) {
        // Parse the content to separate frontmatter and actual content
        const { data, content: actualContent } = matter(valueToSave);
        
        // Update the document with the actual content (without frontmatter)
        updateDocument(selectedDocumentId, { content: valueToSave }, false);
      } else {
        // No frontmatter, save as is
        updateDocument(selectedDocumentId, { content: valueToSave }, false);
      }
    } catch (error) {
      console.error("Error parsing frontmatter:", error);
      
      // If parsing fails, save the content as is
      updateDocument(selectedDocumentId, { content: valueToSave }, false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = useCallback(() => {
    if (selectedDocumentId && selectedDocument && content !== selectedDocument.content) {
      setIsSaving(true);
      
      try {
        // Always create a version when manually saving
        setTimeout(() => {
          updateDocument(
            selectedDocumentId, 
            { content }, 
            true, // Always create version for manual saves
            `Manual save on ${new Date().toLocaleString()}`
          );
          setIsSaving(false);
          
          // Show toast notification
          toast({
            title: "Document saved",
            description: "A new version has been created.",
          });
        }, 300);
      } catch (error) {
        console.error("Error saving document:", error);
        
        // If parsing fails, save the content as is
        setTimeout(() => {
          updateDocument(
            selectedDocumentId, 
            { content }, 
            true,
            `Manual save on ${new Date().toLocaleString()}`
          );
          setIsSaving(false);
          
          // Show toast notification
          toast({
            title: "Document saved",
            description: "A new version has been created.",
          });
        }, 300);
      }
    }
  }, [selectedDocumentId, content, selectedDocument, updateDocument, toast]);

  const handleShowDiff = (originalContent: string, modifiedContent: string, originalTitle: string, modifiedTitle: string) => {
    setDiffOriginal(originalContent);
    setDiffModified(modifiedContent);
    setDiffOriginalTitle(originalTitle);
    setDiffModifiedTitle(modifiedTitle);
    setShowDiff(true);
  };

  const handleCloseDiff = () => {
    setShowDiff(false);
  };

  const insertMarkdown = (markdownSyntax: string) => {
    if (!editorRef.current) return;
    
    const editor = editorRef.current;
    const selection = editor.getSelection();
    
    if (!selection) return;
    
    const selectedText = editor.getModel()?.getValueInRange(selection) || "";
    
    let newText = "";
    switch (markdownSyntax) {
      case "bold":
        newText = `**${selectedText || "bold text"}**`;
        break;
      case "italic":
        newText = `*${selectedText || "italic text"}*`;
        break;
      case "h1":
        newText = `# ${selectedText || "Heading 1"}`;
        break;
      case "h2":
        newText = `## ${selectedText || "Heading 2"}`;
        break;
      case "h3":
        newText = `### ${selectedText || "Heading 3"}`;
        break;
      case "ul":
        newText = `- ${selectedText || "List item"}`;
        break;
      case "ol":
        newText = `1. ${selectedText || "List item"}`;
        break;
      case "code":
        newText = `\`${selectedText || "code"}\``;
        break;
      default:
        newText = selectedText;
    }
    
    editor.executeEdits("markdown-toolbar", [{
      range: selection,
      text: newText,
      forceMoveMarkers: true
    }]);
    
    editor.focus();
  };

  const createNewVersion = () => {
    if (!selectedDocumentId || !selectedDocument) return;
    
    const timestamp = new Date();
    
    // Create a new version with the current content
    updateDocument(
      selectedDocumentId, 
      { content: selectedDocument.content }, 
      true, // Explicitly create a version
      `Version created on ${timestamp.toLocaleString()}`
    );
    
    // Show toast notification
    toast({
      title: "Version created",
      description: `Version from ${formatDistanceToNow(timestamp, { addSuffix: true })} has been saved.`,
    });
  };

  // Add a function to handle undo
  const handleUndo = () => {
    if (!editorRef.current) return;
    
    // Execute the undo command
    editorRef.current.trigger('keyboard', 'undo', null);
  };

  // Add a global keyboard shortcut handler for LLMDialog
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K to show LLM dialog
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault(); // Prevent default browser behavior
        
        if (editorRef.current) {
          const editor = editorRef.current;
          const selection = editor.getSelection();
          
          if (selection) {
            const selectedText = editor.getModel()?.getValueInRange(selection) || "";
            
            // Get the coordinates of the selection
            const selectionCoords = editor.getScrolledVisiblePosition({
              lineNumber: selection.startLineNumber,
              column: selection.startColumn
            });

            if (selectionCoords) {
              // Get the editor container's position
              const editorContainer = editor.getContainerDomNode();
              const editorRect = editorContainer.getBoundingClientRect();

              // Calculate absolute position
              const x = editorRect.left + selectionCoords.left;
              // Position it above the cursor by subtracting some pixels
              const y = editorRect.top + selectionCoords.top - 10;

              setDialogPosition({ x, y });
              setSelectedText(selectedText);
              setCurrentSelection(selection);
              setShowLLMDialog(true);
            }
          } else {
            // If no text is selected, show the dialog at the current cursor position
            const position = editor.getPosition();
            if (position) {
              const cursorCoords = editor.getScrolledVisiblePosition(position);
              
              if (cursorCoords) {
                const editorContainer = editor.getContainerDomNode();
                const editorRect = editorContainer.getBoundingClientRect();
                
                const x = editorRect.left + cursorCoords.left;
                // Position it above the cursor by subtracting some pixels
                const y = editorRect.top + cursorCoords.top - 10;
                
                setDialogPosition({ x, y });
                setSelectedText("");
                setCurrentSelection(null);
                setShowLLMDialog(true);
              }
            }
          }
        }
      }
      
      // Add shortcut for terminal (Alt+T)
      if (e.altKey && e.key === 't') {
        e.preventDefault();
        toggleTerminal();
      }
    };

    // Add the event listener to the document
    document.addEventListener('keydown', handleGlobalKeyDown);
    
    // Clean up the event listener when the component unmounts
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [toggleTerminal]);

  // Add a button to the toolbar to open the LLM dialog
  const openLLMDialog = () => {
    if (editorRef.current) {
      const editor = editorRef.current;
      const selection = editor.getSelection();
      
      if (selection) {
        const selectedText = editor.getModel()?.getValueInRange(selection) || "";
        
        // Get the coordinates of the selection
        const selectionCoords = editor.getScrolledVisiblePosition({
          lineNumber: selection.startLineNumber,
          column: selection.startColumn
        });

        if (selectionCoords) {
          // Get the editor container's position
          const editorContainer = editor.getContainerDomNode();
          const editorRect = editorContainer.getBoundingClientRect();

          // Calculate absolute position
          const x = editorRect.left + selectionCoords.left;
          // Position it above the cursor by subtracting some pixels
          const y = editorRect.top + selectionCoords.top - 10;

          setDialogPosition({ x, y });
          setSelectedText(selectedText);
          setCurrentSelection(selection);
          setShowLLMDialog(true);
        }
      } else {
        // If no text is selected, show the dialog at the current cursor position
        const position = editor.getPosition();
        if (position) {
          const cursorCoords = editor.getScrolledVisiblePosition(position);
          
          if (cursorCoords) {
            const editorContainer = editor.getContainerDomNode();
            const editorRect = editorContainer.getBoundingClientRect();
            
            const x = editorRect.left + cursorCoords.left;
            // Position it above the cursor by subtracting some pixels
            const y = editorRect.top + cursorCoords.top - 10;
            
            setDialogPosition({ x, y });
            setSelectedText("");
            setCurrentSelection(null);
            setShowLLMDialog(true);
          }
        }
      }
    }
  };

  // Handle text selection for annotations
  useEffect(() => {
    if (!editorRef.current) return;
    
    const editor = editorRef.current;
    const selectionChangeDisposable = editor.onDidChangeCursorSelection((e: any) => {
      const selection = editor.getSelection();
      if (selection && !selection.isEmpty()) {
        const model = editor.getModel();
        if (model) {
          const startOffset = model.getOffsetAt(selection.getStartPosition());
          const endOffset = model.getOffsetAt(selection.getEndPosition());
          const selectedText = model.getValueInRange(selection);
          
          setSelectedTextRange({
            startOffset,
            endOffset,
            selectedText
          });
        }
      } else {
        setSelectedTextRange(null);
      }
    });
    
    return () => {
      selectionChangeDisposable.dispose();
    };
  }, [editorRef.current]);
  
  // Handle adding annotation from selection
  const handleAddAnnotation = () => {
    if (selectedTextRange && selectedDocumentId) {
      setShowAnnotationDialog(true);
    } else {
      toast({
        title: "No text selected",
        description: "Please select some text to annotate",
        variant: "destructive"
      });
    }
  };
  
  // Handle navigating to an annotation
  const handleNavigateToAnnotation = (documentId: string, annotation: Annotation) => {
    if (documentId !== selectedDocumentId) {
      // If the annotation is in a different document, select that document first
      selectDocument(documentId);
    }
    
    // Wait for the editor to load the document
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
  };

  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showAnnotationDialog, setShowAnnotationDialog] = useState(false);
  const [selectedTextRange, setSelectedTextRange] = useState<{
    startOffset: number;
    endOffset: number;
    selectedText: string;
  } | null>(null);

  // Handle restoring a version from version history
  const handleRestoreVersion = (content: string) => {
    if (selectedDocumentId) {
      updateDocument(
        selectedDocumentId,
        { content },
        true,
        `Restored from version history on ${new Date().toLocaleString()}`
      );
      setContent(content);
      setShowVersionHistory(false);
      
      // Show toast notification
      toast({
        title: "Version restored",
        description: "The selected version has been restored.",
      });
    }
  };

  // Function to extract frontmatter and content
  const extractFrontmatterAndContent = useCallback((fullContent: string) => {
    try {
      // This function is now just a wrapper for reconstructFrontmatter
      // for backward compatibility
      if (!selectedDocument) {
        return { frontmatter: '', content: fullContent };
      }
      return reconstructFrontmatter(selectedDocument);
    } catch (error) {
      console.error("Error extracting frontmatter:", error);
      // If there's an error, assume there's no frontmatter
      return { frontmatter: '', content: fullContent };
    }
  }, [selectedDocument]);

  // Function to reconstruct frontmatter from document properties
  const reconstructFrontmatter = useCallback((document: Document) => {
    // Create a frontmatter object from document properties
    const frontmatterData: Record<string, any> = {
      id: document.id,
      createdAt: document.createdAt instanceof Date 
        ? document.createdAt.toISOString() 
        : typeof document.createdAt === 'string' 
          ? document.createdAt 
          : new Date().toISOString(),
      updatedAt: document.updatedAt instanceof Date 
        ? document.updatedAt.toISOString() 
        : typeof document.updatedAt === 'string' 
          ? document.updatedAt 
          : new Date().toISOString()
    };
    
    // Add annotations if they exist
    if (Array.isArray(document.annotations) && document.annotations.length > 0) {
      frontmatterData.annotations = document.annotations.map(anno => ({
        id: anno.id,
        documentId: anno.documentId,
        startOffset: anno.startOffset,
        endOffset: anno.endOffset,
        content: anno.content,
        color: anno.color,
        createdAt: anno.createdAt instanceof Date 
          ? anno.createdAt.toISOString() 
          : typeof anno.createdAt === 'string' 
            ? anno.createdAt 
            : new Date().toISOString(),
        updatedAt: anno.updatedAt instanceof Date 
          ? anno.updatedAt.toISOString() 
          : typeof anno.updatedAt === 'string' 
            ? anno.updatedAt 
            : new Date().toISOString(),
        tags: anno.tags
      }));
    }
    
    // Add versions if they exist
    if (Array.isArray(document.versions) && document.versions.length > 0) {
      frontmatterData.versions = document.versions.map(v => ({
        id: v.id,
        createdAt: v.createdAt instanceof Date 
          ? v.createdAt.toISOString() 
          : typeof v.createdAt === 'string' 
            ? v.createdAt 
            : new Date().toISOString(),
        message: v.message
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
      console.log("Opening frontmatter dialog for document:", selectedDocument.name);
      console.log("Document content:", selectedDocument.content.substring(0, 200) + "...");
      
      const { frontmatter, content } = extractFrontmatterAndContent(selectedDocument.content);
      
      console.log("Extracted frontmatter:", frontmatter);
      console.log("Extracted content:", content.substring(0, 200) + "...");
      
      setFrontmatterContent(frontmatter);
      setDocumentContent(content);
      setShowFrontmatterDialog(true);
    }
  }, [selectedDocument, extractFrontmatterAndContent]);
  
  // Function to save frontmatter changes
  const handleSaveFrontmatter = useCallback(() => {
    if (selectedDocumentId && selectedDocument) {
      try {
        // Parse the frontmatter content to extract structured data
        const trimmedFrontmatter = frontmatterContent.trim();
        let frontmatterData: Record<string, any> = {};
        
        if (trimmedFrontmatter) {
          // Extract the YAML content between the --- markers
          const yamlContent = trimmedFrontmatter.replace(/^---\n/, '').replace(/\n---$/, '');
          // Parse the YAML content
          const { data } = matter(`---\n${yamlContent}\n---\n`, {});
          frontmatterData = data;
        }
        
        // Create an update object with the parsed frontmatter data
        const updateData: Partial<Document> = {
          content: documentContent // Update the content without frontmatter
        };
        
        // Update specific properties from frontmatter if they exist
        if (frontmatterData.annotations) {
          updateData.annotations = frontmatterData.annotations.map((anno: any) => ({
            id: anno.id,
            documentId: anno.documentId || selectedDocument.id,
            startOffset: anno.startOffset,
            endOffset: anno.endOffset,
            content: anno.content || '',
            color: anno.color || 'yellow',
            createdAt: anno.createdAt ? new Date(anno.createdAt) : new Date(),
            updatedAt: anno.updatedAt ? new Date(anno.updatedAt) : new Date(),
            tags: Array.isArray(anno.tags) ? anno.tags : []
          }));
        }
        
        if (frontmatterData.versions) {
          updateData.versions = frontmatterData.versions.map((v: any) => ({
            id: v.id,
            content: '', // We don't store version content in the frontmatter
            createdAt: v.createdAt ? new Date(v.createdAt) : new Date(),
            message: v.message
          }));
        }
        
        // Handle createdAt and updatedAt if they exist in frontmatter
        if (frontmatterData.createdAt) {
          try {
            updateData.createdAt = new Date(frontmatterData.createdAt);
          } catch (e) {
            console.error("Error parsing createdAt date:", e);
            // Keep the existing date if parsing fails
          }
        }
        
        if (frontmatterData.updatedAt) {
          try {
            updateData.updatedAt = new Date(frontmatterData.updatedAt);
          } catch (e) {
            console.error("Error parsing updatedAt date:", e);
            // Keep the existing date if parsing fails
          }
        }
        
        // Update the document with the new content and structured data
        updateDocument(selectedDocumentId, updateData, true);
        setContent(documentContent); // Update the editor content
        setShowFrontmatterDialog(false);
        
        toast({
          title: "Frontmatter updated",
          description: "Document frontmatter has been updated successfully.",
        });
      } catch (error) {
        console.error("Error parsing frontmatter:", error);
        toast({
          title: "Error updating frontmatter",
          description: "There was an error parsing the frontmatter. Please check the format and try again.",
          variant: "destructive"
        });
      }
    }
  }, [selectedDocumentId, selectedDocument, frontmatterContent, documentContent, updateDocument]);

  // Render a loading state or empty state during SSR to prevent hydration errors
  if (!isClient) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="bg-card text-card-foreground rounded-xl border p-6 shadow-sm max-w-md">
          <div className="text-xl font-semibold mb-2">Loading editor...</div>
        </div>
      </div>
    );
  }

  if (!selectedDocumentId || !selectedDocument) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="bg-card text-card-foreground rounded-xl border p-6 shadow-sm max-w-md">
          <div className="text-xl font-semibold mb-2">No Document Selected</div>
          <div className="text-muted-foreground text-sm">Select a document from the sidebar or create a new one.</div>
        </div>
      </div>
    );
  }

  if (showDiff) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <h2 className="text-lg font-semibold">Comparing Versions</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                if (diffOriginal && selectedDocumentId) {
                  // Update document with the original content (left side)
                  updateDocument(
                    selectedDocumentId, 
                    { content: diffOriginal }, 
                    true, 
                    `Restored from diff view on ${new Date().toLocaleString()}`
                  );
                  setContent(diffOriginal);
                  handleCloseDiff();
                  
                  // Show toast notification
                  toast({
                    title: "Version restored",
                    description: "The left version has been restored.",
                  });
                }
              }}
              title="Restore the left version"
            >
              Restore Left
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                if (diffModified && selectedDocumentId) {
                  // Update document with the modified content (right side)
                  updateDocument(
                    selectedDocumentId, 
                    { content: diffModified }, 
                    true, 
                    `Restored from diff view on ${new Date().toLocaleString()}`
                  );
                  setContent(diffModified);
                  handleCloseDiff();
                  
                  // Show toast notification
                  toast({
                    title: "Version restored",
                    description: "The right version has been restored.",
                  });
                }
              }}
              title="Restore the right version"
            >
              Restore Right
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCloseDiff}
              title="Close diff view"
            >
              <X className="h-4 w-4 mr-2" />
              Close Diff
            </Button>
          </div>
        </div>
        
        <div className="flex justify-between mb-2 text-sm">
          <div className="flex-1 px-4 py-2 bg-muted rounded-t-md border-t border-l border-r">
            <span className="font-medium">{diffOriginalTitle}</span>
          </div>
          <div className="w-[1px] bg-border"></div>
          <div className="flex-1 px-4 py-2 bg-muted rounded-t-md border-t border-r border-r">
            <span className="font-medium">{diffModifiedTitle}</span>
          </div>
        </div>
        
        <div className="flex-1 border rounded-md overflow-hidden">
          {isClient && (
            <DiffEditor
              height="100%"
              language="markdown"
              original={diffOriginal}
              modified={diffModified}
              theme={editorTheme}
              options={{
                renderSideBySide: true,
                minimap: { enabled: false },
                wordWrap: "on",
                lineNumbers: "on",
                fontSize: 14,
                fontFamily: "'Menlo', 'Monaco', 'Courier New', monospace",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                renderLineHighlight: "all",
                scrollbar: {
                  useShadows: false,
                  verticalScrollbarSize: 10,
                  horizontalScrollbarSize: 10,
                  verticalHasArrows: false,
                  horizontalHasArrows: false,
                  vertical: "visible",
                  horizontal: "visible",
                },
                readOnly: true,
              }}
              className="diff-editor-container"
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <LLMDialog 
        isOpen={showLLMDialog}
        onClose={() => setShowLLMDialog(false)}
        selectedText={selectedText}
        position={dialogPosition}
        editor={editorRef.current}
        selection={currentSelection}
      />
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleUndo} title="Undo (Ctrl+Z or Cmd+Z)">
            <Undo className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => insertMarkdown("bold")} title="Bold (Ctrl+B)">
            <Bold className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => insertMarkdown("italic")} title="Italic (Ctrl+I)">
            <Italic className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => insertMarkdown("h1")} title="Heading 1">
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => insertMarkdown("h2")} title="Heading 2">
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => insertMarkdown("h3")} title="Heading 3">
            <Heading3 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => insertMarkdown("ul")} title="Unordered List">
            <List className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => insertMarkdown("ol")} title="Ordered List">
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => insertMarkdown("code")} title="Inline Code">
            <Code className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={openLLMDialog} title="AI Assistant (Ctrl+K)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
            </svg>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTerminal}
            title="Toggle Terminal (Alt+T)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <polyline points="4 17 10 11 4 5"></polyline>
              <line x1="12" y1="19" x2="20" y2="19"></line>
            </svg>
          </Button>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowVersionHistory(true)}
              title="Version History"
            >
              <History className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (selectedTextRange && selectedDocumentId) {
                  setShowAnnotationDialog(true);
                } else {
                  toast({
                    title: "No text selected",
                    description: "Please select some text to annotate",
                    variant: "destructive"
                  });
                }
              }}
              title="Add Annotation"
            >
              <BookmarkIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowCompositionComposer(true)}
              title="Compose"
            >
              <Play className="h-4 w-4" />
            </Button>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleOpenFrontmatterDialog} 
            title="View/Edit Frontmatter"
          >
            <FileJson className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={createNewVersion}
            title="Create a snapshot of the current document"
          >
            <History className="h-4 w-4 mr-2" />
            Create Version
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSave}
            disabled={isSaving || content === selectedDocument.content}
            title="Save (Ctrl+S)"
          >
            {isSaving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        
        <TabsContent value="edit" className="flex-1 flex">
          <div className="w-full h-full border rounded-md overflow-hidden">
            {isClient && (
              <Editor
                height="100%"
                defaultLanguage="markdown"
                value={content}
                onChange={handleEditorChange}
                onMount={handleEditorDidMount}
                options={{
                  minimap: { enabled: false },
                  wordWrap: "on",
                  lineNumbers: "on",
                  fontSize: 14,
                  fontFamily: "'Menlo', 'Monaco', 'Courier New', monospace",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  renderLineHighlight: "all",
                  scrollbar: {
                    useShadows: false,
                    verticalScrollbarSize: 10,
                    horizontalScrollbarSize: 10,
                    verticalHasArrows: false,
                    horizontalHasArrows: false,
                    vertical: "visible",
                    horizontal: "visible",
                  },
                  quickSuggestions: {
                    other: true,
                    comments: true,
                    strings: true
                  },
                  suggestOnTriggerCharacters: true,
                  acceptSuggestionOnEnter: "on",
                  folding: true,
                  foldingStrategy: "indentation",
                  formatOnPaste: true,
                  formatOnType: true,
                  padding: {
                    top: 12,
                    bottom: 12
                  },
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

MarkdownEditor.displayName = "MarkdownEditor";

export default MarkdownEditor; 