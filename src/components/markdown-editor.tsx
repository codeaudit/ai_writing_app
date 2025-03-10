"use client";

import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";
import 'highlight.js/styles/github-dark.css';
import { Bold, Italic, List, ListOrdered, Heading1, Heading2, Heading3, Code, Save, FileDown, X, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDocumentStore } from "@/lib/store";
import Editor, { OnMount, useMonaco, DiffEditor } from "@monaco-editor/react";
import { editor } from "monaco-editor";
import { useTheme } from "next-themes";
import { VersionHistory } from "./version-history";
import { useToast } from "@/components/ui/use-toast";
import { formatDistanceToNow } from "date-fns";
import { LLMDialog } from "./llm-dialog";

interface MarkdownEditorProps {}

// Export the component with forwardRef to expose methods to the parent
const MarkdownEditor = forwardRef<
  { compareDocuments: (doc1Id: string, doc2Id: string) => void },
  MarkdownEditorProps
>((props, ref) => {
  const { documents, selectedDocumentId, updateDocument } = useDocumentStore();
  const [content, setContent] = useState("");
  const [activeTab, setActiveTab] = useState("edit");
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(true);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monaco = useMonaco();
  const { theme } = useTheme();
  const [editorTheme, setEditorTheme] = useState<string>("vs-dark");
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  
  // Diff viewer state
  const [showDiff, setShowDiff] = useState(false);
  const [diffOriginal, setDiffOriginal] = useState("");
  const [diffModified, setDiffModified] = useState("");
  const [diffOriginalTitle, setDiffOriginalTitle] = useState("");
  const [diffModifiedTitle, setDiffModifiedTitle] = useState("");

  const [showLLMDialog, setShowLLMDialog] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [dialogPosition, setDialogPosition] = useState<{ x: number; y: number } | null>(null);

  // Get the selected document
  const selectedDocument = documents.find(doc => doc.id === selectedDocumentId);

  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    compareDocuments: (doc1Id: string, doc2Id: string) => {
      const doc1 = documents.find(doc => doc.id === doc1Id);
      const doc2 = documents.find(doc => doc.id === doc2Id);
      
      if (doc1 && doc2) {
        handleShowDiff(
          doc1.content,
          doc2.content,
          doc1.name,
          doc2.name
        );
      }
    }
  }));

  // Update editor theme when app theme changes
  useEffect(() => {
    setEditorTheme(theme === "light" ? "vs" : "vs-dark");
  }, [theme]);

  // Configure Monaco Editor
  useEffect(() => {
    if (monaco) {
      // Add custom keyboard shortcuts
      monaco.editor.addKeybindingRules([
        {
          keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
          command: "editor.action.customSave",
          when: "editorTextFocus"
        },
        {
          keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK,
          command: "editor.action.showLLMDialog",
          when: "editorTextFocus"
        }
      ]);
    }
  }, [monaco]);

  useEffect(() => {
    if (selectedDocument) {
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
    monaco.editor.registerCommand("editor.action.customSave", () => {
      handleSave();
    });

    monaco.editor.registerCommand("editor.action.showLLMDialog", () => {
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
          const y = editorRect.top + selectionCoords.top;

          setDialogPosition({ x, y });
          setSelectedText(selectedText);
          setShowLLMDialog(true);
        }
      }
    });
    
    // Add markdown syntax highlighting
    editor.onDidChangeModelContent(() => {
      const model = editor.getModel();
      if (model) {
        // This would be where you could add custom tokenization if needed
      }
    });
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setContent(value);
    }
  };

  const handleSave = useCallback(() => {
    if (selectedDocumentId && selectedDocument && content !== selectedDocument.content) {
      setIsSaving(true);
      
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
    }
  }, [selectedDocumentId, content, selectedDocument, updateDocument, toast]);

  const downloadMarkdown = () => {
    if (!selectedDocument) return;
    
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedDocument.name}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Show toast notification
    toast({
      title: "Document exported",
      description: `${selectedDocument.name}.md has been downloaded.`,
    });
  };

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

    editor.executeEdits("markdown-formatting", [
      {
        range: selection,
        text: newText,
        forceMoveMarkers: true
      }
    ]);
    
    editor.focus();
  };

  const createNewVersion = () => {
    if (!selectedDocumentId || !selectedDocument) return;
    
    // Create a new version with the current content and automatic timestamp
    const timestamp = new Date();
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

  if (!selectedDocumentId || !selectedDocument) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-6 max-w-md text-center">
          <h2 className="text-xl font-semibold mb-2">No Document Selected</h2>
          <p className="text-muted-foreground">Select a document from the sidebar or create a new one.</p>
        </Card>
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
        
        <div className="flex-1 border rounded-md overflow-hidden">
          <DiffEditor
            height="100%"
            language="markdown"
            original={diffOriginal}
            modified={diffModified}
            theme={editorTheme}
            options={{
              readOnly: true,
              renderSideBySide: true,
              originalEditable: false,
              minimap: { enabled: false },
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: "on",
              diffWordWrap: "on",
              renderOverviewRuler: false,
              renderIndicators: true,
              renderMarginRevertIcon: true,
              ignoreTrimWhitespace: false,
            }}
          />
        </div>
        
        <div className="flex justify-between mt-4 text-sm text-muted-foreground">
          <div>{diffOriginalTitle}</div>
          <div>{diffModifiedTitle}</div>
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
      />
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
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
            onClick={downloadMarkdown}
            title="Download Markdown"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Export
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
              }}
              theme={editorTheme}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="preview" className="flex-1 overflow-auto">
          <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none p-4">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]} 
              rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeHighlight]}
              components={{
                h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-6 mb-4" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-5 mb-3" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-lg font-bold mt-4 mb-2" {...props} />,
                p: ({node, ...props}) => <p className="my-3" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc pl-6 my-3" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal pl-6 my-3" {...props} />,
                li: ({node, ...props}) => <li className="my-1" {...props} />,
                blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-300 dark:border-gray-700 pl-4 italic my-3" {...props} />,
                code: ({node, className, children, ...props}: any) => {
                  const match = /language-(\w+)/.exec(className || '');
                  const isInline = !match && (props as any).inline;
                  
                  if (isInline) {
                    return <code className="bg-gray-200 dark:bg-gray-800 px-1 py-0.5 rounded text-sm" {...props}>{children}</code>;
                  }
                  
                  return (
                    <pre className="bg-gray-200 dark:bg-gray-800 p-3 rounded overflow-auto">
                      <code className={className} {...props}>{children}</code>
                    </pre>
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
});

MarkdownEditor.displayName = "MarkdownEditor";

export default MarkdownEditor; 