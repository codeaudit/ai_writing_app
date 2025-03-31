import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Info, Settings, Code, FileText, PenTool, Brain, Download } from 'lucide-react';

interface Tool {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  installed: boolean;
}

export function ToolSettings() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock function to fetch available tools
  const fetchTools = async () => {
    setLoading(true);
    
    try {
      // In production, this would be a real API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
      
      const mockTools: Tool[] = [
        {
          id: 'smart-template',
          name: 'Smart Templates Generator',
          description: 'Generate customized writing templates based on your requirements',
          category: 'writing',
          enabled: true,
          installed: true
        },
        {
          id: 'narrative-structure',
          name: 'Narrative Structure Analyzer',
          description: 'Analyze and provide feedback on story structure and narrative flow',
          category: 'analysis',
          enabled: true,
          installed: true
        },
        {
          id: 'metaphor-enhancer',
          name: 'Metaphor & Imagery Enhancer',
          description: 'Suggest improvements to metaphors and imagery in your writing',
          category: 'enhancement',
          enabled: false,
          installed: true
        },
        {
          id: 'knowledge-graph',
          name: 'Semantic Knowledge Graph',
          description: 'Create knowledge graphs from your documents to visualize relationships',
          category: 'organization',
          enabled: false,
          installed: true
        },
        {
          id: 'document-analyzer',
          name: 'Document Analyzer',
          description: 'Analyze document structure, readability, and content quality',
          category: 'analysis',
          enabled: true,
          installed: true
        }
      ];
      
      setTools(mockTools);
    } catch (error) {
      console.error('Error fetching tools:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch AI tools. Please try again later.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleToolEnabled = (toolId: string) => {
    setTools(tools.map(tool => 
      tool.id === toolId ? { ...tool, enabled: !tool.enabled } : tool
    ));
    
    const tool = tools.find(t => t.id === toolId);
    if (tool) {
      toast({
        title: 'Success',
        description: `${tool.name} has been ${tool.enabled ? 'disabled' : 'enabled'}.`,
        variant: 'default'
      });
    }
  };

  const configureTool = (toolId: string) => {
    // This would open a configuration modal or navigate to a config page
    const tool = tools.find(t => t.id === toolId);
    if (tool) {
      toast({
        title: 'Configure Tool',
        description: `Configuration for ${tool.name} will be available soon.`,
        variant: 'default'
      });
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchTools();
  }, []);

  // Get tool icon based on category
  const getToolIcon = (category: string) => {
    switch (category) {
      case 'writing':
        return <PenTool className="h-5 w-5" />;
      case 'analysis':
        return <FileText className="h-5 w-5" />;
      case 'enhancement':
        return <Brain className="h-5 w-5" />;
      case 'organization':
        return <Code className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">AI Tools</h2>
        <p className="text-muted-foreground">
          Manage the AI tools available in your writing environment.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-current border-e-transparent" role="status">
            <span className="sr-only">Loading...</span>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tools.map(tool => (
              <Card key={tool.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="bg-primary/10 p-2 rounded-full">
                        {getToolIcon(tool.category)}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{tool.name}</CardTitle>
                        <CardDescription>
                          <Badge variant="outline" className="mr-1">
                            {tool.category}
                          </Badge>
                        </CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={tool.enabled}
                      onCheckedChange={() => toggleToolEnabled(tool.id)}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{tool.description}</p>
                </CardContent>
                <CardFooter className="flex justify-end pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => configureTool(tool.id)}
                  >
                    <Settings className="mr-1 h-4 w-4" /> Configure
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
          
          <Card className="bg-primary/5 border-dashed">
            <CardContent className="pt-6 pb-6 flex items-center justify-center">
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" /> 
                Install Additional Tools
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 