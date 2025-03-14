import { z } from 'zod';

// Define types for schema field definitions
export type SchemaFieldType = 
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'array'
  | 'object'
  | 'enum'
  | 'record';

export interface SchemaFieldBase {
  type: SchemaFieldType;
  name: string;
  description: string;
  isOptional: boolean;
  defaultValue?: any;
}

export interface StringField extends SchemaFieldBase {
  type: 'string';
  minLength?: number;
  maxLength?: number;
  format?: 'email' | 'url' | 'uuid';
}

export interface NumberField extends SchemaFieldBase {
  type: 'number';
  min?: number;
  max?: number;
  isInteger?: boolean;
  isPositive?: boolean;
}

export interface BooleanField extends SchemaFieldBase {
  type: 'boolean';
}

export interface DateField extends SchemaFieldBase {
  type: 'date';
  min?: Date;
  max?: Date;
}

export interface ArrayField extends SchemaFieldBase {
  type: 'array';
  minItems?: number;
  maxItems?: number;
  itemType: SchemaField;
}

export interface ObjectField extends SchemaFieldBase {
  type: 'object';
  properties: SchemaField[];
}

export interface EnumField extends SchemaFieldBase {
  type: 'enum';
  options: string[];
}

export interface RecordField extends SchemaFieldBase {
  type: 'record';
  valueType: SchemaField;
}

export type SchemaField = 
  | StringField
  | NumberField
  | BooleanField
  | DateField
  | ArrayField
  | ObjectField
  | EnumField
  | RecordField;

// Function to extract schema from template content
export function extractSchemaFromTemplate(templateContent: string): Record<string, string> | null {
  // Look for {% set schema = { ... } %}
  // Using a workaround for the 's' flag (dotAll) for compatibility
  const schemaRegex = /\{%\s*set\s+schema\s*=\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}\s*%\}/;
  
  // Split the template content into lines and join with \n to handle multiline matching
  const normalizedContent = templateContent.split('\n').join('\n');
  const schemaMatch = normalizedContent.match(schemaRegex);
  
  if (!schemaMatch || !schemaMatch[1]) {
    return null;
  }
  
  const schemaContent = schemaMatch[1];
  
  // Parse the schema content into key-value pairs
  const schema: Record<string, string> = {};
  
  // Split by commas, but be careful with nested objects
  let depth = 0;
  let currentKey = '';
  let currentValue = '';
  let inKey = true;
  
  for (let i = 0; i < schemaContent.length; i++) {
    const char = schemaContent[i];
    
    if (char === '{') {
      depth++;
      if (depth > 0) currentValue += char;
    } else if (char === '}') {
      depth--;
      if (depth >= 0) currentValue += char;
    } else if (char === ':' && inKey && depth === 0) {
      inKey = false;
      currentKey = currentKey.trim();
    } else if (char === ',' && depth === 0) {
      if (currentKey && currentValue) {
        schema[currentKey] = currentValue.trim();
      }
      currentKey = '';
      currentValue = '';
      inKey = true;
    } else {
      if (inKey) {
        currentKey += char;
      } else {
        currentValue += char;
      }
    }
  }
  
  // Add the last key-value pair
  if (currentKey && currentValue) {
    schema[currentKey.trim()] = currentValue.trim();
  }
  
  return schema;
}

// Function to parse Zod-like schema syntax
export function parseZodSchema(schema: Record<string, string>): Record<string, SchemaField> {
  const result: Record<string, SchemaField> = {};
  
  for (const [key, value] of Object.entries(schema)) {
    result[key] = parseZodField(key, value);
  }
  
  return result;
}

