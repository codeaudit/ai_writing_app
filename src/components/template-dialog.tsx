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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2 } from "lucide-react";

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId?: string | null;
}

interface TemplateVariable {
  name: string;
  value: string;
  description: string;
}

interface DetectedVariable {
  name: string;
  value: string;
}

export function TemplateDialog({ open, onOpenChange, folderId = null }: TemplateDialogProps) {
  const [templates, setTemplates] = useState<{ name: string; path: string }[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [documentName, setDocumentName] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("basic");
  const [customVariables, setCustomVariables] = useState<TemplateVariable[]>([
    { name: "description", value: "", description: "Brief description of the document" },
    { name: "location", value: "", description: "Location (for meeting notes)" },
    { name: "attendees", value: "", description: "Comma-separated list of attendees" },
    { name: "goals", value: "", description: "Comma-separated list of goals" },
    { name: "morningThoughts", value: "", description: "Morning thoughts for journal entries" },
  ]);
  
  // Add state for detected variables from template
  const [detectedVariables, setDetectedVariables] = useState<DetectedVariable[]>([]);
  const [templateContent, setTemplateContent] = useState<string>("");
  const [isFetchingTemplate, setIsFetchingTemplate] = useState<boolean>(false);
  
  const { addDocument } = useDocumentStore();
  const router = useRouter();

  useEffect(() => {
    if (open) {
      loadTemplates();
      // Reset form when dialog opens
      setDocumentName("");
      setCustomVariables(customVariables.map(v => ({ ...v, value: "" })));
      setDetectedVariables([]);
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
        // Fetch the template content to scan for variables
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

  // Function to fetch template content and scan for variables
  const fetchTemplateContent = async (templateName: string) => {
    setIsFetchingTemplate(true);
    try {
      // Fetch the template content from the server
      // This is a mock implementation - you'll need to create an API endpoint to get the raw template content
      const response = await fetch(`/api/templates/content?name=${encodeURIComponent(templateName)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch template content');
      }
      
      const { content } = await response.json();
      setTemplateContent(content);
      
      // Scan for variables in the template
      scanTemplateForVariables(content);
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

  // Function to scan template content for variables
  const scanTemplateForVariables = (content: string) => {
    // Reset detected variables
    const newDetectedVariables: DetectedVariable[] = [];
    
    // Regular expression to find Nunjucks variables like {{ variable }}
    // This regex looks for {{ variableName }} patterns, excluding some built-in variables
    const variableRegex = /\{\{\s*([a-zA-Z0-9_]+)\s*(?:\|[^}]+)?\s*\}\}/g;
    const builtInVariables = ['title', 'date', 'time', 'dateFormatted', 'timeFormatted', 'timestamp', 'year', 'month', 'day'];
    
    // Find all matches
    let match;
    const foundVariables = new Set<string>();
    
    while ((match = variableRegex.exec(content)) !== null) {
      const variableName = match[1].trim();
      
      // Skip built-in variables and duplicates
      if (!builtInVariables.includes(variableName) && !foundVariables.has(variableName)) {
        foundVariables.add(variableName);
        
        // Check if this variable is already in customVariables
        const existingVar = customVariables.find(v => v.name === variableName);
        
        newDetectedVariables.push({
          name: variableName,
          value: existingVar?.value || ""
        });
      }
    }
    
    // Also scan for variables in for loops and if statements
    // For example: {% for item in items %} or {% if variable %}
    const controlRegex = /\{%\s*(?:for\s+\w+\s+in\s+([a-zA-Z0-9_]+)|if\s+([a-zA-Z0-9_]+))\s*%\}/g;
    
    while ((match = controlRegex.exec(content)) !== null) {
      const variableName = (match[1] || match[2]).trim();
      
      // Skip built-in variables and duplicates
      if (!builtInVariables.includes(variableName) && !foundVariables.has(variableName)) {
        foundVariables.add(variableName);
        
        // Check if this variable is already in customVariables
        const existingVar = customVariables.find(v => v.name === variableName);
        
        newDetectedVariables.push({
          name: variableName,
          value: existingVar?.value || ""
        });
      }
    }
    
    setDetectedVariables(newDetectedVariables);
  };

  const updateCustomVariable = (index: number, value: string) => {
    const updatedVariables = [...customVariables];
    updatedVariables[index].value = value;
    setCustomVariables(updatedVariables);
  };

  // Function to update detected variable value
  const updateDetectedVariable = (index: number, value: string) => {
    const updatedVariables = [...detectedVariables];
    updatedVariables[index].value = value;
    setDetectedVariables(updatedVariables);
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

    setIsLoading(true);
    try {
      // Process the template with variables
      const variables: Record<string, string | string[]> = {
        title: documentName,
        date: new Date().toISOString(),
        time: new Date().toLocaleTimeString(),
      };
      
      // Add custom variables
      customVariables.forEach(variable => {
        if (variable.value) {
          // Handle special cases for arrays
          if (variable.name === "attendees" || variable.name === "goals") {
            variables[variable.name] = variable.value.split(',').map(item => item.trim());
          } else {
            variables[variable.name] = variable.value;
          }
        }
      });
      
      // Add detected variables
      detectedVariables.forEach(variable => {
        if (variable.value) {
          variables[variable.name] = variable.value;
        }
      });
      
      const content = await processTemplate(selectedTemplate, variables as Record<string, string>);
      
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

  // Get relevant variables based on selected template
  const getRelevantVariables = () => {
    if (selectedTemplate === "meeting") {
      return customVariables.filter(v => ["description", "location", "attendees"].includes(v.name));
    } else if (selectedTemplate === "journal") {
      return customVariables.filter(v => ["morningThoughts", "goals"].includes(v.name));
    } else {
      return customVariables.filter(v => ["description"].includes(v.name));
    }
  };

  // Handle template selection change
  const handleTemplateChange = async (templateName: string) => {
    setSelectedTemplate(templateName);
    await fetchTemplateContent(templateName);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
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
            
            {selectedTemplate && (
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="description" className="text-right pt-2">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={customVariables.find(v => v.name === "description")?.value || ""}
                  onChange={(e) => updateCustomVariable(
                    customVariables.findIndex(v => v.name === "description"),
                    e.target.value
                  )}
                  className="col-span-3 min-h-[80px]"
                  placeholder="Brief description of the document"
                />
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="advanced" className="space-y-4">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="template-variables">
                <AccordionTrigger>Template-Specific Variables</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    {getRelevantVariables().map((variable, index) => (
                      <div key={variable.name} className="grid grid-cols-4 items-start gap-4">
                        <Label htmlFor={variable.name} className="text-right pt-2">
                          {variable.name.charAt(0).toUpperCase() + variable.name.slice(1)}
                        </Label>
                        {variable.name === "morningThoughts" ? (
                          <Textarea
                            id={variable.name}
                            value={variable.value}
                            onChange={(e) => updateCustomVariable(
                              customVariables.findIndex(v => v.name === variable.name),
                              e.target.value
                            )}
                            className="col-span-3 min-h-[80px]"
                            placeholder={variable.description}
                          />
                        ) : (
                          <Input
                            id={variable.name}
                            value={variable.value}
                            onChange={(e) => updateCustomVariable(
                              customVariables.findIndex(v => v.name === variable.name),
                              e.target.value
                            )}
                            className="col-span-3"
                            placeholder={variable.description}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              {detectedVariables.length > 0 && (
                <AccordionItem value="detected-variables">
                  <AccordionTrigger>
                    Detected Template Variables
                    {isFetchingTemplate && (
                      <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    )}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      {detectedVariables.map((variable, index) => (
                        <div key={variable.name} className="grid grid-cols-4 items-start gap-4">
                          <Label htmlFor={`detected-${variable.name}`} className="text-right pt-2">
                            {variable.name.charAt(0).toUpperCase() + variable.name.slice(1)}
                          </Label>
                          <Input
                            id={`detected-${variable.name}`}
                            value={variable.value}
                            onChange={(e) => updateDetectedVariable(index, e.target.value)}
                            className="col-span-3"
                            placeholder={`Value for ${variable.name}`}
                          />
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
              
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