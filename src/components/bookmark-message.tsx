"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookmarkIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { savePromptTemplate } from "@/lib/prompt-enhancement";

// Schema for the save template form
const saveTemplateSchema = z.object({
  name: z.string().min(3, "Template name must be at least 3 characters"),
  category: z.string().optional(),
});

type SaveTemplateFormValues = z.infer<typeof saveTemplateSchema>;

interface BookmarkMessageProps {
  messageContent: string;
}

export function BookmarkMessage({ messageContent }: BookmarkMessageProps) {
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const { toast } = useToast();

  // Form setup for the save template dialog
  const form = useForm<SaveTemplateFormValues>({
    resolver: zodResolver(saveTemplateSchema),
    defaultValues: {
      name: "",
      category: "General",
    },
  });

  // Handle save template form submission
  const onSaveTemplate = async (values: SaveTemplateFormValues) => {
    try {
      await savePromptTemplate(values.name, messageContent, values.category || "General");
      
      setIsSaveDialogOpen(false);
      form.reset();
      
      toast({
        title: "Template Saved",
        description: `Template "${values.name}" has been saved successfully.`,
      });
    } catch (error) {
      console.error("Error saving template:", error);
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save the template.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      {/* Save Template Button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={() => setIsSaveDialogOpen(true)}
        disabled={!messageContent.trim()}
        title="Save as Template"
      >
        <BookmarkIcon className="h-3 w-3" />
      </Button>

      {/* Save Template Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>
              Create a reusable template from this message. It will be available in your templates library.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSaveTemplate)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter a name for this template" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value || "General"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="General">General</SelectItem>
                        <SelectItem value="Writing">Writing</SelectItem>
                        <SelectItem value="Creative">Creative</SelectItem>
                        <SelectItem value="Technical">Technical</SelectItem>
                        <SelectItem value="Business">Business</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel>Preview</FormLabel>
                <Textarea 
                  value={messageContent} 
                  readOnly 
                  className="h-24 text-sm opacity-70"
                />
              </FormItem>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Template</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
} 