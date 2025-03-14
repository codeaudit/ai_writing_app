"use client";

import React from 'react';
import { BooleanField } from '@/lib/schema-parser';
import { FormField } from './form-field';
import { Switch } from '@/components/ui/switch';

interface BooleanInputProps {
  field: BooleanField;
  value: boolean;
  onChange: (value: boolean) => void;
  error?: string;
  isValid?: boolean;
  path: string;
}

export function BooleanInput({ field, value, onChange, error, isValid, path }: BooleanInputProps) {
  const handleChange = (checked: boolean) => {
    onChange(checked);
  };

  return (
    <FormField
      label={field.name}
      description={field.description}
      error={error}
      isRequired={!field.isOptional}
      isValid={isValid}
      inline={true}
    >
      <Switch
        id={path}
        checked={value === true}
        onCheckedChange={handleChange}
        className={error ? 'data-[state=checked]:bg-red-500' : isValid ? 'data-[state=checked]:bg-green-500' : ''}
      />
    </FormField>
  );
} 