"use client";

import React, { useState } from 'react';
import { ArrayField } from '@/lib/schema-parser';
import { Button } from '@/components/ui/button';
import { FormField } from './form-field';
import { RenderField } from './index';
import { Plus, Trash, List, AlignLeft } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ArrayInputProps {
  field: ArrayField;
  value: any[];
  onChange: (value: any[]) => void;
  error?: string;
  path: string;
}

export function ArrayInput({ field, value, onChange, error, path }: ArrayInputProps) {
  const items = Array.isArray(value) ? value : [];
  const [bulkInput, setBulkInput] = useState<string>('');
  const [inputMode, setInputMode] = useState<'individual' | 'bulk'>(
    field.itemType.type === 'string' ? 'bulk' : 'individual'
  );

  // Convert array items to text for bulk editing
  const itemsToText = () => {
    if (field.itemType.type === 'string') {
      return items.join('\n');
    }
    return JSON.stringify(items, null, 2);
  };

  // Initialize bulk input when switching to bulk mode
  const handleModeChange = (mode: 'individual' | 'bulk') => {
    if (mode === 'bulk' && bulkInput === '') {
      setBulkInput(itemsToText());
    }
    setInputMode(mode);
  };

  // Process bulk input when applying changes
  const handleBulkApply = () => {
    if (field.itemType.type === 'string') {
      // Split by newlines and filter out empty lines
      const newItems = bulkInput
        .split('\n')
        .map(line => line.trim())
        .filter(line => line !== '');
      onChange(newItems);
    } else {
      // For non-string types, try to parse as JSON
      try {
        const parsed = JSON.parse(bulkInput);
        if (Array.isArray(parsed)) {
          onChange(parsed);
        }
      } catch (e) {
        console.error('Failed to parse bulk input as JSON:', e);
      }
    }
  };

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

  // Determine if we should show the tabs for switching between modes
  const showTabs = field.itemType.type === 'string';

  return (
    <FormField
      label={field.name}
      description={field.description}
      error={error}
      isRequired={!field.isOptional}
    >
      <div className="space-y-4 border rounded-md p-4">
        {showTabs ? (
          <Tabs value={inputMode} onValueChange={(v) => handleModeChange(v as 'individual' | 'bulk')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="individual" className="flex items-center gap-1">
                <List className="h-4 w-4" />
                <span>Individual</span>
              </TabsTrigger>
              <TabsTrigger value="bulk" className="flex items-center gap-1">
                <AlignLeft className="h-4 w-4" />
                <span>Bulk Edit</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="individual" className="pt-4">
              {renderIndividualItems()}
            </TabsContent>
            
            <TabsContent value="bulk" className="pt-4">
              <div className="space-y-4">
                <Textarea
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  placeholder={`Enter one item per line${field.itemType.type !== 'string' ? ' or paste JSON array' : ''}`}
                  className="min-h-[150px] font-mono text-sm"
                />
                <div className="flex justify-end">
                  <Button 
                    type="button" 
                    size="sm" 
                    onClick={handleBulkApply}
                  >
                    Apply Changes
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          renderIndividualItems()
        )}
      </div>
    </FormField>
  );

  function renderIndividualItems() {
    return (
      <>
        {items.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            No items. Click "Add Item" to add one.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="flex items-start gap-2 bg-muted/30 p-2 rounded-md">
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
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveItem(index)}
                  className="h-8 w-8 mt-1"
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
      </>
    );
  }
} 