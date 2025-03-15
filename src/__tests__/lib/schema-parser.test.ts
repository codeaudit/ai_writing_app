import { z } from 'zod';
import {
  extractSchemaFromTemplate,
  sdlToInternalSchema,
  sdlToZodSchema,
  generateInitialValues,
  validateValues,
  SchemaField,
  SDLSchema,
  NumberField,
  StringField,
  BooleanField,
  DateField,
  ArrayField,
  ObjectField,
  EnumField,
  RecordField,
  SDLField,
  SDLStringField,
  SDLNumberField,
  SDLBooleanField,
  SDLDateField,
  SDLArrayField,
  SDLObjectField,
  SDLEnumField,
  SDLRecordField
} from '../../lib/schema-parser';

// Import the function directly from the module for testing
import { sdlFieldToInternal } from '../../lib/schema-parser';

describe('schema-parser', () => {
  describe('extractSchemaFromTemplate', () => {
    it('should extract schema from template content', () => {
      const templateContent = `---
schema:
  fields:
    title:
      type: string
      description: The title of the document
    age:
      type: number
      integer: true
      min: 0
    isPublished:
      type: boolean
      default: false
---
# {{ title }}
`;

      const result = extractSchemaFromTemplate(templateContent);
      
      expect(result).toEqual({
        fields: {
          title: {
            type: 'string',
            description: 'The title of the document'
          },
          age: {
            type: 'number',
            integer: true,
            min: 0
          },
          isPublished: {
            type: 'boolean',
            default: false
          }
        }
      });
    });

    it('should return null if no schema is found', () => {
      const templateContent = `---
title: Some document
---
# Content
`;

      const result = extractSchemaFromTemplate(templateContent);
      
      expect(result).toBeNull();
    });

    it('should return null for invalid YAML', () => {
      const templateContent = `---
schema:
  fields:
    title: - invalid yaml
---
# Content
`;

      const result = extractSchemaFromTemplate(templateContent);
      
      expect(result).toBeNull();
    });
  });

  describe('sdlToInternalSchema', () => {
    it('should convert SDL schema to internal schema format', () => {
      const sdlSchema: SDLSchema = {
        fields: {
          title: {
            type: 'string',
            description: 'The title of the document'
          },
          age: {
            type: 'number',
            integer: true,
            min: 0
          }
        }
      };

      const result = sdlToInternalSchema(sdlSchema);
      
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('age');
      expect(result.title.type).toBe('string');
      expect(result.title.description).toBe('The title of the document');
      expect(result.age.type).toBe('number');
      // Cast to NumberField to access number-specific properties
      expect((result.age as NumberField).isInteger).toBe(true);
      expect((result.age as NumberField).min).toBe(0);
    });
  });

  describe('sdlFieldToInternal', () => {
    it('should convert string SDL field to internal format', () => {
      const sdlField: SDLStringField = {
        type: 'string',
        description: 'A string field',
        minLength: 5,
        maxLength: 100,
        format: 'email',
        optional: true,
        default: 'default@example.com'
      };

      const result = sdlFieldToInternal('email', sdlField);
      
      expect(result.type).toBe('string');
      expect(result.name).toBe('email');
      expect(result.description).toBe('A string field');
      expect((result as StringField).minLength).toBe(5);
      expect((result as StringField).maxLength).toBe(100);
      expect((result as StringField).format).toBe('email');
      expect(result.isOptional).toBe(true);
      expect(result.defaultValue).toBe('default@example.com');
    });

    it('should convert number SDL field to internal format', () => {
      const sdlField: SDLNumberField = {
        type: 'number',
        description: 'A number field',
        min: 0,
        max: 100,
        integer: true,
        positive: true,
        optional: false
      };

      const result = sdlFieldToInternal('count', sdlField);
      
      expect(result.type).toBe('number');
      expect(result.name).toBe('count');
      expect(result.description).toBe('A number field');
      expect((result as NumberField).min).toBe(0);
      expect((result as NumberField).max).toBe(100);
      expect((result as NumberField).isInteger).toBe(true);
      expect((result as NumberField).isPositive).toBe(true);
      expect(result.isOptional).toBe(false);
    });

    it('should convert boolean SDL field to internal format', () => {
      const sdlField: SDLBooleanField = {
        type: 'boolean',
        description: 'A boolean field',
        default: true
      };

      const result = sdlFieldToInternal('isActive', sdlField);
      
      expect(result.type).toBe('boolean');
      expect(result.name).toBe('isActive');
      expect(result.description).toBe('A boolean field');
      expect(result.defaultValue).toBe(true);
      expect(result.isOptional).toBe(false);
    });

    it('should convert date SDL field to internal format', () => {
      const now = new Date();
      const sdlField: SDLDateField = {
        type: 'date',
        description: 'A date field',
        min: '2023-01-01',
        max: now.toISOString()
      };

      const result = sdlFieldToInternal('publishDate', sdlField);
      
      expect(result.type).toBe('date');
      expect(result.name).toBe('publishDate');
      expect(result.description).toBe('A date field');
      expect((result as DateField).min instanceof Date).toBe(true);
      expect((result as DateField).max instanceof Date).toBe(true);
      expect(result.isOptional).toBe(false);
    });

    it('should convert array SDL field to internal format', () => {
      const sdlField: SDLArrayField = {
        type: 'array',
        description: 'An array field',
        minItems: 1,
        maxItems: 5,
        items: {
          type: 'string',
          description: 'A string item'
        }
      };

      const result = sdlFieldToInternal('tags', sdlField);
      
      expect(result.type).toBe('array');
      expect(result.name).toBe('tags');
      expect(result.description).toBe('An array field');
      expect((result as ArrayField).minItems).toBe(1);
      expect((result as ArrayField).maxItems).toBe(5);
      expect((result as ArrayField).itemType.type).toBe('string');
      expect(result.isOptional).toBe(false);
    });

    it('should convert object SDL field to internal format', () => {
      const sdlField: SDLObjectField = {
        type: 'object',
        description: 'An object field',
        properties: {
          name: {
            type: 'string',
            description: 'Name property'
          },
          age: {
            type: 'number',
            description: 'Age property'
          }
        }
      };

      const result = sdlFieldToInternal('person', sdlField);
      
      expect(result.type).toBe('object');
      expect(result.name).toBe('person');
      expect(result.description).toBe('An object field');
      expect((result as ObjectField).properties.length).toBe(2);
      expect((result as ObjectField).properties[0].name).toBe('name');
      expect((result as ObjectField).properties[1].name).toBe('age');
      expect(result.isOptional).toBe(false);
    });

    it('should convert enum SDL field to internal format', () => {
      const sdlField: SDLEnumField = {
        type: 'enum',
        description: 'An enum field',
        options: ['draft', 'published', 'archived']
      };

      const result = sdlFieldToInternal('status', sdlField);
      
      expect(result.type).toBe('enum');
      expect(result.name).toBe('status');
      expect(result.description).toBe('An enum field');
      expect((result as EnumField).options).toEqual(['draft', 'published', 'archived']);
      expect(result.isOptional).toBe(false);
    });

    it('should convert record SDL field to internal format', () => {
      const sdlField: SDLRecordField = {
        type: 'record',
        description: 'A record field',
        values: {
          type: 'string',
          description: 'String values'
        }
      };

      const result = sdlFieldToInternal('metadata', sdlField);
      
      expect(result.type).toBe('record');
      expect(result.name).toBe('metadata');
      expect(result.description).toBe('A record field');
      expect((result as RecordField).valueType.type).toBe('string');
      expect(result.isOptional).toBe(false);
    });
  });

  describe('generateInitialValues', () => {
    it('should generate initial values from schema', () => {
      const schema: Record<string, SchemaField> = {
        title: {
          type: 'string',
          name: 'title',
          description: 'Title',
          isOptional: false
        },
        count: {
          type: 'number',
          name: 'count',
          description: 'Count',
          isOptional: false,
          defaultValue: 0
        },
        isActive: {
          type: 'boolean',
          name: 'isActive',
          description: 'Is Active',
          isOptional: false,
          defaultValue: true
        },
        tags: {
          type: 'array',
          name: 'tags',
          description: 'Tags',
          isOptional: true,
          itemType: {
            type: 'string',
            name: 'tag',
            description: 'Tag',
            isOptional: false
          }
        }
      };

      const result = generateInitialValues(schema);
      
      expect(result).toEqual({
        title: '',
        count: 0,
        isActive: true,
        tags: []
      });
    });

    it('should use default values when provided', () => {
      const schema: Record<string, SchemaField> = {
        title: {
          type: 'string',
          name: 'title',
          description: 'Title',
          isOptional: false,
          defaultValue: 'Default Title'
        },
        publishDate: {
          type: 'date',
          name: 'publishDate',
          description: 'Publish Date',
          isOptional: false,
          defaultValue: new Date('2023-01-01')
        }
      };

      const result = generateInitialValues(schema);
      
      expect(result).toEqual({
        title: 'Default Title',
        publishDate: new Date('2023-01-01')
      });
    });
  });

  describe('validateValues', () => {
    it('should validate values against schema with no errors', () => {
      const schema: Record<string, SchemaField> = {
        title: {
          type: 'string',
          name: 'title',
          description: 'Title',
          isOptional: false
        },
        count: {
          type: 'number',
          name: 'count',
          description: 'Count',
          isOptional: false,
          min: 0
        }
      };

      const values = {
        title: 'Test Title',
        count: 10
      };

      const result = validateValues(values, schema);
      
      expect(result).toEqual({});
    });

    it('should return validation errors for invalid values', () => {
      const schema: Record<string, SchemaField> = {
        title: {
          type: 'string',
          name: 'title',
          description: 'Title',
          isOptional: false,
          minLength: 5
        },
        count: {
          type: 'number',
          name: 'count',
          description: 'Count',
          isOptional: false,
          min: 0,
          max: 100
        }
      };

      const values = {
        title: 'Test',
        count: 150
      };

      const result = validateValues(values, schema);
      
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('count');
      expect(result.title).toContain('Must be at least');
      expect(result.count).toContain('Must be at most');
    });

    it('should validate required fields', () => {
      const schema: Record<string, SchemaField> = {
        title: {
          type: 'string',
          name: 'title',
          description: 'Title',
          isOptional: false
        },
        subtitle: {
          type: 'string',
          name: 'subtitle',
          description: 'Subtitle',
          isOptional: true
        }
      };

      const values = {
        subtitle: 'Optional Subtitle'
      };

      const result = validateValues(values, schema);
      
      expect(result).toHaveProperty('title');
      expect(result.title).toContain('Must be a string');
    });
  });
});
