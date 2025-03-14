"use client";

import React, { useState, useEffect } from 'react';
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
  // State to track the input as a string
  const [inputValue, setInputValue] = useState<string>(
    value !== undefined && value !== null ? String(value) : ''
  );
  // State to track validation errors
  const [validationError, setValidationError] = useState<string>('');

  // Update the input value when the external value changes
  useEffect(() => {
    if (value !== undefined && value !== null) {
      setInputValue(String(value));
    }
  }, [value]);

  const validateNumber = (val: string): boolean => {
    if (val === '') return true;
    
    // Check if it's a valid number
    const numValue = field.isInteger 
      ? Number.isInteger(Number(val)) ? parseInt(val, 10) : NaN
      : parseFloat(val);
    
    if (isNaN(numValue)) {
      setValidationError('Please enter a valid number');
      return false;
    }
    
    // Check min/max constraints
    if (field.min !== undefined && numValue < field.min) {
      setValidationError(`Value must be at least ${field.min}`);
      return false;
    }
    
    if (field.max !== undefined && numValue > field.max) {
      setValidationError(`Value must be at most ${field.max}`);
      return false;
    }
    
    // Check if it's an integer when required
    if (field.isInteger && !Number.isInteger(numValue)) {
      setValidationError('Value must be an integer');
      return false;
    }
    
    // Check if it's positive when required
    if (field.isPositive && numValue <= 0) {
      setValidationError('Value must be positive');
      return false;
    }
    
    setValidationError('');
    return true;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    
    // Allow empty input
    if (val === '') {
      setValidationError('');
      return;
    }
    
    // Validate and convert to number
    if (validateNumber(val)) {
      const numValue = field.isInteger ? parseInt(val, 10) : parseFloat(val);
      if (!isNaN(numValue)) {
        onChange(numValue);
      }
    }
  };

  const handleBlur = () => {
    // When the field loses focus, if it's empty, set to default or 0
    if (inputValue === '') {
      const defaultValue = field.defaultValue !== undefined ? field.defaultValue : 0;
      setInputValue(String(defaultValue));
      onChange(defaultValue);
    }
  };

  // Combine external error with validation error
  const displayError = error || validationError;

  return (
    <FormField
      label={field.name}
      description={field.description}
      error={displayError}
      isRequired={!field.isOptional}
    >
      <Input
        id={path}
        type="text"
        inputMode="decimal"
        value={inputValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={field.description || `Enter ${field.name}`}
        className={displayError ? 'border-red-500' : ''}
      />
    </FormField>
  );
} 