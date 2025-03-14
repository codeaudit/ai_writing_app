"use client";

import React, { useEffect, useState } from 'react';
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
  const [initialized, setInitialized] = useState(false);

  // Log for debugging
  console.log(`Rendering EnumInput for ${field.name}:`, {
    options: field.options,
    currentValue: value,
    defaultValue: field.defaultValue,
    optionsLength: field.options?.length || 0,
    optionsType: typeof field.options,
    isArray: Array.isArray(field.options)
  });

  // Ensure field.options is an array
  const options = Array.isArray(field.options) ? field.options : [];
  
  // Ensure we have a valid value selected
  useEffect(() => {
    // Only set a default value if we haven't initialized yet and have options
    if (!initialized && options.length > 0) {
      // If no value is selected, select the first one or the default value
      if (!value || value === '') {
        const defaultValue = field.defaultValue || options[0];
        console.log(`Setting default enum value for ${field.name}:`, defaultValue);
        onChange(defaultValue);
      }
      setInitialized(true);
    }
  }, [options, field.name, value, onChange, field.defaultValue, initialized]);

  // Ensure we have a valid value for the Select component
  const selectValue = value || '';

  return (
    <FormField
      label={field.name}
      description={field.description}
      error={error}
      isRequired={!field.isOptional}
    >
      {options.length > 0 ? (
        <Select
          value={selectValue}
          onValueChange={(newValue) => {
            console.log(`Selected value for ${field.name}:`, newValue);
            onChange(newValue);
          }}
          defaultValue={options[0]}
        >
          <SelectTrigger id={path} className={error ? 'border-red-500' : ''}>
            <SelectValue placeholder={`Select ${field.name}`} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option, index) => (
              <SelectItem key={`${option}-${index}`} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="p-2 text-sm text-muted-foreground border rounded-md">
          No options available for this enum field
        </div>
      )}
    </FormField>
  );
} 