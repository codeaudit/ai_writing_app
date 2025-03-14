"use client";

import React from 'react';
import { ArrayField } from '@/lib/schema-parser';
import { Button } from '@/components/ui/button';
import { FormField } from './form-field';
import { RenderField } from './index';
import { Plus, Trash } from 'lucide-react';

interface ArrayInputProps {
  field: ArrayField;
  value: any[];
  onChange: (value: any[]) => void;
  error?: string;
  path: string;
}

export function ArrayInput({ field, value, onChange, error, path }: ArrayInputProps) {
  const items = Array.isArray(value) ? value : [];

  const handleAddItem = () => {
    // Add a new item with default value based on the item type
    let defaultValue;
    
    switch (field.itemType.type) {
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
        defaultValue = field.itemType.options[0] || '';
        break;
      case 'record':
        defaultValue = {};
        break;
      default:
        defaultValue = '';
    }
    
    onChange([...items, defaultValue]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    onChange(newItems);
  };

  const handleItemChange = (index: number, newValue: any) => {
    const newItems = [...items];
    newItems[index] = newValue;
    onChange(newItems);
  };

  return (
    <FormField
      label={field.name}
      description={field.description}
      error={error}
      isRequired={!field.isOptional}
    >
      <div className="space-y-4 border rounded-md p-4">
        {items.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            No items. Click "Add Item" to add one.
          </div>
        ) : (
          <div className="space-y-6">
            {items.map((item, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="flex-1">
                  <RenderField
                    field={{
                      ...field.itemType,
                      name: `${field.name}[${index}]`,
                    }}
                    value={item}
                    onChange={(newValue) => handleItemChange(index, newValue)}
                    path={`${path}[${index}]`}
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleRemoveItem(index)}
                  className="mt-6"
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex justify-end mt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddItem}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>
    </FormField>
  );
} 