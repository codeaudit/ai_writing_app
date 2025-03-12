"use client";

import { useCallback } from "react";
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

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  const { documents, selectDocument } = useDocumentStore();
  const { toast } = useToast();

  // Process internal links in the format [[Link Name]]
  const processedContent = content.replace(
    /\[\[(.*?)\]\]/g,
    (match, linkText) => `[${linkText}](#internal-link-${encodeURIComponent(linkText)})`
  );

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
          selectDocument(targetDoc.id);
          toast({
            title: "Document opened",
            description: `Navigated to "${targetDoc.name}"`,
          });
        } else {
          // Show a toast notification that the document doesn't exist
          console.log(`Document "${linkText}" not found`);
          toast({
            title: "Link Error",
            description: `Document "${linkText}" not found`,
            variant: "destructive"
          });
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
    [documents, selectDocument, toast]
  );

  return (
    <div className={`prose dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeRaw, rehypeSanitize]}
        components={{
          a: ({ node, ...props }) => (
            <a {...props} onClick={handleLinkClick} />
          ),
          code: ({ node, inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || "");
            return !inline && match ? (
              <SyntaxHighlighter
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
        {processedContent}
      </ReactMarkdown>
    </div>
  );
} 