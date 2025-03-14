"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchTemplates, processTemplate } from "@/lib/api-service";
import { useDocumentStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { 
  extractSchemaFromTemplate, 
  sdlToInternalSchema,
  sdlToZodSchema,
  generateInitialValues, 
  validateValues,
  SchemaField,
  SDLSchema
} from "@/lib/schema-parser";
import { SchemaForm } from "@/components/schema-form";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId?: string | null;
}

export function TemplateDialog({ open, onOpenChange, folderId = null }: TemplateDialogProps) {
  const [templates, setTemplates] = useState<{ name: string; path: string }[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [documentName, setDocumentName] = useState<string>("");
  const [documentNameError, setDocumentNameError] = useState<string>("");
  const [documentNameValid, setDocumentNameValid] = useState<boolean>(false);
  const [templateError, setTemplateError] = useState<string>("");
  const [templateValid, setTemplateValid] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // State for template content and schema
  const [templateContent, setTemplateContent] = useState<string>("");
  const [isFetchingTemplate, setIsFetchingTemplate] = useState<boolean>(false);
  
  // State for schema-based form
  const [hasSchema, setHasSchema] = useState<boolean>(false);
  const [schemaFields, setSchemaFields] = useState<Record<string, SchemaField>>({});
  const [schemaValues, setSchemaValues] = useState<Record<string, any>>({});
  const [schemaErrors, setSchemaErrors] = useState<Record<string, string>>({});
  const [formHasErrors, setFormHasErrors] = useState<boolean>(false);
  const [schemaFieldsValid, setSchemaFieldsValid] = useState<Record<string, boolean>>({});
  
  const { addDocument } = useDocumentStore();
  const router = useRouter();

  useEffect(() => {
    if (open) {
      loadTemplates();
      // Reset form when dialog opens
      setDocumentName("");
      setDocumentNameError("");
      setDocumentNameValid(false);
      setTemplateError("");
      setTemplateValid(false);
      setSchemaValues({});
      setSchemaErrors({});
      setSchemaFieldsValid({});
      setHasSchema(false);
      setFormHasErrors(false);
      setIsSubmitting(false);
    }
  }, [open]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const templateList = await fetchTemplates();
      setTemplates(templateList);
      
      // Set default template if available
      if (templateList.length > 0) {
        setSelectedTemplate(templateList[0].name);
        setTemplateValid(true);
        // Fetch the template content to check for schema
        await fetchTemplateContent(templateList[0].name);
      }
    } catch (error) {
      console.error("Error loading templates:", error);
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTemplateContent = async (templateName: string) => {
    setIsFetchingTemplate(true);
    try {
      // Fetch the template content
      const response = await fetch(`/api/templates/content?name=${encodeURIComponent(templateName)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch template content: ${response.statusText}`);
      }
      
      const data = await response.json();
      setTemplateContent(data.content);
      
      // Extract schema from template
      const rawSchema = extractSchemaFromTemplate(data.content);
      console.log("Raw schema extracted from template:", rawSchema);
      
      if (rawSchema) {
        // Convert SDL to internal schema
        const parsedSchema = sdlToInternalSchema(rawSchema);
        console.log("Parsed schema:", parsedSchema);
        
        // Log each field and its options for debugging
        Object.entries(parsedSchema).forEach(([key, field]) => {
          console.log(`Field ${key}:`, field);
          
          if (field.type === 'enum') {
            console.log(`Enum field ${key} options:`, (field as any).options);
            
            // Log each option for debugging
            (field as any).options.forEach((option: string, index: number) => {
              console.log(`  Option ${index}: "${option}"`);
            });
          }
        });
        
        setSchemaFields(parsedSchema);
        
        // Generate initial values
        const initialValues = generateInitialValues(parsedSchema);
        console.log("Generated initial values:", initialValues);
        
        // Ensure enum fields have default values
        Object.entries(parsedSchema).forEach(([key, field]) => {
          if (field.type === 'enum') {
            const options = Array.isArray((field as any).options) ? (field as any).options : [];
            console.log(`Setting up enum field ${key} with options:`, options);
            
            if (options.length > 0) {
              if (!initialValues[key] || initialValues[key] === '') {
                initialValues[key] = field.defaultValue || options[0];
                console.log(`Set default value for enum field ${key}:`, initialValues[key]);
              }
            }
          }
        });
        
        setSchemaValues(initialValues);
        
        // Initialize validation state for schema fields
        const initialValidState: Record<string, boolean> = {};
        Object.entries(parsedSchema).forEach(([key, field]) => {
          // Mark required fields with initial values as valid
          if (!field.isOptional && initialValues[key] && 
              (typeof initialValues[key] !== 'string' || initialValues[key].trim() !== '')) {
            initialValidState[key] = true;
          } else {
            initialValidState[key] = false;
          }
        });
        setSchemaFieldsValid(initialValidState);
        
        setHasSchema(true);
      } else {
        // If no schema, reset schema state
        setHasSchema(false);
        setSchemaFields({});
        setSchemaValues({});
        setSchemaErrors({});
        setSchemaFieldsValid({});
      }
    } catch (error) {
      console.error("Error fetching template content:", error);
      toast({
        title: "Error",
        description: "Failed to fetch template content",
        variant: "destructive",
      });
    } finally {
      setIsFetchingTemplate(false);
    }
  };

  // Function to handle schema form changes
  const handleSchemaFormChange = (values: Record<string, any>) => {
    console.log("Schema form values changed:", values);
    setSchemaValues(values);
    
    // Validate the values
    const errors = validateValues(values, schemaFields);
    setSchemaErrors(errors);
    setFormHasErrors(Object.keys(errors).length > 0);
    
    // Update valid state for each field
    const newValidState = { ...schemaFieldsValid };
    Object.entries(schemaFields).forEach(([key, field]) => {
      if (!field.isOptional) {
        // Check if the field has a value and no error
        const hasValue = values[key] !== undefined && values[key] !== null && 
                        (typeof values[key] !== 'string' || values[key].trim() !== '');
        const hasError = errors[key] !== undefined;
        newValidState[key] = hasValue && !hasError;
      }
    });
    setSchemaFieldsValid(newValidState);
  };

  // Validate document name
  const validateDocumentName = (): boolean => {
    if (!documentName.trim()) {
      setDocumentNameError("Document name is required");
      setDocumentNameValid(false);
      return false;
    }
    setDocumentNameError("");
    setDocumentNameValid(true);
    return true;
  };

  // Validate template selection
  const validateTemplate = (): boolean => {
    if (!selectedTemplate) {
      setTemplateError("Please select a template");
      setTemplateValid(false);
      return false;
    }
    setTemplateError("");
    setTemplateValid(true);
    return true;
  };

  // Validate schema values
  const validateSchemaValues = (): boolean => {
    if (!hasSchema) return true;
    
    const errors = validateValues(schemaValues, schemaFields);
    setSchemaErrors(errors);
    setFormHasErrors(Object.keys(errors).length > 0);
    
    // Update valid state for each field
    const newValidState = { ...schemaFieldsValid };
    Object.entries(schemaFields).forEach(([key, field]) => {
      if (!field.isOptional) {
        // Check if the field has a value and no error
        const hasValue = schemaValues[key] !== undefined && schemaValues[key] !== null && 
                        (typeof schemaValues[key] !== 'string' || schemaValues[key].trim() !== '');
        const hasError = errors[key] !== undefined;
        newValidState[key] = hasValue && !hasError;
      }
    });
    setSchemaFieldsValid(newValidState);
    
    return Object.keys(errors).length === 0;
  };

  const handleCreateDocument = async () => {
    setIsSubmitting(true);
    
    // Validate all inputs
    const isDocumentNameValid = validateDocumentName();
    const isTemplateValid = validateTemplate();
    const areSchemaValuesValid = validateSchemaValues();
    
    // If any validation fails, stop here
    if (!isDocumentNameValid || !isTemplateValid || !areSchemaValuesValid) {
      setIsSubmitting(false);
      return;
    }

    try {
      // Process the template with variables
      const variables: Record<string, any> = {
        title: documentName,
        date: new Date().toISOString(),
        time: new Date().toLocaleTimeString(),
      };
      
      if (hasSchema) {
        // Use schema values
        Object.entries(schemaValues).forEach(([key, value]) => {
          variables[key] = value;
        });
      }
      
      const content = await processTemplate(selectedTemplate, variables);
      
      // Create the document
      const newDocId = await addDocument(documentName, content, folderId);
      
      // Close the dialog
      onOpenChange(false);
      
      // Navigate to the new document
      router.push(`/documents/${newDocId}`);
      
      toast({
        title: "Success",
        description: `Document "${documentName}" created from template "${selectedTemplate}"`,
      });
    } catch (error) {
      console.error("Error creating document from template:", error);
      toast({
        title: "Error",
        description: "Failed to create document from template",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle template selection change
  const handleTemplateChange = async (templateName: string) => {
    setSelectedTemplate(templateName);
    setTemplateError("");
    setTemplateValid(true);
    await fetchTemplateContent(templateName);
  };

  // Handle document name change
  const handleDocumentNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDocumentName(e.target.value);
    if (e.target.value.trim()) {
      setDocumentNameError("");
      setDocumentNameValid(true);
    } else {
      setDocumentNameValid(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Document from Template</DialogTitle>
          <DialogDescription>
            Select a template and provide details for your new document.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Basic Info Section */}
          <div className="space-y-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right flex items-center justify-end">
                Name 
                {documentNameValid ? (
                  <CheckCircle2 className="ml-1 h-4 w-4 text-green-500" />
                ) : (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </Label>
              <div className="col-span-3 space-y-1">
                <Input
                  id="name"
                  value={documentName}
                  onChange={handleDocumentNameChange}
                  className={documentNameError ? "border-red-500" : documentNameValid ? "border-green-500" : ""}
                  placeholder="Document name"
                  autoFocus
                  onBlur={validateDocumentName}
                />
                {documentNameError && (
                  <p className="text-xs text-red-500">{documentNameError}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="template" className="text-right flex items-center justify-end">
                Template 
                {templateValid ? (
                  <CheckCircle2 className="ml-1 h-4 w-4 text-green-500" />
                ) : (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </Label>
              <div className="col-span-3 space-y-1">
                <Select
                  value={selectedTemplate}
                  onValueChange={handleTemplateChange}
                  disabled={templates.length === 0 || isLoading}
                >
                  <SelectTrigger className={templateError ? "border-red-500" : templateValid ? "border-green-500" : ""}>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.name} value={template.name}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {templateError && (
                  <p className="text-xs text-red-500">{templateError}</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Template Variables Section */}
          <div className="space-y-4 mt-6">
            <h3 className="text-lg font-medium">Template Variables</h3>
            
            {formHasErrors && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please fix the errors in the form before continuing.
                </AlertDescription>
              </Alert>
            )}
            
            {isFetchingTemplate ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading template...</span>
              </div>
            ) : hasSchema ? (
              <div className="space-y-4">
                <SchemaForm
                  schema={schemaFields}
                  initialValues={schemaValues}
                  onChange={handleSchemaFormChange}
                  errors={schemaErrors}
                  validFields={schemaFieldsValid}
                />
              </div>
            ) : (
              <div className="p-4 border rounded-md bg-muted/50">
                <h3 className="text-lg font-medium mb-2">No Schema Defined</h3>
                <p className="text-sm text-muted-foreground">
                  This template doesn't have a schema defined. To use advanced features, 
                  add a schema definition to your template using the following syntax:
                </p>
                <pre className="mt-2 p-2 bg-muted rounded-md text-xs overflow-x-auto">
                  {`{% set schema = {
  "fields": {
    "description": {
      "type": "string",
      "description": "Brief description of the document"
    },
    "priority": {
      "type": "enum",
      "options": ["High", "Medium", "Low"],
      "description": "Priority level"
    },
    "dueDate": {
      "type": "date",
      "description": "When this is due"
    }
  }
} %}`}
                </pre>
              </div>
            )}
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="built-in-variables">
                <AccordionTrigger>Built-in Variables</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-sm">
                    <p><strong>title</strong>: The document name you entered</p>
                    <p><strong>date</strong>: Current date (ISO format)</p>
                    <p><strong>dateFormatted</strong>: Formatted date (e.g., "April 15, 2023")</p>
                    <p><strong>time</strong>: Current time</p>
                    <p><strong>timeFormatted</strong>: Formatted time (e.g., "3:45 PM")</p>
                    <p><strong>year, month, day</strong>: Current year, month, and day</p>
                    <p className="text-muted-foreground mt-2">
                      These variables are automatically available in all templates.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="template-example">
                <AccordionTrigger>Template Example</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-sm">
                    <p className="font-mono bg-muted p-2 rounded">
                      # &#123;&#123; title &#125;&#125;<br />
                      Created on &#123;&#123; date | dateFormat('MMMM d, yyyy') &#125;&#125;<br /><br />
                      &#123;% if description %&#125;<br />
                      &#123;&#123; description &#125;&#125;<br />
                      &#123;% else %&#125;<br />
                      Start writing here...<br />
                      &#123;% endif %&#125;
                    </p>
                    <p className="text-muted-foreground mt-2">
                      Templates use Nunjucks syntax for variable substitution and control flow.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateDocument} 
            disabled={isSubmitting || isLoading}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Document"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 