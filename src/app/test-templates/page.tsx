'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PromptTemplate } from '@/lib/prompt-enhancement';

export default function TestTemplatesPage() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [category, setCategory] = useState<string>('General');
  const [saveStatus, setSaveStatus] = useState<{ success?: boolean; message?: string }>({});

  // Fetch templates on component mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  // Function to fetch templates
  async function fetchTemplates() {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/templates');
      if (!response.ok) {
        throw new Error(`Error fetching templates: ${response.statusText}`);
      }
      
      const data = await response.json();
      setTemplates(data.map((template: any) => ({
        id: template.name,
        name: template.name,
        content: '',
        category: template.category || 'General',
        createdAt: new Date(template.createdAt || Date.now()),
        updatedAt: new Date(template.updatedAt || Date.now())
      })));
    } catch (error) {
      console.error('Error fetching templates:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while fetching templates');
    } finally {
      setLoading(false);
    }
  }

  // Function to save a template
  async function saveTemplate(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaveStatus({ message: 'Saving...' });
      
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          content,
          category
        }),
      });

      if (!response.ok) {
        throw new Error(`Error saving template: ${response.statusText}`);
      }

      const result = await response.json();
      setSaveStatus({ success: true, message: 'Template saved successfully!' });
      
      // Clear form and refresh templates
      setName('');
      setContent('');
      setCategory('General');
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      setSaveStatus({ 
        success: false, 
        message: error instanceof Error ? error.message : 'An error occurred while saving the template'
      });
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Templates API Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Templates List */}
        <Card>
          <CardHeader>
            <CardTitle>Templates</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading templates...</p>
            ) : error ? (
              <p className="text-red-500">{error}</p>
            ) : templates.length === 0 ? (
              <p>No templates found.</p>
            ) : (
              <ul className="space-y-2">
                {templates.map((template) => (
                  <li key={template.id} className="border p-3 rounded-md">
                    <h3 className="font-medium">{template.name}</h3>
                    <p className="text-sm text-gray-500">Category: {template.category}</p>
                    <p className="text-xs text-gray-400">
                      Created: {template.createdAt.toLocaleDateString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <Button onClick={fetchTemplates} className="mt-4" variant="outline">
              Refresh
            </Button>
          </CardContent>
        </Card>
        
        {/* Save Template Form */}
        <Card>
          <CardHeader>
            <CardTitle>Save Template</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveTemplate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Template name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="Writing">Writing</SelectItem>
                    <SelectItem value="Coding">Coding</SelectItem>
                    <SelectItem value="Research">Research</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Template content"
                  rows={5}
                  required
                />
              </div>
              
              <Button type="submit">Save Template</Button>
              
              {saveStatus.message && (
                <p className={`mt-2 ${saveStatus.success ? 'text-green-500' : 'text-red-500'}`}>
                  {saveStatus.message}
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 