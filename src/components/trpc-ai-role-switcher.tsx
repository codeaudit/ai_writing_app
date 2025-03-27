"use client";

import React, { useState, useEffect } from 'react';
import { Bot, CheckCircle, Plane, Sparkles, Building, Wand2 } from 'lucide-react';
import { useTrpcAIRolesStore } from '@/lib/trpc-ai-roles-store';
import { useTrpcConfigStore } from '@/lib/trpc-config-store';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';

interface RoleInfo {
  icon: React.ReactNode;
  label: string;
  description: string;
}

interface TrpcAIRoleSwitcherProps {
  className?: string;
}

export function TrpcAIRoleSwitcher({ className }: TrpcAIRoleSwitcherProps) {
  const { availableRoles, loadAvailableRoles } = useTrpcAIRolesStore();
  const { config, saveConfig } = useTrpcConfigStore();
  const [isLoading, setIsLoading] = useState(true);
  const activeRole = config.aiRole || 'assistant';
  
  useEffect(() => {
    const loadRoles = async () => {
      try {
        await loadAvailableRoles();
      } catch (error) {
        console.error('Error loading AI roles:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadRoles();
  }, [loadAvailableRoles]);
  
  // Define default role information with icons, labels, and descriptions
  const defaultRoleInfo: Record<string, RoleInfo> = {
    'assistant': {
      icon: <Bot size={14} className="mr-1" />,
      label: 'Assistant',
      description: 'Provides suggestions only when asked'
    },
    'co-creator': {
      icon: <Sparkles size={14} className="mr-1" />,
      label: 'Co-creator',
      description: 'Actively suggests ideas as you work'
    },
    'validator': {
      icon: <CheckCircle size={14} className="mr-1" />,
      label: 'Validator', 
      description: 'Reviews writing for issues and improvements'
    },
    'architect': {
      icon: <Building size={14} className="mr-1" />,
      label: 'Architect',
      description: 'Designs architectural plans and concepts'
    },
    'autopilot': {
      icon: <Plane size={14} className="mr-1" />,
      label: 'Autopilot',
      description: 'Takes the lead on generating content'
    }
  };
  
  // Map role names to appropriate icons based on keywords
  const getIconByRoleName = (role: string): React.ReactNode => {
    const roleLower = role.toLowerCase();
    
    if (roleLower.includes('assistant') || roleLower.includes('helper')) {
      return <Bot size={14} className="mr-1" />;
    } else if (roleLower.includes('validator') || roleLower.includes('review') || roleLower.includes('critic')) {
      return <CheckCircle size={14} className="mr-1" />;
    } else if (roleLower.includes('creator') || roleLower.includes('develop')) {
      return <Sparkles size={14} className="mr-1" />;
    } else if (roleLower.includes('architect') || roleLower.includes('design') || roleLower.includes('build')) {
      return <Building size={14} className="mr-1" />;
    } else if (roleLower.includes('autopilot') || roleLower.includes('generat')) {
      return <Plane size={14} className="mr-1" />;
    } else {
      return <Wand2 size={14} className="mr-1" />;
    }
  };
  
  // Function to get title-cased label from role
  const getRoleLabel = (role: string): string => {
    return defaultRoleInfo[role]?.label || 
      role.split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
  };
  
  // Function to get icon for role
  const getRoleIcon = (role: string): React.ReactNode => {
    return defaultRoleInfo[role]?.icon || getIconByRoleName(role);
  };

  // Handle role change
  const handleRoleChange = async (value: string) => {
    await saveConfig({ aiRole: value });
  };
  
  if (isLoading) {
    return (
      <div className={cn("border rounded-lg", className)}>
        <div className="flex items-center justify-center h-7">
          <div className="animate-spin h-3 w-3 border-b-2 border-primary rounded-full"></div>
        </div>
      </div>
    );
  }
  
  // Use a more compact layout when className is provided
  const isCompact = !!className;
  
  return (
    <div className={cn(
      isCompact ? "border-0" : "mb-2 border rounded-lg p-2",
      className
    )}>
      <div className="flex items-center justify-between">
        {!isCompact && <span className="text-xs text-muted-foreground mr-2">AI Role:</span>}
        <Select
          value={activeRole}
          onValueChange={handleRoleChange}
        >
          <SelectTrigger className={cn(
            "text-xs",
            isCompact ? "h-full w-full px-1 py-0 min-w-0" : "h-7 px-2 py-0 min-w-32"
          )}>
            <div className="flex items-center">
              {getRoleIcon(activeRole)}
              <span className="ml-1 truncate">{getRoleLabel(activeRole)}</span>
            </div>
          </SelectTrigger>
          <SelectContent>
            {availableRoles.map((role) => (
              <SelectItem key={role} value={role} className="cursor-pointer h-7 text-xs">
                <div className="flex items-center">
                  {getRoleIcon(role)}
                  <span className="ml-2">{getRoleLabel(role)}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
} 