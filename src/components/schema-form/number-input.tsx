"use client";

import React from 'react';
import { NumberField } from '@/lib/schema-parser';
import { Input } from '@/components/ui/input';
import { FormField } from './form-field';

interface NumberInputProps {
  field: NumberField;
  value: number;
  onChange: (value: number) => void;
  error?: string;
  path: string;
}

export function NumberInput({ field, value, onChange, error, path }: NumberInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      onChange(field.defaultValue !== undefined ? field.defaultValue : 0);
    } else {
      const numValue = field.isInteger ? parseInt(val, 10) : parseFloat(val);
      onChange(numValue);
    }
  };

  return (
    <FormField
      label={field.name}
      description={field.description}
      error={error}
      isRequired={!field.isOptional}
    >
      <Input
        id={path}
        type="number"
        value={value === undefined || value === null ? '' : value}
        onChange={handleChange}
        placeholder={field.description || `Enter ${field.name}`}
        className={error ? 'border-red-500' : ''}
        min={field.min}
        max={field.max}
        step={field.isInteger ? 1 : 'any'}
      />
    </FormField>
  );
} 