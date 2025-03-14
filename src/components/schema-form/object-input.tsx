"use client";

import React from 'react';
import { ObjectField } from '@/lib/schema-parser';
import { FormField } from './form-field';
import { RenderField } from './index';
import { Card, CardContent } from '@/components/ui/card';

interface ObjectInputProps {
  field: ObjectField;
  value: Record<string, any>;
  onChange: (value: Record<string, any>) => void;
  error?: string;
  path: string;
}

export function ObjectInput({ field, value, onChange, error, path }: ObjectInputProps) {
  const objectValue = value || {};

  const handlePropertyChange = (propertyName: string, propertyValue: any) => {
    onChange({
      ...objectValue,
      [propertyName]: propertyValue,
    });
  };

  return (
    <FormField
      label={field.name}
      description={field.description}
      error={error}
      isRequired={!field.isOptional}
    >
      <Card>
        <CardContent className="pt-6 space-y-4">
          {field.properties.map((property) => (
            <RenderField
              key={property.name}
              field={property}
              value={objectValue[property.name]}
              onChange={(newValue) => handlePropertyChange(property.name, newValue)}
              path={`${path}.${property.name}`}
            />
          ))}
        </CardContent>
      </Card>
    </FormField>
  );
} 