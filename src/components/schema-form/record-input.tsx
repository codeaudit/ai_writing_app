"use client";

import React, { useState } from 'react';
import { RecordField } from '@/lib/schema-parser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from './form-field';
import { RenderField } from './index';
import { Plus, Trash } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface RecordInputProps {
  field: RecordField;
  value: Record<string, any>;
  onChange: (value: Record<string, any>) => void;
  error?: string;
  path: string;
}

export function RecordInput({ field, value, onChange, error, path }: RecordInputProps) {
  const [newKey, setNewKey] = useState('');
  const recordValue = value || {};

  const handleAddEntry = () => {
    if (!newKey.trim()) return;
    
    // Don't allow duplicate keys
    if (recordValue[newKey]) {
      return;
    }
    
    // Add a new entry with default value based on the value type
    let defaultValue;
    
    switch (field.valueType.type) {
      case 'string':
        defaultValue = '';
        break;
      case 'number':
        defaultValue = 0;
        break;
      case 'boolean':
        defaultValue = false;
        break;
      case 'date':
        defaultValue = new Date();
        break;
      case 'object':
        defaultValue = {};
        break;
      case 'array':
        defaultValue = [];
        break;
      case 'enum':
        defaultValue = field.valueType.options[0] || '';
        break;
      case 'record':
        defaultValue = {};
        break;
      default:
        defaultValue = '';
    }
    
    onChange({
      ...recordValue,
      [newKey]: defaultValue,
    });
    
    setNewKey('');
  };

  const handleRemoveEntry = (key: string) => {
    const newRecord = { ...recordValue };
    delete newRecord[key];
    onChange(newRecord);
  };

  const handleEntryValueChange = (key: string, entryValue: any) => {
    onChange({
      ...recordValue,
      [key]: entryValue,
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
          {Object.keys(recordValue).length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              No entries. Add a new key-value pair below.
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(recordValue).map(([key, entryValue]) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{key}</div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleRemoveEntry(key)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                  <RenderField
                    field={{
                      ...field.valueType,
                      name: key,
                    }}
                    value={entryValue}
                    onChange={(newValue) => handleEntryValueChange(key, newValue)}
                    path={`${path}.${key}`}
                  />
                </div>
              ))}
            </div>
          )}
          
          <div className="flex items-center gap-2 mt-4">
            <Input
              placeholder="New key"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleAddEntry}
              disabled={!newKey.trim()}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>
    </FormField>
  );
} 