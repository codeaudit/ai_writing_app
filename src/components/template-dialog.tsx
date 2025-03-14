"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchTemplates, processTemplate } from "@/lib/api-service";
import { useDocumentStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId?: string | null;
}

export function TemplateDialog({ open, onOpenChange, folderId = null }: TemplateDialogProps) {
  const [templates, setTemplates] = useState<{ name: string; path: string }[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [documentName, setDocumentName] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { addDocument } = useDocumentStore();
  const router = useRouter();

  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const templateList = await fetchTemplates();
      setTemplates(templateList);
      
      // Set default template if available
      if (templateList.length > 0) {
        setSelectedTemplate(templateList[0].name);
      }
    } catch (error) {
      console.error("Error loading templates:", error);
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDocument = async () => {
    if (!documentName.trim()) {
      toast({
        title: "Error",
        description: "Document name is required",
        variant: "destructive",
      });
      return;
    }

    if (!selectedTemplate) {
      toast({
        title: "Error",
        description: "Please select a template",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Process the template with variables
      const variables = {
        title: documentName,
        date: new Date().toISOString(),
        time: new Date().toLocaleTimeString(),
      };
      
      const content = await processTemplate(selectedTemplate, variables);
      
      // Create the document
      const newDocId = await addDocument(documentName, content, folderId);
      
      // Close the dialog
      onOpenChange(false);
      
      // Navigate to the new document
      router.push(`/documents/${newDocId}`);
      
      toast({
        title: "Success",
        description: `Document "${documentName}" created from template "${selectedTemplate}"`,
      });
    } catch (error) {
      console.error("Error creating document from template:", error);
      toast({
        title: "Error",
        description: "Failed to create document from template",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Document from Template</DialogTitle>
          <DialogDescription>
            Select a template and provide a name for your new document.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              className="col-span-3"
              placeholder="Document name"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="template" className="text-right">
              Template
            </Label>
            <Select
              value={selectedTemplate}
              onValueChange={setSelectedTemplate}
              disabled={templates.length === 0 || isLoading}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.name} value={template.name}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateDocument} disabled={isLoading}>
            {isLoading ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 