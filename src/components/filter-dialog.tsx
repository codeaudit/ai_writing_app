"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { saveFilterToServer, loadFilterFromServer } from "@/lib/api-service";
import { validatePatterns } from "@/lib/filter-utils";

interface FilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFilterChange: (filter: FilterConfig) => void;
}

export interface FilterConfig {
  enabled: boolean;
  patterns: string[];
}

export function FilterDialog({ open, onOpenChange, onFilterChange }: FilterDialogProps) {
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({
    enabled: false,
    patterns: [],
  });
  const [filterText, setFilterText] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  // Load filter config when dialog opens
  useEffect(() => {
    if (open) {
      loadFilterConfig();
      setValidationErrors([]);
    }
  }, [open]);
  
  const loadFilterConfig = async () => {
    try {
      const config = await loadFilterFromServer();
      if (config) {
        setFilterConfig(config);
        setFilterText(config.patterns.join('\n'));
      }
    } catch (error) {
      console.error("Error loading filter config:", error);
      toast({
        title: "Error loading filter",
        description: "Failed to load filter configuration.",
        variant: "destructive",
      });
    }
  };
  
  const validateFilterText = () => {
    // Parse filter text into array of patterns
    const patterns = filterText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#')); // Skip empty lines and comments
    
    // Validate patterns
    const errors = validatePatterns(patterns);
    setValidationErrors(errors);
    
    return errors.length === 0;
  };
  
  const saveFilterConfig = async () => {
    try {
      // Validate patterns first
      if (!validateFilterText()) {
        return; // Don't save if there are validation errors
      }
      
      // Parse filter text into array of patterns
      const patterns = filterText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#')); // Skip empty lines and comments
      
      const newConfig: FilterConfig = {
        ...filterConfig,
        patterns,
      };
      
      await saveFilterToServer(newConfig);
      setFilterConfig(newConfig);
      onFilterChange(newConfig);
      
      toast({
        title: "Filter saved",
        description: "Document filter has been updated.",
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving filter config:", error);
      toast({
        title: "Error saving filter",
        description: "Failed to save filter configuration.",
        variant: "destructive",
      });
    }
  };
  
  const toggleFilter = (enabled: boolean) => {
    setFilterConfig(prev => ({ ...prev, enabled }));
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Document Filter</DialogTitle>
          <DialogDescription>
            Configure which documents to show in the navigator using GitIgnore-style patterns.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="filter-enabled" className="text-sm font-medium">
                Apply Filter
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                When enabled, the patterns below will be applied to filter the document view.
                When disabled, all documents will be shown (filter patterns are ignored).
              </p>
            </div>
            <Switch
              id="filter-enabled"
              checked={filterConfig.enabled}
              onCheckedChange={toggleFilter}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="filter-patterns" className="text-sm font-medium">
              Filter Patterns
            </Label>
            <Textarea
              id="filter-patterns"
              placeholder="# Enter one pattern per line
# Examples:
*.md         # Include only markdown files
!templates/  # Show the templates directory (negate exclusion)
notes/       # Hide the notes directory
docs/**/*.md # Include markdown files in docs directory and subdirectories
!important/* # Keep files in the important directory visible"
              className="h-[250px] font-mono text-sm"
              value={filterText}
              onChange={(e) => {
                setFilterText(e.target.value);
                setValidationErrors([]);
              }}
            />
            
            {validationErrors.length > 0 && (
              <div className="text-xs text-destructive space-y-1 mt-1">
                <p><strong>Pattern Errors:</strong></p>
                <ul className="list-disc pl-5">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="text-xs text-muted-foreground space-y-2">
              <p><strong>Pattern Format:</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li><code>pattern</code> - Include only files matching the pattern</li>
                <li><code>!pattern</code> - Exclude files matching the pattern (show them)</li>
                <li><code>dir/</code> - Hide a directory and all its contents</li>
                <li><code>*</code> - Wildcard (matches any characters except /)</li>
                <li><code>**</code> - Matches any directory depth</li>
                <li><code>/pattern</code> - Pattern applies only at root level</li>
                <li><code>[abc]</code> - Character class (matches a, b, or c)</li>
                <li><code>[a-z]</code> - Character range (matches a through z)</li>
              </ul>
              <p><strong>To hide a directory:</strong> Simply add the directory name followed by a slash: <code>directory_name/</code></p>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={saveFilterConfig}>
            Save Filter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
