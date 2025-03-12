"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Annotation } from "@/lib/store";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface AnnotationMarkerProps {
  annotation: Annotation;
  onClick?: () => void;
  className?: string;
}

export function AnnotationMarker({ annotation, onClick, className }: AnnotationMarkerProps) {
  const colorClasses = {
    "red": "bg-red-100 border-red-500 text-red-800 hover:bg-red-200",
    "blue": "bg-blue-100 border-blue-500 text-blue-800 hover:bg-blue-200",
    "green": "bg-green-100 border-green-500 text-green-800 hover:bg-green-200",
    "yellow": "bg-yellow-100 border-yellow-500 text-yellow-800 hover:bg-yellow-200",
    "purple": "bg-purple-100 border-purple-500 text-purple-800 hover:bg-purple-200",
    "": "bg-gray-100 border-gray-500 text-gray-800 hover:bg-gray-200", // default
  };

  const colorClass = colorClasses[annotation.color as keyof typeof colorClasses] || colorClasses[""];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              "inline-block px-2 py-0.5 rounded-md border-l-4 cursor-pointer transition-colors",
              colorClass,
              className
            )}
            onClick={onClick}
          >
            <span className="text-xs font-medium">Note</span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <div className="space-y-2">
            <p className="text-sm">{annotation.content}</p>
            <div className="flex flex-wrap gap-1">
              {annotation.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(annotation.createdAt), { addSuffix: true })}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 