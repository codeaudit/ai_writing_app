"use client";

import React from 'react';
import { BooleanField } from '@/lib/schema-parser';
import { Switch } from '@/components/ui/switch';
import { FormField } from './form-field';

interface BooleanInputProps {
  field: BooleanField;
  value: boolean;
  onChange: (value: boolean) => void;
  error?: string;
  path: string;
}

export function BooleanInput({ field, value, onChange, error, path }: BooleanInputProps) {
  const handleChange = (checked: boolean) => {
    onChange(checked);
  };

  return (
    <FormField
      label={field.name}
      description={field.description}
      error={error}
      isRequired={!field.isOptional}
      inline
    >
      <Switch
        id={path}
        checked={value === undefined ? !!field.defaultValue : !!value}
        onCheckedChange={handleChange}
      />
    </FormField>
  );
} 