"use client";

import React, { useState } from 'react';
import { ObjectField } from '@/lib/schema-parser';
import { FormField } from './form-field';
import { RenderField } from './index';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

interface ObjectInputProps {
  field: ObjectField;
  value: Record<string, any>;
  onChange: (value: Record<string, any>) => void;
  error?: string;
  isValid?: boolean;
  path: string;
}

export function ObjectInput({ field, value, onChange, error, isValid, path }: ObjectInputProps) {
  const [localValue, setLocalValue] = useState<Record<string, any>>(value || {});
  const [isDirty, setIsDirty] = useState(false);

  // Initialize local value when the prop value changes
  React.useEffect(() => {
    if (value && JSON.stringify(value) !== JSON.stringify(localValue)) {
      setLocalValue(value);
      setIsDirty(false);
    }
  }, [value]);

  const handlePropertyChange = (propertyName: string, propertyValue: any) => {
    const updatedValue = {
      ...localValue,
      [propertyName]: propertyValue,
    };
    setLocalValue(updatedValue);
    setIsDirty(true);
  };

  const handleApply = () => {
    onChange(localValue);
    setIsDirty(false);
  };

  // Parse error messages for individual properties
  const getPropertyError = (propertyName: string): string | undefined => {
    if (!error) return undefined;
    
    const match = error.match(new RegExp(`${propertyName}: (.*)`));
    return match ? match[1] : undefined;
  };

  return (
    <FormField
      label={field.name}
      description={field.description}
      error={error}
      isRequired={!field.isOptional}
      isValid={isValid}
    >
      <Card>
        <CardContent className="pt-6 space-y-4">
          {field.properties.map((property) => (
            <RenderField
              key={property.name}
              field={property}
              value={localValue[property.name]}
              onChange={(newValue) => handlePropertyChange(property.name, newValue)}
              error={getPropertyError(property.name)}
              path={`${path}.${property.name}`}
            />
          ))}
        </CardContent>
        <CardFooter className="flex justify-end border-t pt-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleApply}
            disabled={!isDirty}
            className="flex items-center gap-1"
          >
            <Check className="h-3.5 w-3.5" />
            Apply Changes
          </Button>
        </CardFooter>
      </Card>
    </FormField>
  );
} 