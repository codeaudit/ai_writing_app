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
  isValid?: boolean;
  path: string;
}

export function ArrayInput({ field, value, onChange, error, isValid, path }: ArrayInputProps) {
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
    const newValue = [...items, undefined];
    onChange(newValue);
  };

  const handleRemoveItem = (index: number) => {
    const newValue = [...items];
    newValue.splice(index, 1);
    onChange(newValue);
  };

  const handleItemChange = (index: number, itemValue: any) => {
    const newValue = [...items];
    newValue[index] = itemValue;
    onChange(newValue);
  };

  // Parse error messages for individual items
  const getItemError = (index: number): string | undefined => {
    if (!error) return undefined;
    
    const match = error.match(new RegExp(`Item ${index + 1}: (.*)`));
    return match ? match[1] : undefined;
  };

  // Determine if we should show the tabs for switching between modes
  const showTabs = field.itemType.type === 'string';

  return (
    <FormField
      label={field.name}
      description={field.description}
      error={error}
      isRequired={!field.isOptional}
      isValid={isValid}
    >
      <div className={`border rounded-md p-4 ${error ? 'border-red-500' : isValid ? 'border-green-500' : 'border-gray-200'}`}>
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
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddItem}
          className="mt-4"
          disabled={field.maxItems !== undefined && items.length >= field.maxItems}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
        
        {field.minItems !== undefined && (
          <div className="text-xs text-gray-500 mt-2">
            Minimum items: {field.minItems}
          </div>
        )}
        
        {field.maxItems !== undefined && (
          <div className="text-xs text-gray-500 mt-1">
            Maximum items: {field.maxItems}
          </div>
        )}
      </div>
    </FormField>
  );

  function renderIndividualItems() {
    return (
      <>
        {items.length === 0 ? (
          <div className="text-sm text-gray-500 italic">No items</div>
        ) : (
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="flex-1">
                  <RenderField
                    field={field.itemType}
                    value={item}
                    onChange={(newValue) => handleItemChange(index, newValue)}
                    error={getItemError(index)}
                    path={`${path}.${index}`}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveItem(index)}
                  className="mt-1"
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </>
    );
  }
} 