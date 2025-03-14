"use client";

import React, { useState, useEffect } from 'react';
import { RecordField } from '@/lib/schema-parser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from './form-field';
import { RenderField } from './index';
import { Plus, Trash, Check } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';

interface RecordInputProps {
  field: RecordField;
  value: Record<string, any>;
  onChange: (value: Record<string, any>) => void;
  error?: string;
  isValid?: boolean;
  path: string;
}

export function RecordInput({ field, value, onChange, error, isValid, path }: RecordInputProps) {
  const [newKey, setNewKey] = useState('');
  const [localValue, setLocalValue] = useState<Record<string, any>>(value || {});
  const [isDirty, setIsDirty] = useState(false);

  // Initialize local value when the prop value changes
  useEffect(() => {
    if (value && JSON.stringify(value) !== JSON.stringify(localValue)) {
      setLocalValue(value);
      setIsDirty(false);
    }
  }, [value]);

  const handleAddEntry = () => {
    if (!newKey.trim()) return;
    
    // Don't allow duplicate keys
    if (localValue[newKey]) {
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
    
    const updatedValue = {
      ...localValue,
      [newKey]: defaultValue,
    };
    
    setLocalValue(updatedValue);
    setIsDirty(true);
    setNewKey('');
  };

  const handleRemoveEntry = (key: string) => {
    const newRecord = { ...localValue };
    delete newRecord[key];
    setLocalValue(newRecord);
    setIsDirty(true);
  };

  const handleEntryValueChange = (key: string, entryValue: any) => {
    const updatedValue = {
      ...localValue,
      [key]: entryValue,
    };
    setLocalValue(updatedValue);
    setIsDirty(true);
  };

  const handleApply = () => {
    onChange(localValue);
    setIsDirty(false);
  };

  // Parse error messages for individual keys
  const getKeyError = (key: string): string | undefined => {
    if (!error) return undefined;
    
    const match = error.match(new RegExp(`${key}: (.*)`));
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
          {Object.keys(localValue).length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              No entries. Add a new key-value pair below.
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(localValue).map(([key, entryValue]) => (
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
                    error={getKeyError(key)}
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