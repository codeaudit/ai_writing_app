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

// Schema Definition Language (SDL) types
export interface SDLFieldBase {
  type: string;
  description?: string;
  optional?: boolean;
  default?: any;
}

export interface SDLStringField extends SDLFieldBase {
  type: 'string';
  minLength?: number;
  maxLength?: number;
  format?: 'email' | 'url' | 'uuid';
}

export interface SDLNumberField extends SDLFieldBase {
  type: 'number';
  min?: number;
  max?: number;
  integer?: boolean;
  positive?: boolean;
}

export interface SDLBooleanField extends SDLFieldBase {
  type: 'boolean';
}

export interface SDLDateField extends SDLFieldBase {
  type: 'date';
  min?: string | Date;
  max?: string | Date;
}

export interface SDLArrayField extends SDLFieldBase {
  type: 'array';
  items: SDLField;
  minItems?: number;
  maxItems?: number;
}

export interface SDLObjectField extends SDLFieldBase {
  type: 'object';
  properties: Record<string, SDLField>;
}

export interface SDLEnumField extends SDLFieldBase {
  type: 'enum';
  options: string[];
}

export interface SDLRecordField extends SDLFieldBase {
  type: 'record';
  values: SDLField;
}

export type SDLField =
  | SDLStringField
  | SDLNumberField
  | SDLBooleanField
  | SDLDateField
  | SDLArrayField
  | SDLObjectField
  | SDLEnumField
  | SDLRecordField;

export interface SDLSchema {
  fields: Record<string, SDLField>;
}

// Function to extract schema from template content
export function extractSchemaFromTemplate(templateContent: string): SDLSchema | null {
  // Look for {% set schema = ... %}
  const schemaRegex = /\{%\s*set\s+schema\s*=\s*(\{[^]*?\})\s*%\}/;
  
  const schemaMatch = templateContent.match(schemaRegex);
  
  if (!schemaMatch || !schemaMatch[1]) {
    return null;
  }
  
  try {
    // Parse the JSON schema definition
    const schemaJson = JSON.parse(schemaMatch[1]);
    return schemaJson as SDLSchema;
  } catch (error) {
    console.error('Error parsing schema JSON:', error);
    return null;
  }
}

// Convert SDL schema to our internal schema format
export function sdlToInternalSchema(sdlSchema: SDLSchema): Record<string, SchemaField> {
  const result: Record<string, SchemaField> = {};
  
  for (const [name, field] of Object.entries(sdlSchema.fields)) {
    result[name] = sdlFieldToInternal(name, field);
  }
  
  return result;
}

// Convert a single SDL field to internal format
function sdlFieldToInternal(name: string, field: SDLField): SchemaField {
  const baseField: SchemaFieldBase = {
    name,
    type: field.type as SchemaFieldType,
    description: field.description || '',
    isOptional: field.optional || false,
    defaultValue: field.default,
  };
  
  switch (field.type) {
    case 'string': {
      const stringField: StringField = {
        ...baseField,
        type: 'string',
      };
      
      if ((field as SDLStringField).minLength !== undefined) {
        stringField.minLength = (field as SDLStringField).minLength;
      }
      
      if ((field as SDLStringField).maxLength !== undefined) {
        stringField.maxLength = (field as SDLStringField).maxLength;
      }
      
      if ((field as SDLStringField).format !== undefined) {
        stringField.format = (field as SDLStringField).format;
      }
      
      return stringField;
    }
    
    case 'number': {
      const numberField: NumberField = {
        ...baseField,
        type: 'number',
      };
      
      if ((field as SDLNumberField).min !== undefined) {
        numberField.min = (field as SDLNumberField).min;
      }
      
      if ((field as SDLNumberField).max !== undefined) {
        numberField.max = (field as SDLNumberField).max;
      }
      
      if ((field as SDLNumberField).integer !== undefined) {
        numberField.isInteger = (field as SDLNumberField).integer;
      }
      
      if ((field as SDLNumberField).positive !== undefined) {
        numberField.isPositive = (field as SDLNumberField).positive;
      }
      
      return numberField;
    }
    
    case 'boolean': {
      return {
        ...baseField,
        type: 'boolean',
      };
    }
    
    case 'date': {
      const dateField: DateField = {
        ...baseField,
        type: 'date',
      };
      
      if ((field as SDLDateField).min !== undefined) {
        const minDate = (field as SDLDateField).min;
        dateField.min = typeof minDate === 'string' ? new Date(minDate) : minDate;
      }
      
      if ((field as SDLDateField).max !== undefined) {
        const maxDate = (field as SDLDateField).max;
        dateField.max = typeof maxDate === 'string' ? new Date(maxDate) : maxDate;
      }
      
      return dateField;
    }
    
    case 'array': {
      const arrayField = field as SDLArrayField;
      return {
        ...baseField,
        type: 'array',
        minItems: arrayField.minItems,
        maxItems: arrayField.maxItems,
        itemType: sdlFieldToInternal(`${name}Item`, arrayField.items),
      };
    }
    
    case 'object': {
      const objectField = field as SDLObjectField;
      const properties: SchemaField[] = [];
      
      for (const [propName, propField] of Object.entries(objectField.properties)) {
        properties.push(sdlFieldToInternal(propName, propField));
      }
      
      return {
        ...baseField,
        type: 'object',
        properties,
      };
    }
    
    case 'enum': {
      const enumField = field as SDLEnumField;
      return {
        ...baseField,
        type: 'enum',
        options: enumField.options || [],
      };
    }
    
    case 'record': {
      const recordField = field as SDLRecordField;
      return {
        ...baseField,
        type: 'record',
        valueType: sdlFieldToInternal(`${name}Value`, recordField.values),
      };
    }
    
    default:
      // Default to string for unknown types
      return {
        ...baseField,
        type: 'string',
      };
  }
}

