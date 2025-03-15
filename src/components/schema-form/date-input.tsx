"use client";

import React from 'react';
import { DateField } from '@/lib/schema-parser';
import { Input } from '@/components/ui/input';
import { FormField } from './form-field';
import { format, parse } from 'date-fns';

interface DateInputProps {
  field: DateField;
  value: Date | string;
  onChange: (value: Date) => void;
  error?: string;
  isValid?: boolean;
  path: string;
}

export function DateInput({ field, value, onChange, error, isValid, path }: DateInputProps) {
  // Format date as YYYY-MM-DD for input
  const formatDateForInput = (date: Date | string | undefined | null): string => {
    if (!date) return '';
    
    // If it's already a string in the right format, return it
    if (typeof date === 'string') {
      // Check if it's already in YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
      }
      
      // Try to parse the string to a Date
      try {
        const parsedDate = new Date(date);
        if (!isNaN(parsedDate.getTime())) {
          return format(parsedDate, 'yyyy-MM-dd');
        }
      } catch (e) {
        console.error("Error parsing date string:", e);
      }
      return '';
    }
    
    // If it's a Date object
    if (date instanceof Date && !isNaN(date.getTime())) {
      return format(date, 'yyyy-MM-dd');
    }
    
    return '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateString = e.target.value;
    
    if (!dateString) {
      // If the input is empty, pass null or a default date based on your requirements
      onChange(new Date());
      return;
    }
    
    try {
      // Parse the date string to a Date object
      const parsedDate = parse(dateString, 'yyyy-MM-dd', new Date());
      if (!isNaN(parsedDate.getTime())) {
        onChange(parsedDate);
      }
    } catch (e) {
      console.error("Error parsing date:", e);
    }
  };

  const getInputClassName = () => {
    if (error) return 'border-red-500';
    if (isValid) return 'border-green-500';
    return '';
  };

  // Get min and max dates as strings for the input
  const minDate = field.min ? formatDateForInput(field.min) : undefined;
  const maxDate = field.max ? formatDateForInput(field.max) : undefined;

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
        value={formatDateForInput(value)}
        onChange={handleChange}
        className={getInputClassName()}
        min={minDate}
        max={maxDate}
      />
    </FormField>
  );
} 