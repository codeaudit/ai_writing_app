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
}

export function SchemaForm({ schema, initialValues = {}, onChange, errors = {} }: SchemaFormProps) {
  const [values, setValues] = useState<Record<string, any>>(initialValues);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const handleFieldChange = (name: string, value: any) => {
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
  path?: string;
}

export function RenderField({ field, value, onChange, error, path = '' }: RenderFieldProps) {
  const fieldPath = path ? `${path}.${field.name}` : field.name;
  
  switch (field.type) {
    case 'string':
      return (
        <StringInput
          field={field}
          value={value}
          onChange={onChange}
          error={error}
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