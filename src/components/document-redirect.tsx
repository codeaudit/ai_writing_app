"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDocumentStore } from "@/lib/store";

interface DocumentRedirectProps {
  documentId: string;
}

export default function DocumentRedirect({ documentId }: DocumentRedirectProps) {
  const router = useRouter();
  const { selectDocument, documents } = useDocumentStore();

  useEffect(() => {
    // Check if the document exists
    const documentExists = documents.some(doc => doc.id === documentId);
    
    if (documentExists) {
      // Select the document
      selectDocument(documentId);
      // Redirect to home page (which will show the selected document)
      router.push("/");
    } else {
      // If document doesn't exist, redirect to home
      router.push("/");
    }
  }, [documentId, documents, router, selectDocument]);

  // This component is just a redirect handler, so we don't need to render anything
  return null;
} 