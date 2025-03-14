"use client";

import React, { useState, useEffect } from 'react';
import { SchemaField } from '@/lib/schema-parser';
import { StringInput } from './string-input';
import { NumberInput } from './number-input';
import { BooleanInput } from './boolean-input';
import { DateInput } from './date-input';
import { ArrayInput } from './array-input';
import { ObjectInput } from './object-input';
import { EnumInput } from './enum-input';
import { RecordInput } from './record-input';

interface SchemaFormProps {
  schema: Record<string, SchemaField>;
  initialValues?: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  errors?: Record<string, string>;
  validFields?: Record<string, boolean>;
}

export function SchemaForm({ schema, initialValues = {}, onChange, errors = {}, validFields = {} }: SchemaFormProps) {
  const [values, setValues] = useState<Record<string, any>>(initialValues);

  // Initialize default values for fields that don't have initial values
  useEffect(() => {
    const newValues = { ...initialValues };
    let hasChanges = false;

    // Set default values for enum fields that don't have values
    Object.entries(schema).forEach(([name, field]) => {
      if (field.type === 'enum' && (!initialValues[name] || initialValues[name] === '')) {
        if (field.options.length > 0) {
          const defaultValue = field.defaultValue || field.options[0];
          newValues[name] = defaultValue;
          hasChanges = true;
          console.log(`Setting default value for enum field ${name}:`, defaultValue);
        }
      }
    });

    if (hasChanges) {
      setValues(newValues);
      onChange(newValues);
    } else {
      setValues(initialValues);
    }
  }, [schema, initialValues, onChange]);

  const handleFieldChange = (name: string, value: any) => {
    console.log(`Field ${name} changed:`, value);
    const newValues = { ...values, [name]: value };
    setValues(newValues);
    onChange(newValues);
  };

  return (
    <div className="space-y-6">
      {Object.entries(schema).map(([name, field]) => (
        <div key={name} className="space-y-2">
          <RenderField
            field={field}
            value={values[name]}
            onChange={(value) => handleFieldChange(name, value)}
            error={errors[name]}
            isValid={validFields[name]}
          />
        </div>
      ))}
    </div>
  );
}

interface RenderFieldProps {
  field: SchemaField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  isValid?: boolean;
  path?: string;
}

export function RenderField({ field, value, onChange, error, isValid, path = '' }: RenderFieldProps) {
  const fieldPath = path ? `${path}.${field.name}` : field.name;
  
  // Log for debugging
  if (field.type === 'enum') {
    console.log(`RenderField for enum ${field.name}:`, {
      options: (field as any).options,
      value
    });
  }
  
  switch (field.type) {
    case 'string':
      return (
        <StringInput
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          isValid={isValid}
          path={fieldPath}
        />
      );
    case 'number':
      return (
        <NumberInput
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          isValid={isValid}
          path={fieldPath}
        />
      );
    case 'boolean':
      return (
        <BooleanInput
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          isValid={isValid}
          path={fieldPath}
        />
      );
    case 'date':
      return (
        <DateInput
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          isValid={isValid}
          path={fieldPath}
        />
      );
    case 'array':
      return (
        <ArrayInput
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          isValid={isValid}
          path={fieldPath}
        />
      );
    case 'object':
      return (
        <ObjectInput
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          isValid={isValid}
          path={fieldPath}
        />
      );
    case 'enum':
      return (
        <EnumInput
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          isValid={isValid}
          path={fieldPath}
        />
      );
    case 'record':
      return (
        <RecordInput
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          isValid={isValid}
          path={fieldPath}
        />
      );
    default:
      return (
        <div className="text-red-500">
          Unknown field type: {(field as any).type}
        </div>
      );
  }
} 