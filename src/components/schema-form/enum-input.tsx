"use client";

import React from 'react';
import { EnumField } from '@/lib/schema-parser';
import { FormField } from './form-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EnumInputProps {
  field: EnumField;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  path: string;
}

export function EnumInput({ field, value, onChange, error, path }: EnumInputProps) {
  return (
    <FormField
      label={field.name}
      description={field.description}
      error={error}
      isRequired={!field.isOptional}
    >
      <Select
        value={value || ''}
        onValueChange={onChange}
      >
        <SelectTrigger id={path} className={error ? 'border-red-500' : ''}>
          <SelectValue placeholder={`Select ${field.name}`} />
        </SelectTrigger>
        <SelectContent>
          {field.options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
} 