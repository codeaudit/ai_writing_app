'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import AIRoleEditor from '@/components/ai-role-editor';

export default function AIRolesAdminPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [content, setContent] = useState('');
  
  // Function to load the markdown content
  const loadContent = async () => {
    setIsLoading(true);
    try {
      // Fetch the markdown content
      const response = await fetch('/api/admin/ai-roles');
      if (!response.ok) {
        throw new Error('Failed to load AI roles configuration');
      }
      const data = await response.json();
      setContent(data.content);
    } catch (error) {
      console.error('Error loading AI roles:', error);
      toast({
        title: 'Error',
        description: 'Failed to load AI roles configuration',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    loadContent();
  }, []);
  
  // Function to save the markdown content
  const handleSave = async (updatedContent: string) => {
    try {
      const response = await fetch('/api/admin/ai-roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: updatedContent }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save AI roles configuration');
      }
      
      // Update the local content state
      setContent(updatedContent);
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error saving AI roles:', error);
      return Promise.reject(error);
    }
  };
  
  return (
    <div className="container mx-auto py-8">
      <Card className="w-full max-w-5xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">AI Roles Configuration</CardTitle>
              <CardDescription>
                Customize the system prompts for different AI roles. Each role has its own system prompt that guides the AI&apos;s behavior.
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={() => router.push('/settings')}
              className="flex items-center"
            >
              <ArrowLeft size={14} className="mr-2" />
              Back to Settings
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <AIRoleEditor markdownContent={content} onSave={handleSave} />
          )}
        </CardContent>
      </Card>
    </div>
  );
} 