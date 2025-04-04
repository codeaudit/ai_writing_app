"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote';
import { useDocumentStore } from "@/lib/store";
import { useToast } from "@/components/ui/use-toast";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.css";
import { bundleMDXContent } from "@/lib/mdx-bundler-server";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

// Define custom components that can be used in MDX
interface MDXComponentProps {
  children?: React.ReactNode;
  className?: string;
  [key: string]: unknown;
}

// Define all MDX components
const components = {
  // Basic HTML components
  h1: ({ children, ...props }: MDXComponentProps) => <h1 className="text-3xl font-bold mb-4" {...props}>{children}</h1>,
  h2: ({ children, ...props }: MDXComponentProps) => <h2 className="text-2xl font-bold mb-3" {...props}>{children}</h2>,
  h3: ({ children, ...props }: MDXComponentProps) => <h3 className="text-xl font-bold mb-2" {...props}>{children}</h3>,
  p: ({ children, ...props }: MDXComponentProps) => <p className="mb-4" {...props}>{children}</p>,
  ul: ({ children, ...props }: MDXComponentProps) => <ul className="list-disc ml-5 mb-4" {...props}>{children}</ul>,
  ol: ({ children, ...props }: MDXComponentProps) => <ol className="list-decimal ml-5 mb-4" {...props}>{children}</ol>,
  blockquote: ({ children, ...props }: MDXComponentProps) => (
    <blockquote className="border-l-4 border-gray-300 pl-4 italic" {...props}>{children}</blockquote>
  ),
  code: ({ className, children, ...rest }: MDXComponentProps) => {
    const match = /language-(\w+)/.exec(className || "");
    
    return match ? (
      <pre className={`${className} p-4 rounded bg-gray-800 overflow-x-auto`}>
        <code {...rest}>{children}</code>
      </pre>
    ) : (
      <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded" {...rest}>
        {children}
      </code>
    );
  },
  
  // Interactive components
  Alert: ({ children, variant = "info", ...props }: MDXComponentProps & { variant?: "info" | "warning" | "error" | "success" }) => {
    const styles = {
      info: "bg-blue-50 border-blue-400 text-blue-800",
      warning: "bg-yellow-50 border-yellow-400 text-yellow-800",
      error: "bg-red-50 border-red-400 text-red-800",
      success: "bg-green-50 border-green-400 text-green-800"
    };
    
    return (
      <div className={`${styles[variant]} border-l-4 p-4 mb-4 rounded-r`} {...props}>
        {children}
      </div>
    );
  },
  
  // Highlight component
  Highlight: ({ children, color = "yellow", ...props }: MDXComponentProps & { color?: string }) => {
    const colorMap: Record<string, string> = {
      yellow: "bg-yellow-200 dark:bg-yellow-800",
      blue: "bg-blue-200 dark:bg-blue-800",
      green: "bg-green-200 dark:bg-green-800",
      red: "bg-red-200 dark:bg-red-800",
      purple: "bg-purple-200 dark:bg-purple-800"
    };
    
    const bgColor = colorMap[color] || colorMap.yellow;
    
    return (
      <span className={`${bgColor} px-1 rounded transition-colors duration-300 hover:bg-opacity-70`} {...props}>
        {children}
      </span>
    );
  },
  
  // Box component
  Box: ({ children, className = "", ...props }: MDXComponentProps) => (
    <div className={`p-4 border rounded shadow-sm mb-4 ${className}`} {...props}>
      {children}
    </div>
  ),
  
  // Simple Button component
  SimpleButton: ({ children, onClick, ...props }: MDXComponentProps) => {
    const [isPressed, setIsPressed] = useState(false);
    
    const handleClick = (e: React.MouseEvent) => {
      setIsPressed(true);
      setTimeout(() => setIsPressed(false), 200);
      if (typeof onClick === 'function') onClick(e);
    };
    
    return (
      <button 
        className={`bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded shadow-sm transition-all duration-200 mb-4 ${isPressed ? 'transform scale-95' : ''}`} 
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>
    );
  },
  
  // Card component
  Card: ({ 
    title, 
    image, 
    bordered = false, 
    children, 
    ...props 
  }: MDXComponentProps & { title?: string; image?: string; bordered?: boolean }) => {
    const [isHovered, setIsHovered] = useState(false);
    
    return (
      <div 
        className={`overflow-hidden rounded-lg shadow-md mb-4 transition-all duration-300 ${bordered ? 'border border-gray-300' : ''} ${isHovered ? 'shadow-lg transform -translate-y-1' : ''}`} 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        {...props}
      >
        {image && (
          <div className="w-full overflow-hidden">
            <img 
              src={image} 
              alt={title || 'Card image'} 
              className={`w-full h-auto transition-transform duration-500 ${isHovered ? 'transform scale-105' : ''}`} 
            />
          </div>
        )}
        <div className="p-4">
          {title && <h3 className="text-lg font-bold mb-2">{title}</h3>}
          <div>{children}</div>
        </div>
      </div>
    );
  },
  
  // Tabs components
  Tabs: ({ children, ...props }: MDXComponentProps) => {
    const [activeTabIndex, setActiveTabIndex] = useState(0);
    const childrenArray = React.Children.toArray(children);
    
    return (
      <div className="mb-4" {...props}>
        <div className="border-b border-gray-200 mb-4">
          <div className="flex space-x-4">
            {React.Children.map(children, (child, index) => {
              if (React.isValidElement(child) && 
                  typeof child.props === 'object' && 
                  child.props !== null && 
                  'label' in child.props) {
                const label = String(child.props.label || '');
                return (
                  <button
                    onClick={() => setActiveTabIndex(index)}
                    className={`pb-2 px-1 transition-colors duration-200 ${
                      index === activeTabIndex 
                        ? 'border-b-2 border-blue-500 text-blue-600' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                );
              }
              return null;
            })}
          </div>
        </div>
        <div className="tab-content-container">
          {childrenArray[activeTabIndex]}
        </div>
      </div>
    );
  },
  
  // Tab and TabPanel components
  Tab: ({ children, ...props }: MDXComponentProps) => (
    <div className="tab-content" {...props}>
      {children}
    </div>
  ),
  
  TabPanel: ({ children, label, ...props }: MDXComponentProps & { label: string }) => (
    <div className="tab-panel" data-label={label} {...props}>
      {children}
    </div>
  ),
  
  // Call to Action component
  CallToAction: ({ children, ...props }: MDXComponentProps) => {
    const [isHovered, setIsHovered] = useState(false);
    
    return (
      <div 
        className={`bg-gradient-to-r from-purple-500 to-blue-500 text-white p-6 rounded-lg shadow-lg text-center mb-4 cursor-pointer transition-all duration-300 ${
          isHovered ? 'transform scale-105 shadow-xl' : ''
        }`} 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => alert('Action triggered!')}
        {...props}
      >
        <div className="text-xl font-bold mb-2">{children}</div>
      </div>
    );
  },
  
  // Additional components for examples
  Counter: ({ startValue = 0, ...props }: MDXComponentProps & { startValue?: number }) => {
    const [count, setCount] = useState(startValue);
    
    return (
      <div className="flex items-center space-x-4 mb-4 p-4 border rounded" {...props}>
        <button 
          onClick={() => setCount(count - 1)}
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
        >
          -
        </button>
        <span className="text-xl font-bold">{count}</span>
        <button 
          onClick={() => setCount(count + 1)}
          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
        >
          +
        </button>
      </div>
    );
  },
  
  ColorPicker: ({ defaultColor = "#000000", ...props }: MDXComponentProps & { defaultColor?: string }) => {
    const [color, setColor] = useState(defaultColor);
    
    return (
      <div className="mb-4 p-4 border rounded" {...props}>
        <div 
          className="w-full h-12 mb-2 rounded border"
          style={{ backgroundColor: color }}
        ></div>
        <div className="flex items-center space-x-2">
          <input 
            type="color" 
            value={color} 
            onChange={(e) => setColor(e.target.value)} 
            aria-label="Choose color"
            className="cursor-pointer"
          />
          <span className="font-mono">{color}</span>
        </div>
      </div>
    );
  },
  
  TwoColumnLayout: ({ children, ...props }: MDXComponentProps) => (
    <div className="flex flex-col md:flex-row gap-4 mb-4" {...props}>
      {children}
    </div>
  ),
  
  Column: ({ children, width = "50%", ...props }: MDXComponentProps & { width?: string }) => (
    <div className="flex-1" style={{ flexBasis: width }} {...props}>
      {children}
    </div>
  ),
  
  RestrictedContent: ({ children, ...props }: MDXComponentProps) => (
    <div className="bg-gray-100 dark:bg-gray-800 border-l-4 border-purple-500 p-4 rounded-r mb-4" {...props}>
      <div className="flex items-center mb-2">
        <span className="mr-2">🔒</span>
        <span className="font-bold">Restricted Content</span>
      </div>
      <div>{children}</div>
    </div>
  ),
  
  CodeEditor: ({ code, language = "javascript", ...props }: MDXComponentProps & { code: string, language?: string }) => {
    const [editorCode, setEditorCode] = useState(code);
    
    return (
      <div className="mb-4 border rounded overflow-hidden" {...props}>
        <div className="bg-gray-100 dark:bg-gray-800 p-2 border-b flex justify-between items-center">
          <span className="font-mono text-sm">{language}</span>
          <button 
            onClick={() => {
              try {
                // Just for demonstration - would not actually run in a real app
                alert('Code execution simulated: ' + editorCode);
              } catch (error) {
                alert('Error: ' + error);
              }
            }}
            className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
          >
            Run
          </button>
        </div>
        <textarea
          value={editorCode}
          onChange={(e) => setEditorCode(e.target.value)}
          className="w-full h-32 p-4 font-mono text-sm bg-gray-50 dark:bg-gray-900 focus:outline-none"
          aria-label="Code editor"
        />
      </div>
    );
  },
  
  Chart: ({ type = "bar", title, ...props }: MDXComponentProps & { type?: string, title?: string }) => (
    <div className="mb-4 p-4 border rounded bg-white dark:bg-gray-800" {...props}>
      <h3 className="text-lg font-bold mb-2">{title || `${type.charAt(0).toUpperCase() + type.slice(1)} Chart`}</h3>
      <div className="bg-gray-100 dark:bg-gray-700 h-48 rounded flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Chart visualization (placeholder)</p>
      </div>
    </div>
  ),
  
  // Supporting components for other MDX examples
  Callout: ({ children, type = "note", ...props }: MDXComponentProps & { type?: "note" | "warning" | "tip" }) => {
    const styles = {
      note: "bg-blue-50 border-blue-400 text-blue-800",
      warning: "bg-yellow-50 border-yellow-400 text-yellow-800",
      tip: "bg-green-50 border-green-400 text-green-800"
    };
    
    const iconMap = {
      note: "ℹ️",
      warning: "⚠️",
      tip: "💡"
    };
    
    return (
      <div className={`${styles[type]} border-l-4 p-4 mb-4 rounded-r`} {...props}>
        <div className="flex items-start">
          <span className="mr-2">{iconMap[type]}</span>
          <div>{children}</div>
        </div>
      </div>
    );
  },
  
  // Custom component for Kanban-related UI
  KanbanCard: ({ children, ...props }: MDXComponentProps) => (
    <div className="bg-white dark:bg-gray-700 p-3 rounded shadow border border-gray-200 dark:border-gray-600" {...props}>
      {children}
    </div>
  ),
};

interface MDXBundlerRendererProps {
  content: string;
  className?: string;
}

export function MDXBundlerRenderer({ content, className = "" }: MDXBundlerRendererProps) {
  const { documents, selectDocument, addDocument } = useDocumentStore();
  const { toast } = useToast();
  const [showCreateDocumentDialog, setShowCreateDocumentDialog] = useState(false);
  const [pendingDocument, setPendingDocument] = useState<{name: string, currentDocId: string | null}>({name: "", currentDocId: null});
  const [frontmatter, setFrontmatter] = useState<Record<string, string | number | boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [mdxSource, setMdxSource] = useState<MDXRemoteSerializeResult | null>(null);
  
  // Process and compile the MDX content on the client side
  useEffect(() => {
    async function compileMDX() {
      try {
        setIsLoading(true);
        
        // Process internal links to support wiki-style linking
        const processedContent = content.replace(
          /\[\[(.*?)\]\]/g,
          (match, linkText) => `[${linkText}](#internal-link-${encodeURIComponent(linkText)})`
        );
        
        // Use the server component to compile MDX
        const result = await bundleMDXContent(processedContent);
        
        // Update state with frontmatter and MDX source
        setFrontmatter(result.frontmatter as Record<string, string | number | boolean>);
        setMdxSource(result.mdxSource);
      } catch (error) {
        console.error("Error compiling MDX:", error);
        toast({
          title: "Error",
          description: `Failed to compile MDX content: ${error instanceof Error ? error.message : String(error)}`,
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    compileMDX();
  }, [content, toast]);
  
  // Get current document ID from store
  const { selectedDocumentId } = useDocumentStore();
  
  // Handler for creating a new document
  const handleCreateNewDocument = async () => {
    if (!pendingDocument.name) return;
    
    try {
      // Create new document in the same folder as the current document
      let folderId = null;
      
      // If we have a current document, get its folder ID
      if (pendingDocument.currentDocId) {
        const currentDoc = documents.find(doc => doc.id === pendingDocument.currentDocId);
        if (currentDoc) {
          folderId = currentDoc.folderId;
        }
      }
      
      // Create initial content with title and frontmatter
      const initialContent = `---
title: ${pendingDocument.name}
created: ${new Date().toISOString()}
---

# ${pendingDocument.name}

`;
      
      // Create the new document with the initial content
      const newDocId = await addDocument(pendingDocument.name, initialContent, folderId);
      
      // Select the new document
      selectDocument(newDocId);
      
      // Update the URL without a full page refresh
      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', `/documents/${newDocId}`);
      }
      
      toast({
        title: "Document created",
        description: `Created and navigated to "${pendingDocument.name}"`,
      });
    } catch (error) {
      console.error("Error creating document:", error);
      toast({
        title: "Error",
        description: "Failed to create document",
        variant: "destructive"
      });
    } finally {
      setShowCreateDocumentDialog(false);
    }
  };
  
  // Handle link clicks (especially internal links)
  const handleLinkClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      const href = e.currentTarget.getAttribute("href");
      
      if (!href) return;
      
      // Handle internal links in the format [[Link Name]]
      if (href.startsWith("#internal-link-")) {
        e.preventDefault();
        const linkText = decodeURIComponent(href.replace("#internal-link-", ""));
        
        // Find the document with the matching name
        const targetDoc = documents.find(doc => doc.name === linkText);
        
        if (targetDoc) {
          // Select the document
          selectDocument(targetDoc.id);
          
          // Update the URL without a full page refresh
          if (typeof window !== 'undefined') {
            window.history.pushState({}, '', `/documents/${targetDoc.id}`);
          }
          
          toast({
            title: "Document opened",
            description: `Navigated to "${targetDoc.name}"`,
          });
        } else {
          // Show dialog to create the document
          setPendingDocument({
            name: linkText,
            currentDocId: selectedDocumentId
          });
          setShowCreateDocumentDialog(true);
        }
      } 
      // Handle external links (http/https)
      else if (href.startsWith("http://") || href.startsWith("https://")) {
        // For external links, we'll open them in a new tab
        e.preventDefault();
        window.open(href, "_blank", "noopener,noreferrer");
        
        toast({
          title: "External link",
          description: "Opened external link in a new tab",
        });
      }
      // All other links will use their default behavior
    },
    [documents, selectDocument, toast, selectedDocumentId]
  );
  
  // Custom components with link handling
  const mdxComponents = {
    ...components,
    a: ({ children, href, ...props }: MDXComponentProps & { href?: string }) => (
      <a href={href} onClick={handleLinkClick} {...props}>
        {children}
      </a>
    )
  };
  
  return (
    <>
      <div className={`prose dark:prose-invert max-w-none ${className}`}>
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : mdxSource ? (
          <>
            {/* Display frontmatter title if available */}
            {frontmatter.title && !frontmatter.hideTitle && (
              <h1 className="text-3xl font-bold mb-6">{String(frontmatter.title)}</h1>
            )}
            
            {/* Display metadata if available */}
            {(frontmatter.created || frontmatter.tags) && (
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded mb-6 text-sm">
                {frontmatter.created && (
                  <div className="mb-1">
                    <span className="font-semibold">Created:</span> {String(frontmatter.created)}
                  </div>
                )}
                {frontmatter.tags && (
                  <div className="flex flex-wrap gap-1">
                    {String(frontmatter.tags).split(',').map((tag) => (
                      <span key={tag.trim()} className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded text-xs">
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Render the MDX content using next-mdx-remote */}
            <MDXRemote {...mdxSource} components={mdxComponents} />
          </>
        ) : (
          <p>Failed to render MDX content.</p>
        )}
      </div>
      
      <AlertDialog 
        open={showCreateDocumentDialog} 
        onOpenChange={setShowCreateDocumentDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create New Document</AlertDialogTitle>
            <AlertDialogDescription>
              Document &ldquo;{pendingDocument.name}&rdquo; doesn&apos;t exist. Would you like to create it?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateNewDocument}>
              Create Document
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 