"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDocumentStore, Annotation } from "@/lib/store";
import { Search, Tag, Clock, Trash2, Edit, ExternalLink, BookmarkIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { AnnotationDialog } from "./annotation-dialog";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { X } from "lucide-react";

interface AnnotationsNavigatorProps {
  onNavigateToAnnotation?: (documentId: string, annotation: Annotation) => void;
}

// Extended annotation type that includes document name
interface AnnotationWithDocument extends Annotation {
  documentName: string;
}

export default function AnnotationsNavigator({
  onNavigateToAnnotation,
}: AnnotationsNavigatorProps) {
  const { documents, deleteAnnotation, searchAnnotations } = useDocumentStore();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [filteredAnnotations, setFilteredAnnotations] = useState<(Annotation & { documentName: string })[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [editAnnotation, setEditAnnotation] = useState<Annotation | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  // Calculate all annotations once for UI display
  const allAnnotations = documents.flatMap(doc => {
    // Ensure annotations is an array, even if it's undefined
    const annotations = Array.isArray(doc.annotations) ? doc.annotations : [];
    return annotations.map(anno => ({
      ...anno,
      documentName: doc.name
    }));
  });
  
  // Get all unique tags
  const allTags = Array.from(
    new Set(allAnnotations.flatMap(anno => Array.isArray(anno.tags) ? anno.tags : []))
  ).sort();
  
  // Filter annotations based on search query and selected tags
  useEffect(() => {
    let filtered: AnnotationWithDocument[] = [];
    
    // Filter by search query
    if (searchQuery) {
      // Get search results
      const searchResults = searchAnnotations(searchQuery) as AnnotationWithDocument[];
      filtered = searchResults;
    } else {
      // If no search query, get all annotations
      filtered = documents.flatMap(doc => {
        const docAnnotations = Array.isArray(doc.annotations) ? doc.annotations : [];
        return docAnnotations.map(anno => ({
          ...anno,
          documentName: doc.name
        }));
      });
    }
    
    // Filter by selected tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(anno => {
        // Ensure tags is an array
        const tags = Array.isArray(anno.tags) ? anno.tags : [];
        return selectedTags.some(tag => tags.includes(tag));
      });
    }
    
    // Filter by tab
    if (activeTab === "recent") {
      // Sort by date (newest first) and take the 10 most recent
      filtered = [...filtered].sort((a, b) => {
        // Handle undefined updatedAt values
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
      }).slice(0, 10);
    }
    
    setFilteredAnnotations(filtered);
  }, [searchQuery, selectedTags, activeTab, documents, searchAnnotations]);
  
  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };
  
  const handleDeleteAnnotation = async (id: string) => {
    if (!id) {
      console.warn("Cannot delete annotation with undefined id");
      return;
    }
    
    if (confirm("Are you sure you want to delete this annotation?")) {
      try {
        await deleteAnnotation(id);
        // Update the filtered annotations to remove the deleted annotation
        setFilteredAnnotations(prev => prev.filter(anno => anno.id !== id));
      } catch (error) {
        console.error("Error deleting annotation:", error);
      }
    }
  };
  
  const handleEditAnnotation = (annotation: Annotation) => {
    // Make sure all required properties are present
    const safeAnnotation: Annotation = {
      id: annotation.id || `anno-${Date.now()}`,
      documentId: annotation.documentId || '',
      startOffset: annotation.startOffset || 0,
      endOffset: annotation.endOffset || 0,
      content: annotation.content || '',
      color: annotation.color || '',
      createdAt: annotation.createdAt || new Date(),
      updatedAt: annotation.updatedAt || new Date(),
      tags: Array.isArray(annotation.tags) ? annotation.tags : []
    };
    
    setEditAnnotation(safeAnnotation);
    setShowEditDialog(true);
  };
  
  // Handle navigation to annotation with URL update
  const handleNavigateToAnnotation = (documentId: string, annotation: Annotation) => {
    if (onNavigateToAnnotation) {
      onNavigateToAnnotation(documentId, annotation);
      // Remove the router.push call to prevent tab switching
      // router.push(`/documents/${documentId}`);
    }
  };

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="flex items-center space-x-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search annotations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        
        {allAnnotations.length === 0 ? (
          <div className="flex items-center justify-center h-full border rounded-md p-6 text-center">
            <div>
              <h3 className="text-lg font-medium mb-2">No Annotations Found</h3>
              <p className="text-muted-foreground">
                You haven't created any annotations yet. Select text in a document and click the bookmark icon to create one.
              </p>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="mb-2">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="recent">Recent</TabsTrigger>
              <TabsTrigger value="tags">Tags</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="flex-1 flex flex-col p-0">
              <ScrollArea className="flex-1">
                {filteredAnnotations.length > 0 ? (
                  <div className="space-y-2">
                    {filteredAnnotations.map((anno) => (
                      <AnnotationCard
                        key={anno.id || `anno-${Math.random()}`}
                        annotation={anno}
                        onDelete={() => anno.id ? handleDeleteAnnotation(anno.id) : null}
                        onEdit={() => handleEditAnnotation(anno)}
                        onNavigate={() => handleNavigateToAnnotation(anno.documentId, anno)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No annotations found</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="recent" className="flex-1 flex flex-col p-0">
              <ScrollArea className="flex-1">
                {filteredAnnotations.length > 0 ? (
                  <div className="space-y-2">
                    {filteredAnnotations.map((anno) => (
                      <AnnotationCard
                        key={anno.id || `anno-${Math.random()}`}
                        annotation={anno}
                        onDelete={() => anno.id ? handleDeleteAnnotation(anno.id) : null}
                        onEdit={() => handleEditAnnotation(anno)}
                        onNavigate={() => handleNavigateToAnnotation(anno.documentId, anno)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No recent annotations</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="tags" className="flex-1 flex flex-col p-0">
              <div className="flex flex-wrap gap-1 mb-2">
                {allTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleTagToggle(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
                {allTags.length === 0 && (
                  <p className="text-muted-foreground">No tags found</p>
                )}
              </div>
              
              <ScrollArea className="flex-1">
                {filteredAnnotations.length > 0 ? (
                  <div className="space-y-2">
                    {filteredAnnotations.map((anno) => (
                      <AnnotationCard
                        key={anno.id || `anno-${Math.random()}`}
                        annotation={anno}
                        onDelete={() => anno.id ? handleDeleteAnnotation(anno.id) : null}
                        onEdit={() => handleEditAnnotation(anno)}
                        onNavigate={() => handleNavigateToAnnotation(anno.documentId, anno)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No annotations with selected tags</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </div>
      
      {showEditDialog && editAnnotation && (
        <AnnotationDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          documentId={editAnnotation.documentId || ''}
          initialAnnotation={editAnnotation}
        />
      )}
    </>
  );
}

interface AnnotationCardProps {
  annotation: Annotation & { documentName: string };
  onDelete: () => void;
  onEdit: () => void;
  onNavigate: () => void;
}

function AnnotationCard({ annotation, onDelete, onEdit, onNavigate }: AnnotationCardProps) {
  const colorClasses = {
    "red": "border-red-500",
    "blue": "border-blue-500",
    "green": "border-green-500",
    "yellow": "border-yellow-500",
    "purple": "border-purple-500",
    "": "border-gray-500", // default
  };

  const colorClass = colorClasses[(annotation.color || "") as keyof typeof colorClasses] || colorClasses[""];

  return (
    <div className={`p-2 border rounded-md border-l-4 ${colorClass} bg-card text-sm hover:bg-muted cursor-pointer`} onClick={onNavigate}>
      <div className="flex justify-between items-start mb-1">
        <h4 className="font-medium text-xs truncate">{annotation.documentName || 'Unknown Document'}</h4>
        <div className="flex space-x-1">
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onEdit(); }} title="Edit annotation" className="h-6 w-6">
            <Edit className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Delete annotation" className="h-6 w-6">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      <p className="text-xs mb-1 line-clamp-2">{annotation.content || 'No content'}</p>
      
      {Array.isArray(annotation.tags) && annotation.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1">
          {annotation.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px] px-1 py-0">
              {tag}
            </Badge>
          ))}
          {annotation.tags.length > 3 && (
            <Badge variant="outline" className="text-[10px] px-1 py-0">
              +{annotation.tags.length - 3}
            </Badge>
          )}
        </div>
      )}
      
      <div className="flex items-center text-[10px] text-muted-foreground">
        <Clock className="h-2 w-2 mr-1" />
        {annotation.updatedAt ? 
          formatDistanceToNow(new Date(annotation.updatedAt), { addSuffix: true }) : 
          'Unknown date'
        }
      </div>
    </div>
  );
} 