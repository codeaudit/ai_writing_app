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
  
  // Load filter config when dialog opens
  useEffect(() => {
    if (open) {
      loadFilterConfig();
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
  
  const saveFilterConfig = async () => {
    try {
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Document Filter</DialogTitle>
          <DialogDescription>
            Configure which documents to show in the navigator using Git-style filter patterns.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="filter-enabled" className="text-sm font-medium">
              Filter Enabled
            </Label>
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
*.md         # Include all markdown files
!templates/* # Exclude templates directory
docs/*.md    # Include markdown files in docs directory"
              className="h-[200px] font-mono text-sm"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Each line is a pattern. Use * as wildcard, ! to negate a pattern.
              Lines starting with # are comments.
            </p>
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