// Helper function to parse a single Zod field
function parseZodField(name: string, zodString: string): SchemaField {
  // Remove quotes from the string
  const cleanZodString = zodString.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  
  // Extract description if present
  let description = '';
  const describeMatch = cleanZodString.match(/\.describe\(['"]([^'"]*)['"]\)/);
  if (describeMatch) {
    description = describeMatch[1];
  }
  
  // Check if optional
  const isOptional = cleanZodString.includes('.optional()');
  
  // Check for default value
  let defaultValue: any = undefined;
  const defaultMatch = cleanZodString.match(/\.default\(([^)]*)\)/);
  if (defaultMatch) {
    try {
      // Try to parse as JSON, fall back to string if it fails
      defaultValue = JSON.parse(defaultMatch[1]);
    } catch {
      // Handle boolean, string literals, etc.
      const val = defaultMatch[1].trim();
      if (val === 'true') defaultValue = true;
      else if (val === 'false') defaultValue = false;
      else if (val.match(/^['"].*['"]$/)) defaultValue = val.slice(1, -1);
      else defaultValue = val;
    }
  }
  
  // Parse based on type
  if (cleanZodString.startsWith('z.string()')) {
    const field: StringField = {
      type: 'string',
      name,
      description,
      isOptional,
      defaultValue,
    };
    
    // Check for min/max length
    const minMatch = cleanZodString.match(/\.min\((\d+)\)/);
    if (minMatch) {
      field.minLength = parseInt(minMatch[1], 10);
    }
    
    const maxMatch = cleanZodString.match(/\.max\((\d+)\)/);
    if (maxMatch) {
      field.maxLength = parseInt(maxMatch[1], 10);
    }
    
    // Check for format
    if (cleanZodString.includes('.email()')) {
      field.format = 'email';
    } else if (cleanZodString.includes('.url()')) {
      field.format = 'url';
    } else if (cleanZodString.includes('.uuid()')) {
      field.format = 'uuid';
    }
    
    return field;
  } else if (cleanZodString.startsWith('z.number()')) {
    const field: NumberField = {
      type: 'number',
      name,
      description,
      isOptional,
      defaultValue,
    };
    
    // Check for min/max
    const minMatch = cleanZodString.match(/\.min\((\d+(?:\.\d+)?)\)/);
    if (minMatch) {
      field.min = parseFloat(minMatch[1]);
    }
    
    const maxMatch = cleanZodString.match(/\.max\((\d+(?:\.\d+)?)\)/);
    if (maxMatch) {
      field.max = parseFloat(maxMatch[1]);
    }
    
    // Check for integer, positive
    field.isInteger = cleanZodString.includes('.int()');
    field.isPositive = cleanZodString.includes('.positive()');
    
    return field;
  } else if (cleanZodString.startsWith('z.boolean()')) {
    return {
      type: 'boolean',
      name,
      description,
      isOptional,
      defaultValue,
    };
  } else if (cleanZodString.startsWith('z.date()')) {
    return {
      type: 'date',
      name,
      description,
      isOptional,
      defaultValue,
    };
  } else if (cleanZodString.startsWith('z.array(')) {
    // Extract the item type
    const itemTypeMatch = cleanZodString.match(/z\.array\(([^)]+)\)/);
    let itemTypeStr = 'z.string()';
    
    if (itemTypeMatch && itemTypeMatch[1]) {
      itemTypeStr = itemTypeMatch[1];
    }
    
    const field: ArrayField = {
      type: 'array',
      name,
      description,
      isOptional,
      defaultValue,
      itemType: parseZodField(`${name}Item`, itemTypeStr),
    };
    
    // Check for min/max items
    const minMatch = cleanZodString.match(/\.min\((\d+)\)/);
    if (minMatch) {
      field.minItems = parseInt(minMatch[1], 10);
    }
    
    const maxMatch = cleanZodString.match(/\.max\((\d+)\)/);
    if (maxMatch) {
      field.maxItems = parseInt(maxMatch[1], 10);
    }
    
    return field;
  } else if (cleanZodString.startsWith('z.enum(')) {
    // Extract enum options
    const optionsMatch = cleanZodString.match(/z\.enum\(\[([^\]]+)\]\)/);
    const options: string[] = [];
    
    if (optionsMatch && optionsMatch[1]) {
      // Parse the enum options
      const optionsStr = optionsMatch[1];
      
      // More robust parsing for enum options
      let currentOption = '';
      let inQuotes = false;
      let quoteChar = '';
      
      for (let i = 0; i < optionsStr.length; i++) {
        const char = optionsStr[i];
        
        if ((char === "'" || char === '"') && (i === 0 || optionsStr[i-1] !== '\\')) {
          if (!inQuotes) {
            // Start of a quoted string
            inQuotes = true;
            quoteChar = char;
          } else if (char === quoteChar) {
            // End of a quoted string
            inQuotes = false;
            if (currentOption) {
              options.push(currentOption);
              currentOption = '';
            }
          } else {
            // Different quote character inside a quoted string
            currentOption += char;
          }
        } else if (char === ',' && !inQuotes) {
          // Skip commas between options
          continue;
        } else if (inQuotes) {
          // Add character to current option
          currentOption += char;
        }
      }
    }
    
    console.log(`Parsed enum options for ${name}:`, options);
    
    return {
      type: 'enum',
      name,
      description,
      isOptional,
      defaultValue,
      options,
    };
  } else if (cleanZodString.startsWith('z.object(')) {
    // Extract object properties
    const propertiesMatch = cleanZodString.match(/z\.object\(\{([^}]+)\}\)/);
    const properties: SchemaField[] = [];
    
    if (propertiesMatch && propertiesMatch[1]) {
      const propertiesStr = propertiesMatch[1];
      
      // This is a simplified approach - for a real implementation, you'd need
      // a more robust parser to handle nested objects correctly
      const propertyMatches = propertiesStr.match(/([a-zA-Z0-9_]+):\s*([^,]+)(?:,|$)/g);
      
      if (propertyMatches) {
        propertyMatches.forEach(propStr => {
          const [propName, propType] = propStr.split(':').map(s => s.trim());
          if (propName && propType) {
            properties.push(parseZodField(propName, propType.replace(/,$/, '')));
          }
        });
      }
    }
    
    return {
      type: 'object',
      name,
      description,
      isOptional,
      defaultValue,
      properties,
    };
  } else if (cleanZodString.startsWith('z.record(')) {
    // Extract value type
    const valueTypeMatch = cleanZodString.match(/z\.record\([^,]+,\s*([^)]+)\)/);
    let valueTypeStr = 'z.string()';
    
    if (valueTypeMatch && valueTypeMatch[1]) {
      valueTypeStr = valueTypeMatch[1];
    }
    
    return {
      type: 'record',
      name,
      description,
      isOptional,
      defaultValue,
      valueType: parseZodField(`${name}Value`, valueTypeStr),
    };
  }
  
  // Default to string if type can't be determined
  return {
    type: 'string',
    name,
    description,
    isOptional,
    defaultValue,
  };
}

