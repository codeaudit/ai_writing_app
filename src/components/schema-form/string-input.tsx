"use client";

import React from 'react';
import { StringField } from '@/lib/schema-parser';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FormField } from './form-field';

interface StringInputProps {
  field: StringField;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  path: string;
}

export function StringInput({ field, value, onChange, error, path }: StringInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const inputProps = {
    id: path,
    value: value || '',
    onChange: handleChange,
    placeholder: field.description || `Enter ${field.name}`,
    className: error ? 'border-red-500' : '',
  };

  // Use textarea for longer text fields
  const useTextarea = field.maxLength === undefined || field.maxLength > 100;

  return (
    <FormField
      label={field.name}
      description={field.description}
      error={error}
      isRequired={!field.isOptional}
    >
      {useTextarea ? (
        <Textarea
          {...inputProps}
          className={`min-h-[100px] ${inputProps.className}`}
        />
      ) : (
        <Input
          {...inputProps}
          type={field.format === 'email' ? 'email' : field.format === 'url' ? 'url' : 'text'}
          maxLength={field.maxLength}
        />
      )}
    </FormField>
  );
} 