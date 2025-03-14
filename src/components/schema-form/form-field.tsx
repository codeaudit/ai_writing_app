"use client";

import React from 'react';
import { Label } from '@/components/ui/label';

interface FormFieldProps {
  label: string;
  description?: string;
  error?: string;
  isRequired?: boolean;
  inline?: boolean;
  children: React.ReactNode;
}

export function FormField({
  label,
  description,
  error,
  isRequired = false,
  inline = false,
  children,
}: FormFieldProps) {
  const formattedLabel = label.charAt(0).toUpperCase() + label.slice(1).replace(/([A-Z])/g, ' $1');
  
  if (inline) {
    return (
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">
            {formattedLabel}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </Label>
          {description && (
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          )}
        </div>
        <div>
          {children}
        </div>
        {error && (
          <p className="text-xs text-red-500 mt-1">{error}</p>
        )}
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {formattedLabel}
        {isRequired && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {description && (
        <p className="text-xs text-gray-500">{description}</p>
      )}
      <div>{children}</div>
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
} 