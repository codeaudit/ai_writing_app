"use client";

import { useEffect } from "react";
import { useDocumentStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "lucide-react";

interface BacklinksProps {
  documentId: string;
}

export function Backlinks({ documentId }: BacklinksProps) {
  const { backlinks, loadBacklinks, selectDocument } = useDocumentStore();

  useEffect(() => {
    if (documentId) {
      loadBacklinks(documentId);
    }
  }, [documentId, loadBacklinks]);

  if (!backlinks || backlinks.length === 0) {
    return null;
  }

  return (
    <Card className="mt-4">
      <CardHeader className="py-2">
        <CardTitle className="text-sm font-medium flex items-center">
          <Link className="h-4 w-4 mr-2" />
          Backlinks
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2">
        <ul className="space-y-1">
          {backlinks.map((link) => (
            <li key={link.id}>
              <Button
                variant="link"
                className="p-0 h-auto text-sm"
                onClick={() => selectDocument(link.id)}
              >
                {link.name}
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
} 