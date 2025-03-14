"use client";

import React from 'react';
import { DateField } from '@/lib/schema-parser';
import { Input } from '@/components/ui/input';
import { FormField } from './form-field';
import { format } from 'date-fns';

interface DateInputProps {
  field: DateField;
  value: Date;
  onChange: (value: Date) => void;
  error?: string;
  path: string;
}

export function DateInput({ field, value, onChange, error, path }: DateInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = new Date(e.target.value);
    if (!isNaN(dateValue.getTime())) {
      onChange(dateValue);
    }
  };

  // Format date as YYYY-MM-DD for input
  const formatDateForInput = (date: Date | undefined | null): string => {
    if (!date || isNaN(date.getTime())) {
      return '';
    }
    return format(date, 'yyyy-MM-dd');
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
        type="date"
        value={formatDateForInput(value)}
        onChange={handleChange}
        className={error ? 'border-red-500' : ''}
        min={field.min ? formatDateForInput(field.min) : undefined}
        max={field.max ? formatDateForInput(field.max) : undefined}
      />
    </FormField>
  );
} 