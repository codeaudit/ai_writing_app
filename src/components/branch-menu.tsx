"use client";

import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { ChatMessageNode as MessageNode } from '@/lib/store';

interface BranchMenuProps {
  currentBranchIndex: number;
  branchCount: number;
  allBranchIds: string[];
  chatNodes: Record<string, MessageNode>;
  currentBranchId: string;
  onBranchSelect: (branchId: string) => void;
}

// Helper function to get a preview of content
function getPreview(text: string | undefined, maxLength = 60): string {
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

export function BranchMenu({
  currentBranchIndex,
  branchCount,
  allBranchIds,
  chatNodes,
  currentBranchId,
  onBranchSelect
}: BranchMenuProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <DropdownMenu>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 p-1 text-[10px] hover:bg-primary/5"
              >
                Response {currentBranchIndex + 1}/{branchCount}
                <ChevronDown className="ml-1 h-2.5 w-2.5" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          
          <TooltipContent side="top" className="text-xs">
            View and switch between different AI responses
          </TooltipContent>
          
          <DropdownMenuContent 
            align="start" 
            className="w-64 max-h-[300px] overflow-auto"
          >
            <DropdownMenuLabel className="text-xs flex items-center justify-between">
              <span>Alternate Responses</span>
              <Badge variant="outline" className="text-[10px]">
                {branchCount} versions
              </Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {allBranchIds.map((branchId, idx) => {
              const branch = chatNodes[branchId];
              if (!branch) return null;
              
              const isCurrentBranch = branchId === currentBranchId;
              const response = branch.childrenIds?.[0] 
                ? chatNodes[branch.childrenIds[0]] 
                : null;
              
              return (
                <DropdownMenuItem 
                  key={branchId}
                  onSelect={(e) => {
                    e.preventDefault();
                    if (!isCurrentBranch) onBranchSelect(branchId);
                  }}
                  disabled={isCurrentBranch}
                  className={cn(
                    "text-xs py-2 cursor-pointer",
                    isCurrentBranch && "font-medium bg-primary/10",
                    !isCurrentBranch && "hover:bg-primary/5"
                  )}
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Response {idx + 1}</span>
                      {isCurrentBranch && (
                        <Badge variant="secondary" className="text-[10px]">
                          Current
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-[10px] text-muted-foreground space-y-2">
                      <div className="flex gap-1.5 items-start">
                        <Badge variant="outline" className="text-[9px] mt-0.5 shrink-0">
                          You
                        </Badge>
                        <div className="line-clamp-2">
                          {getPreview(branch.content)}
                        </div>
                      </div>
                      {response?.content && (
                        <div className="flex gap-1.5 items-start">
                          <Badge variant="outline" className="text-[9px] mt-0.5 shrink-0 bg-primary/5">
                            AI
                          </Badge>
                          <div className="line-clamp-2">
                            {getPreview(response.content)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </Tooltip>
    </TooltipProvider>
  );
} 