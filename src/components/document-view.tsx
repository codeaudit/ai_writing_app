import { useDocumentStore } from "@/lib/store";
import { MDXRenderer } from "./mdx-renderer";
import { MDXBundlerRenderer } from "./mdx-bundler-renderer";
import { useState, useEffect } from "react";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { isScreenshotMode } from "@/lib/screenshot-mode";
import { PencilIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DocumentEditor } from "./document-editor";

export function DocumentView({ documentId, editable = true }: { documentId: string, editable?: boolean }) {
  const { documents, documentContent, loadDocumentContent } = useDocumentStore();
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  
  const document = documents.find(d => d.id === documentId);
  const isMdxFile = document?.name.endsWith('.mdx') || false;
  
  useEffect(() => {
    if (documentId) {
      setIsLoading(true);
      loadDocumentContent(documentId).then((content) => {
        setContent(content);
        setIsLoading(false);
      });
    }
  }, [documentId, loadDocumentContent]);
  
  if (!document) {
    return <div className="p-4">Document not found</div>;
  }
  
  const screenshotMode = isScreenshotMode();
  
  return (
    <div className="document-view h-full flex flex-col">
      <div className={cn("document-header flex justify-between items-center px-6 py-3 border-b", {
        "hidden": screenshotMode
      })}>
        <h1 className="text-xl font-semibold truncate">{document.name}</h1>
        {editable && (
          <Button variant="ghost" size="icon" className="ml-2" asChild>
            <Link href={`/documents/${documentId}/edit`}>
              <PencilIcon className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
      
      <ScrollArea className="flex-1 p-6">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {isMdxFile ? (
              <MDXBundlerRenderer content={content} />
            ) : (
              <MDXRenderer content={content} />
            )}
          </>
        )}
      </ScrollArea>
    </div>
  );
} 