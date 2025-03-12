"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useDocumentStore, Annotation } from "@/lib/store";
import { X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AnnotationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  initialAnnotation?: Annotation;
  selectionRange?: { startOffset: number; endOffset: number; selectedText: string };
}

export function AnnotationDialog({
  open,
  onOpenChange,
  documentId,
  initialAnnotation,
  selectionRange,
}: AnnotationDialogProps) {
  const { addAnnotation, updateAnnotation } = useDocumentStore();
  const [content, setContent] = useState("");
  const [color, setColor] = useState("yellow");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [selectedText, setSelectedText] = useState("");
  
  // Reset form when dialog opens or initialAnnotation changes
  useEffect(() => {
    if (initialAnnotation) {
      setContent(initialAnnotation.content);
      setColor(initialAnnotation.color);
      setTags(initialAnnotation.tags);
    } else {
      setContent("");
      setColor("yellow");
      setTags([]);
    }
    
    if (selectionRange) {
      setSelectedText(selectionRange.selectedText);
    }
  }, [initialAnnotation, selectionRange, open]);
  
  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };
  
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };
  
  const handleSubmit = async () => {
    if (!content.trim()) return;
    
    if (initialAnnotation) {
      // Update existing annotation
      await updateAnnotation(initialAnnotation.id, {
        content,
        color,
        tags,
        updatedAt: new Date(),
      });
    } else if (selectionRange) {
      // Create new annotation
      await addAnnotation(
        documentId,
        selectionRange.startOffset,
        selectionRange.endOffset,
        content,
        color,
        tags
      );
    }
    
    onOpenChange(false);
  };
  
  const colorOptions = [
    { value: "red", label: "Red", class: "bg-red-500" },
    { value: "blue", label: "Blue", class: "bg-blue-500" },
    { value: "green", label: "Green", class: "bg-green-500" },
    { value: "yellow", label: "Yellow", class: "bg-yellow-500" },
    { value: "purple", label: "Purple", class: "bg-purple-500" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialAnnotation ? "Edit Annotation" : "Add Annotation"}</DialogTitle>
          <DialogDescription>
            {initialAnnotation 
              ? "Update your annotation details below." 
              : "Add a note to the selected text."}
          </DialogDescription>
        </DialogHeader>
        
        {selectedText && (
          <div className="bg-muted p-3 rounded-md text-sm italic mb-4">
            "{selectedText}"
          </div>
        )}
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="annotation-content">Note</Label>
            <Textarea
              id="annotation-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter your annotation..."
              className="resize-none"
              rows={4}
            />
          </div>
          
          <div className="grid gap-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              {colorOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`w-8 h-8 rounded-full ${option.class} ${
                    color === option.value ? "ring-2 ring-offset-2 ring-black" : ""
                  }`}
                  title={option.label}
                  onClick={() => setColor(option.value)}
                />
              ))}
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="annotation-tags">Tags</Label>
            <div className="flex gap-2">
              <Input
                id="annotation-tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add tags..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button type="button" size="icon" onClick={handleAddTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-1 mt-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {initialAnnotation ? "Update" : "Add"} Annotation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 