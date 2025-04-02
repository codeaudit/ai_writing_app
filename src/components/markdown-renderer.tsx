"use client";

import { useCallback, useState } from "react";
import { useDocumentStore } from "@/lib/store";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import "katex/dist/katex.min.css";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { useToast } from "@/components/ui/use-toast";
import matter from "gray-matter";
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

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  const { documents, selectDocument, addDocument } = useDocumentStore();
  const { toast } = useToast();
  const [showCreateDocumentDialog, setShowCreateDocumentDialog] = useState(false);
  const [pendingDocument, setPendingDocument] = useState<{name: string, currentDocId: string | null}>({name: "", currentDocId: null});

  // Strip frontmatter before rendering
  const stripFrontmatter = (content: string) => {
    try {
      // Use gray-matter to parse the content and extract the body without frontmatter
      const { content: bodyContent } = matter(content);
      return bodyContent;
    } catch (error) {
      console.error("Error parsing frontmatter:", error);
      return content;
    }
  };

  // Process the content to remove frontmatter and process internal links
  const processedContent = useCallback((rawContent: string) => {
    // First strip frontmatter
    const contentWithoutFrontmatter = stripFrontmatter(rawContent);
    
    // Then process internal links
    return contentWithoutFrontmatter.replace(
      /\[\[(.*?)\]\]/g,
      (match, linkText) => `[${linkText}](#internal-link-${encodeURIComponent(linkText)})`
    );
  }, []);

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
      
      // Select the new document without navigating
      selectDocument(newDocId);
      
      // Update the URL without a full page refresh
      // Use replaceState to change the URL without causing a navigation/refresh
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

  // Handle internal link clicks
  const handleLinkClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      const href = e.currentTarget.getAttribute("href");
      console.log("Link clicked:", href);
      
      if (!href) return;
      
      // Handle internal links in the format [[Link Name]]
      if (href.startsWith("#internal-link-")) {
        e.preventDefault();
        const linkText = decodeURIComponent(href.replace("#internal-link-", ""));
        console.log("Internal link detected:", linkText);
        
        // Find the document with the matching name
        const targetDoc = documents.find(doc => doc.name === linkText);
        console.log("Target document found:", targetDoc);
        
        if (targetDoc) {
          console.log("Selecting document:", targetDoc.id);
          // Select the document without navigating
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
    [documents, selectDocument, toast, selectedDocumentId, addDocument]
  );

  return (
    <>
      <div className={`prose dark:prose-invert max-w-none ${className}`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex, rehypeRaw, rehypeSanitize]}
          components={{
            a: (props) => (
              <a {...props} onClick={handleLinkClick} />
            ),
            code: function CodeBlock({ className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || "");
              return match ? (
                <SyntaxHighlighter
                  // @ts-expect-error - SyntaxHighlighter prop types are incompatible
                  style={vscDarkPlus}
                  language={match[1]}
                  PreTag="div"
                  {...props}
                >
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
          }}
        >
          {processedContent(content)}
        </ReactMarkdown>
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