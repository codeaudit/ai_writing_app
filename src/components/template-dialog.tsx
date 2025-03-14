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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2 } from "lucide-react";
import { 
  extractSchemaFromTemplate, 
  parseZodSchema, 
  generateInitialValues, 
  validateValues,
  SchemaField
} from "@/lib/schema-parser";
import { SchemaForm } from "@/components/schema-form";

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId?: string | null;
}

export function TemplateDialog({ open, onOpenChange, folderId = null }: TemplateDialogProps) {
  const [templates, setTemplates] = useState<{ name: string; path: string }[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [documentName, setDocumentName] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("basic");
  
  // State for template content and schema
  const [templateContent, setTemplateContent] = useState<string>("");
  const [isFetchingTemplate, setIsFetchingTemplate] = useState<boolean>(false);
  
  // State for schema-based form
  const [hasSchema, setHasSchema] = useState<boolean>(false);
  const [schemaFields, setSchemaFields] = useState<Record<string, SchemaField>>({});
  const [schemaValues, setSchemaValues] = useState<Record<string, any>>({});
  const [schemaErrors, setSchemaErrors] = useState<Record<string, string>>({});
  
  const { addDocument } = useDocumentStore();
  const router = useRouter();

  useEffect(() => {
    if (open) {
      loadTemplates();
      // Reset form when dialog opens
      setDocumentName("");
      setSchemaValues({});
      setSchemaErrors({});
      setHasSchema(false);
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

  // Function to fetch template content and extract schema
  const fetchTemplateContent = async (templateName: string) => {
    setIsFetchingTemplate(true);
    setHasSchema(false);
    setSchemaFields({});
    setSchemaValues({});
    
    try {
      // Fetch the template content from the server
      const response = await fetch(`/api/templates/content?name=${encodeURIComponent(templateName)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch template content');
      }
      
      const { content } = await response.json();
      setTemplateContent(content);
      
      // Check if the template has a schema
      const schema = extractSchemaFromTemplate(content);
      
      if (schema) {
        // Parse the schema
        const parsedSchema = parseZodSchema(schema);
        setSchemaFields(parsedSchema);
        
        // Generate initial values
        const initialValues = generateInitialValues(parsedSchema);
        setSchemaValues(initialValues);
        
        setHasSchema(true);
      } else {
        // If no schema, show a message to the user
        toast({
          title: "No Schema Found",
          description: "This template doesn't have a schema defined. Please add a schema to use advanced features.",
          variant: "default",
        });
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
    setSchemaValues(values);
    
    // Validate the values
    const errors = validateValues(values, schemaFields);
    setSchemaErrors(errors);
  };

  const handleCreateDocument = async () => {
    if (!documentName.trim()) {
      toast({
        title: "Error",
        description: "Document name is required",
        variant: "destructive",
      });
      return;
    }

    if (!selectedTemplate) {
      toast({
        title: "Error",
        description: "Please select a template",
        variant: "destructive",
      });
      return;
    }

    // If using schema, validate the values
    if (hasSchema) {
      const errors = validateValues(schemaValues, schemaFields);
      setSchemaErrors(errors);
      
      if (Object.keys(errors).length > 0) {
        toast({
          title: "Validation Error",
          description: "Please fix the errors in the form",
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  // Handle template selection change
  const handleTemplateChange = async (templateName: string) => {
    setSelectedTemplate(templateName);
    await fetchTemplateContent(templateName);
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
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="advanced">Template Variables</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                className="col-span-3"
                placeholder="Document name"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="template" className="text-right">
                Template
              </Label>
              <Select
                value={selectedTemplate}
                onValueChange={handleTemplateChange}
                disabled={templates.length === 0 || isLoading}
              >
                <SelectTrigger className="col-span-3">
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
            </div>
          </TabsContent>
          
          <TabsContent value="advanced" className="space-y-4">
            {isFetchingTemplate ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading template...</span>
              </div>
            ) : hasSchema ? (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Template Variables</h3>
                <SchemaForm
                  schema={schemaFields}
                  initialValues={schemaValues}
                  onChange={handleSchemaFormChange}
                  errors={schemaErrors}
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
  description: "z.string().describe('Brief description of the document')",
  priority: "z.enum(['High', 'Medium', 'Low']).describe('Priority level')",
  dueDate: "z.date().describe('When this is due')"
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
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateDocument} disabled={isLoading}>
            {isLoading ? (
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