// Function to generate initial values from schema
export function generateInitialValues(schema: Record<string, SchemaField>): Record<string, any> {
  const initialValues: Record<string, any> = {};
  
  for (const [key, field] of Object.entries(schema)) {
    initialValues[key] = getDefaultValueForField(field);
  }
  
  return initialValues;
}

// Helper function to get default value for a field
function getDefaultValueForField(field: SchemaField): any {
  if (field.defaultValue !== undefined) {
    return field.defaultValue;
  }
  
  switch (field.type) {
    case 'string':
      return '';
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'date':
      return new Date();
    case 'array':
      return [];
    case 'object':
      const objValue: Record<string, any> = {};
      field.properties.forEach(prop => {
        objValue[prop.name] = getDefaultValueForField(prop);
      });
      return objValue;
    case 'enum':
      return field.options.length > 0 ? field.options[0] : '';
    case 'record':
      return {};
    default:
      return '';
  }
}

// Function to validate values against schema
export function validateValues(values: Record<string, any>, schema: Record<string, SchemaField>): Record<string, string> {
  const errors: Record<string, string> = {};
  
  for (const [key, field] of Object.entries(schema)) {
    const value = values[key];
    
    // Skip validation for optional fields with no value
    if (field.isOptional && (value === undefined || value === null || value === '')) {
      continue;
    }
    
    const error = validateField(value, field);
    if (error) {
      errors[key] = error;
    }
  }
  
  return errors;
}

// Helper function to validate a single field
function validateField(value: any, field: SchemaField): string | null {
  switch (field.type) {
    case 'string':
      if (typeof value !== 'string') {
        return 'Must be a string';
      }
      
      if ((field as StringField).minLength !== undefined && value.length < (field as StringField).minLength!) {
        return `Must be at least ${(field as StringField).minLength} characters`;
      }
      
      if ((field as StringField).maxLength !== undefined && value.length > (field as StringField).maxLength!) {
        return `Must be at most ${(field as StringField).maxLength} characters`;
      }
      
      if ((field as StringField).format === 'email' && !value.includes('@')) {
        return 'Must be a valid email address';
      }
      
      return null;
      
    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        return 'Must be a number';
      }
      
      if ((field as NumberField).isInteger && !Number.isInteger(value)) {
        return 'Must be an integer';
      }
      
      if ((field as NumberField).isPositive && value <= 0) {
        return 'Must be positive';
      }
      
      if ((field as NumberField).min !== undefined && value < (field as NumberField).min!) {
        return `Must be at least ${(field as NumberField).min}`;
      }
      
      if ((field as NumberField).max !== undefined && value > (field as NumberField).max!) {
        return `Must be at most ${(field as NumberField).max}`;
      }
      
      return null;
      
    case 'boolean':
      if (typeof value !== 'boolean') {
        return 'Must be a boolean';
      }
      
      return null;
      
    case 'date':
      if (!(value instanceof Date) || isNaN(value.getTime())) {
        return 'Must be a valid date';
      }
      
      return null;
      
    case 'array':
      if (!Array.isArray(value)) {
        return 'Must be an array';
      }
      
      if ((field as ArrayField).minItems !== undefined && value.length < (field as ArrayField).minItems!) {
        return `Must have at least ${(field as ArrayField).minItems} items`;
      }
      
      if ((field as ArrayField).maxItems !== undefined && value.length > (field as ArrayField).maxItems!) {
        return `Must have at most ${(field as ArrayField).maxItems} items`;
      }
      
      // Validate each item in the array
      for (let i = 0; i < value.length; i++) {
        const itemError = validateField(value[i], (field as ArrayField).itemType);
        if (itemError) {
          return `Item ${i + 1}: ${itemError}`;
        }
      }
      
      return null;
      
    case 'object':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return 'Must be an object';
      }
      
      // Validate each property in the object
      for (const prop of (field as ObjectField).properties) {
        const propValue = value[prop.name];
        
        // Skip validation for optional properties with no value
        if (prop.isOptional && (propValue === undefined || propValue === null || propValue === '')) {
          continue;
        }
        
        const propError = validateField(propValue, prop);
        if (propError) {
          return `${prop.name}: ${propError}`;
        }
      }
      
      return null;
      
    case 'enum':
      if (typeof value !== 'string' || !(field as EnumField).options.includes(value)) {
        return `Must be one of: ${(field as EnumField).options.join(', ')}`;
      }
      
      return null;
      
    case 'record':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return 'Must be an object';
      }
      
      // Validate each value in the record
      for (const [key, val] of Object.entries(value)) {
        const valError = validateField(val, (field as RecordField).valueType);
        if (valError) {
          return `${key}: ${valError}`;
        }
      }
      
      return null;
      
    default:
      return null;
  }
} 