// Convert SDL schema to Zod schema (for validation)
export function sdlToZodSchema(sdlSchema: SDLSchema): z.ZodObject<any> {
  const shape: Record<string, z.ZodTypeAny> = {};
  
  for (const [name, field] of Object.entries(sdlSchema.fields)) {
    shape[name] = sdlFieldToZod(field);
  }
  
  return z.object(shape);
}

// Convert a single SDL field to Zod schema
function sdlFieldToZod(field: SDLField): z.ZodTypeAny {
  let schema: z.ZodTypeAny;
  
  switch (field.type) {
    case 'string': {
      const stringField = field as SDLStringField;
      schema = z.string();
      
      if (stringField.minLength !== undefined) {
        schema = (schema as z.ZodString).min(stringField.minLength);
      }
      
      if (stringField.maxLength !== undefined) {
        schema = (schema as z.ZodString).max(stringField.maxLength);
      }
      
      if (stringField.format === 'email') {
        schema = (schema as z.ZodString).email();
      } else if (stringField.format === 'url') {
        schema = (schema as z.ZodString).url();
      } else if (stringField.format === 'uuid') {
        schema = (schema as z.ZodString).uuid();
      }
      
      break;
    }
    
    case 'number': {
      const numberField = field as SDLNumberField;
      schema = z.number();
      
      if (numberField.min !== undefined) {
        schema = (schema as z.ZodNumber).min(numberField.min);
      }
      
      if (numberField.max !== undefined) {
        schema = (schema as z.ZodNumber).max(numberField.max);
      }
      
      if (numberField.integer) {
        schema = (schema as z.ZodNumber).int();
      }
      
      if (numberField.positive) {
        schema = (schema as z.ZodNumber).positive();
      }
      
      break;
    }
    
    case 'boolean': {
      schema = z.boolean();
      break;
    }
    
    case 'date': {
      const dateField = field as SDLDateField;
      schema = z.date();
      
      if (dateField.min !== undefined) {
        const minDate = typeof dateField.min === 'string' ? new Date(dateField.min) : dateField.min;
        schema = (schema as z.ZodDate).min(minDate);
      }
      
      if (dateField.max !== undefined) {
        const maxDate = typeof dateField.max === 'string' ? new Date(dateField.max) : dateField.max;
        schema = (schema as z.ZodDate).max(maxDate);
      }
      
      break;
    }
    
    case 'array': {
      const arrayField = field as SDLArrayField;
      schema = z.array(sdlFieldToZod(arrayField.items));
      
      if (arrayField.minItems !== undefined) {
        schema = (schema as z.ZodArray<any>).min(arrayField.minItems);
      }
      
      if (arrayField.maxItems !== undefined) {
        schema = (schema as z.ZodArray<any>).max(arrayField.maxItems);
      }
      
      break;
    }
    
    case 'object': {
      const objectField = field as SDLObjectField;
      const shape: Record<string, z.ZodTypeAny> = {};
      
      for (const [propName, propField] of Object.entries(objectField.properties)) {
        shape[propName] = sdlFieldToZod(propField);
      }
      
      schema = z.object(shape);
      break;
    }
    
    case 'enum': {
      const enumField = field as SDLEnumField;
      if (!enumField.options || enumField.options.length === 0) {
        // Fallback for empty enum
        schema = z.string();
      } else {
        schema = z.enum(enumField.options as [string, ...string[]]);
      }
      break;
    }
    
    case 'record': {
      const recordField = field as SDLRecordField;
      schema = z.record(z.string(), sdlFieldToZod(recordField.values));
      break;
    }
    
    default:
      // Default to string for unknown types
      schema = z.string();
  }
  
  // Add description if available
  if (field.description) {
    schema = schema.describe(field.description);
  }
  
  // Make optional if specified
  if (field.optional) {
    schema = schema.optional();
  }
  
  // Add default value if specified
  if (field.default !== undefined) {
    schema = schema.default(field.default);
  }
  
  return schema;
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