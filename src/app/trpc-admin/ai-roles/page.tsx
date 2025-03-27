'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import AIRoleEditor from '@/components/ai-role-editor';
import { trpc } from '@/utils/trpc';

export default function TrpcAIRolesAdminPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [content, setContent] = useState('');
  
  // Use tRPC to fetch AI roles content
  const { data, isLoading: isTrpcLoading, error } = trpc.admin.getAIRoles.useQuery();
  
  // Use tRPC to save AI roles content
  const saveAIRolesMutation = trpc.admin.saveAIRoles.useMutation();
  
  // Update content when data is loaded
  useEffect(() => {
    if (data) {
      setContent(data.content);
      setIsLoading(false);
    }
  }, [data]);
  
  // Handle loading state
  useEffect(() => {
    setIsLoading(isTrpcLoading);
  }, [isTrpcLoading]);
  
  // Handle errors
  useEffect(() => {
    if (error) {
      console.error('Error loading AI roles:', error);
      toast({
        title: 'Error',
        description: 'Failed to load AI roles configuration',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  }, [error]);
  
  // Function to save the markdown content
  const handleSave = async (updatedContent: string) => {
    try {
      await saveAIRolesMutation.mutateAsync({ content: updatedContent });
      
      // Update the local content state
      setContent(updatedContent);
      
      toast({
        title: 'Success',
        description: 'AI roles configuration saved successfully',
      });
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error saving AI roles:', error);
      toast({
        title: 'Error',
        description: 'Failed to save AI roles configuration',
        variant: 'destructive',
      });
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
              onClick={() => router.push('/trpc-settings')}
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
          ) : error ? (
            <div className="text-center p-8 text-red-500">
              <p>Failed to load AI roles configuration</p>
              <Button 
                variant="outline" 
                onClick={() => router.refresh()}
                className="mt-4"
              >
                Retry
              </Button>
            </div>
          ) : (
            <AIRoleEditor markdownContent={content} onSave={handleSave} />
          )}
        </CardContent>
      </Card>
    </div>
  );
} 