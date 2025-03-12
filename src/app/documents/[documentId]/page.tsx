import { Suspense } from 'react';
import DocumentClientRedirect from './client';

interface DocumentPageProps {
  params: Promise<{
    documentId: string;
  }>;
}

export default async function DocumentPage({ params }: DocumentPageProps) {
  // Await the params object before accessing its properties
  const resolvedParams = await params;
  const { documentId } = resolvedParams;
  
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DocumentClientRedirect documentId={documentId} />
    </Suspense>
  );
} 