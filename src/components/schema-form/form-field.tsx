"use client";

import React from 'react';
import { Label } from '@/components/ui/label';
import { CheckCircle2 } from 'lucide-react';

interface FormFieldProps {
  label: string;
  description?: string;
  error?: string;
  isRequired?: boolean;
  isValid?: boolean;
  inline?: boolean;
  children: React.ReactNode;
}

export function FormField({
  label,
  description,
  error,
  isRequired = false,
  isValid = false,
  inline = false,
  children,
}: FormFieldProps) {
  const formattedLabel = label.charAt(0).toUpperCase() + label.slice(1).replace(/([A-Z])/g, ' $1');
  
  const renderRequiredIndicator = () => {
    if (isValid) {
      return <CheckCircle2 className="ml-1 h-4 w-4 text-green-500" />;
    }
    if (isRequired) {
      return <span className="text-red-500 ml-1">*</span>;
    }
    return null;
  };
  
  if (inline) {
    return (
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium flex items-center">
            {formattedLabel}
            {renderRequiredIndicator()}
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
      <Label className="text-sm font-medium flex items-center">
        {formattedLabel}
        {renderRequiredIndicator()}
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