"use client";

import React from 'react';
import { DateField } from '@/lib/schema-parser';
import { Input } from '@/components/ui/input';
import { FormField } from './form-field';
import { format } from 'date-fns';

interface DateInputProps {
  field: DateField;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  isValid?: boolean;
  path: string;
}

export function DateInput({ field, value, onChange, error, isValid, path }: DateInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  // Format date as YYYY-MM-DD for input
  const formatDateForInput = (date: Date | undefined | null): string => {
    if (!date || isNaN(date.getTime())) {
      return '';
    }
    return format(date, 'yyyy-MM-dd');
  };

  const getInputClassName = () => {
    if (error) return 'border-red-500';
    if (isValid) return 'border-green-500';
    return '';
  };

  return (
    <FormField
      label={field.name}
      description={field.description}
      error={error}
      isRequired={!field.isOptional}
      isValid={isValid}
    >
      <Input
        id={path}
        type="date"
        value={value || ''}
        onChange={handleChange}
        className={getInputClassName()}
        min={field.min ? formatDateForInput(field.min) : undefined}
        max={field.max ? formatDateForInput(field.max) : undefined}
      />
    </FormField>
  );
} 