'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/utils/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useTrpcDocumentStore } from '@/lib/trpc-document-store';
import { useTrpcLLMStore } from '@/lib/trpc-llm-store';
import { useTrpcTemplateStore } from '@/lib/trpc-template-store';
import { useTrpcConfigStore } from '@/lib/trpc-config-store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function TrpcIntegrationTestPage() {
  const [activeTab, setActiveTab] = useState('document');
  
  return (
    <div className="container py-8 max-w-6xl">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>tRPC Integration Tests</CardTitle>
          <CardDescription>
            This page tests all tRPC integrations to ensure they are working correctly.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="document">Document Store</TabsTrigger>
          <TabsTrigger value="llm">LLM Store</TabsTrigger>
          <TabsTrigger value="template">Template Store</TabsTrigger>
          <TabsTrigger value="config">Config Store</TabsTrigger>
          <TabsTrigger value="admin">Admin API</TabsTrigger>
        </TabsList>
        
        <TabsContent value="document">
          <DocumentStoreTest />
        </TabsContent>
        
        <TabsContent value="llm">
          <LLMStoreTest />
        </TabsContent>
        
        <TabsContent value="template">
          <TemplateStoreTest />
        </TabsContent>
        
        <TabsContent value="config">
          <ConfigStoreTest />
        </TabsContent>
        
        <TabsContent value="admin">
          <AdminApiTest />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DocumentStoreTest() {
  const [testResults, setTestResults] = useState<Array<{name: string, status: 'success' | 'error' | 'pending', message?: string}>>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const documentStore = useTrpcDocumentStore();
  
  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    setTestResults(prev => [...prev, { name: testName, status: 'pending' }]);
    try {
      const result = await testFn();
      setTestResults(prev => prev.map(test => 
        test.name === testName ? { name: testName, status: 'success', message: JSON.stringify(result) } : test
      ));
      return result;
    } catch (error: any) {
      setTestResults(prev => prev.map(test => 
        test.name === testName ? { name: testName, status: 'error', message: error.message } : test
      ));
      throw error;
    }
  };
  
  const handleLoadData = async () => {
    try {
      await runTest('Load Data', async () => {
        await documentStore.loadData();
        setDocuments(documentStore.documents);
        setFolders(documentStore.folders);
        return { success: true, documentsLoaded: documentStore.documents.length, foldersLoaded: documentStore.folders.length };
      });
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };
  
  const handleCreateDocument = async () => {
    try {
      await runTest('Create Document', async () => {
        const docId = await documentStore.addDocument(`Test Document ${Date.now()}`, 'This is a test document created via tRPC.', null);
        return { success: true, documentId: docId };
      });
      // Refresh documents list
      setDocuments(documentStore.documents);
    } catch (error) {
      console.error('Error creating document:', error);
    }
  };
  
  const handleCreateFolder = async () => {
    try {
      await runTest('Create Folder', async () => {
        await documentStore.addFolder(`Test Folder ${Date.now()}`, null);
        return { success: true };
      });
      // Refresh folders list
      setFolders(documentStore.folders);
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Store Tests</CardTitle>
        <CardDescription>
          Test document and folder operations using tRPC.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Button onClick={handleLoadData}>Load Data</Button>
            <Button onClick={handleCreateDocument}>Create Document</Button>
            <Button onClick={handleCreateFolder}>Create Folder</Button>
          </div>
          
          <Separator className="my-2" />
          
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Test Results:</h3>
              <div className="space-y-2">
                {testResults.map((test, index) => (
                  <div key={index} className="p-2 border rounded">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{test.name}</span>
                      <Badge 
                        variant={test.status === 'success' ? 'default' : test.status === 'error' ? 'destructive' : 'outline'}
                      >
                        {test.status}
                      </Badge>
                    </div>
                    {test.message && (
                      <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-auto">
                        {test.message}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Documents ({documents.length}):</h3>
                <ScrollArea className="h-64 border rounded p-2">
                  <div className="space-y-1">
                    {documents.map((doc, index) => (
                      <div key={index} className="text-xs p-1 hover:bg-muted rounded">
                        {doc.name}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2">Folders ({folders.length}):</h3>
                <ScrollArea className="h-64 border rounded p-2">
                  <div className="space-y-1">
                    {folders.map((folder, index) => (
                      <div key={index} className="text-xs p-1 hover:bg-muted rounded">
                        {folder.name}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LLMStoreTest() {
  const [testResults, setTestResults] = useState<Array<{name: string, status: 'success' | 'error' | 'pending', message?: string}>>([]);
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [generatedText, setGeneratedText] = useState<string>('');
  const llmStore = useTrpcLLMStore();
  
  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    setTestResults(prev => [...prev, { name: testName, status: 'pending' }]);
    try {
      const result = await testFn();
      setTestResults(prev => prev.map(test => 
        test.name === testName ? { name: testName, status: 'success', message: JSON.stringify(result, null, 2) } : test
      ));
      return result;
    } catch (error: any) {
      setTestResults(prev => prev.map(test => 
        test.name === testName ? { name: testName, status: 'error', message: error.message } : test
      ));
      throw error;
    }
  };
  
  const handleLoadModels = async () => {
    try {
      await runTest('Load Models', async () => {
        await llmStore.loadModels();
        setAvailableModels(llmStore.availableModels);
        return { success: true, modelsLoaded: llmStore.availableModels.length };
      });
    } catch (error) {
      console.error('Error loading models:', error);
    }
  };
  
  const handleGenerateText = async () => {
    try {
      await runTest('Generate Text', async () => {
        const response = await llmStore.generateText({
          model: llmStore.availableModels[0]?.id || 'gpt-3.5-turbo',
          prompt: 'Write a short paragraph about tRPC.',
          maxTokens: 150
        });
        setGeneratedText(response.text || '');
        return { success: true, response };
      });
    } catch (error) {
      console.error('Error generating text:', error);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>LLM Store Tests</CardTitle>
        <CardDescription>
          Test language model operations using tRPC.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Button onClick={handleLoadModels}>Load Models</Button>
            <Button onClick={handleGenerateText}>Generate Text</Button>
          </div>
          
          <Separator className="my-2" />
          
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Test Results:</h3>
              <div className="space-y-2">
                {testResults.map((test, index) => (
                  <div key={index} className="p-2 border rounded">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{test.name}</span>
                      <Badge 
                        variant={test.status === 'success' ? 'default' : test.status === 'error' ? 'destructive' : 'outline'}
                      >
                        {test.status}
                      </Badge>
                    </div>
                    {test.message && (
                      <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-auto">
                        {test.message}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Available Models ({availableModels.length}):</h3>
                <ScrollArea className="h-48 border rounded p-2">
                  <div className="space-y-1">
                    {availableModels.map((model, index) => (
                      <div key={index} className="text-xs p-1 hover:bg-muted rounded">
                        {model.id} ({model.provider})
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2">Generated Text:</h3>
                <div className="h-48 border rounded p-2 text-xs overflow-auto">
                  {generatedText || 'No text generated yet.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TemplateStoreTest() {
  const [testResults, setTestResults] = useState<Array<{name: string, status: 'success' | 'error' | 'pending', message?: string}>>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [processedTemplate, setProcessedTemplate] = useState<string>('');
  const templateStore = useTrpcTemplateStore();
  
  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    setTestResults(prev => [...prev, { name: testName, status: 'pending' }]);
    try {
      const result = await testFn();
      setTestResults(prev => prev.map(test => 
        test.name === testName ? { name: testName, status: 'success', message: JSON.stringify(result, null, 2) } : test
      ));
      return result;
    } catch (error: any) {
      setTestResults(prev => prev.map(test => 
        test.name === testName ? { name: testName, status: 'error', message: error.message } : test
      ));
      throw error;
    }
  };
  
  const handleLoadTemplates = async () => {
    try {
      await runTest('Load Templates', async () => {
        await templateStore.loadTemplates();
        setTemplates(templateStore.templates);
        return { success: true, templatesLoaded: templateStore.templates.length };
      });
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };
  
  const handleAddTemplate = async () => {
    try {
      await runTest('Add Template', async () => {
        await templateStore.addTemplate({
          name: `Test Template ${Date.now()}`,
          description: 'A test template created via tRPC',
          content: 'Hello {{name}}, welcome to the {{location}}!',
          category: 'test',
          tags: ['test', 'trpc']
        });
        setTemplates(templateStore.templates);
        return { success: true };
      });
    } catch (error) {
      console.error('Error adding template:', error);
    }
  };
  
  const handleProcessTemplate = async () => {
    if (templates.length === 0) {
      alert('Please load templates first');
      return;
    }
    
    try {
      await runTest('Process Template', async () => {
        const templateId = templates[0]?.id;
        const variables = { name: 'User', location: 'tRPC Integration Test' };
        const result = await templateStore.processTemplate(templateId, variables);
        setProcessedTemplate(result);
        return { success: true, processedTemplate: result };
      });
    } catch (error) {
      console.error('Error processing template:', error);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Template Store Tests</CardTitle>
        <CardDescription>
          Test template operations using tRPC.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Button onClick={handleLoadTemplates}>Load Templates</Button>
            <Button onClick={handleAddTemplate}>Add Template</Button>
            <Button onClick={handleProcessTemplate}>Process Template</Button>
          </div>
          
          <Separator className="my-2" />
          
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Test Results:</h3>
              <div className="space-y-2">
                {testResults.map((test, index) => (
                  <div key={index} className="p-2 border rounded">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{test.name}</span>
                      <Badge 
                        variant={test.status === 'success' ? 'default' : test.status === 'error' ? 'destructive' : 'outline'}
                      >
                        {test.status}
                      </Badge>
                    </div>
                    {test.message && (
                      <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-auto">
                        {test.message}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Templates ({templates.length}):</h3>
                <ScrollArea className="h-48 border rounded p-2">
                  <div className="space-y-1">
                    {templates.map((template, index) => (
                      <div key={index} className="text-xs p-1 hover:bg-muted rounded">
                        {template.name} - {template.description}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2">Processed Template:</h3>
                <div className="h-48 border rounded p-2 text-xs overflow-auto">
                  {processedTemplate || 'No template processed yet.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ConfigStoreTest() {
  const [testResults, setTestResults] = useState<Array<{name: string, status: 'success' | 'error' | 'pending', message?: string}>>([]);
  const [configData, setConfigData] = useState<any>(null);
  const configStore = useTrpcConfigStore();
  
  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    setTestResults(prev => [...prev, { name: testName, status: 'pending' }]);
    try {
      const result = await testFn();
      setTestResults(prev => prev.map(test => 
        test.name === testName ? { name: testName, status: 'success', message: JSON.stringify(result, null, 2) } : test
      ));
      return result;
    } catch (error: any) {
      setTestResults(prev => prev.map(test => 
        test.name === testName ? { name: testName, status: 'error', message: error.message } : test
      ));
      throw error;
    }
  };
  
  const handleLoadConfig = async () => {
    try {
      await runTest('Load Config', async () => {
        await configStore.loadConfig();
        
        // Create a safe copy without sensitive data
        const configCopy = {
          provider: configStore.provider,
          model: configStore.model,
          temperature: configStore.temperature,
          maxTokens: configStore.maxTokens,
          aiRoles: configStore.aiRoles.map(role => role.role)
        };
        
        setConfigData(configCopy);
        return { success: true, config: configCopy };
      });
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };
  
  const handleUpdateConfig = async () => {
    try {
      await runTest('Update Config', async () => {
        // Only update non-sensitive settings
        const updatedConfig = {
          provider: configStore.provider,
          model: configStore.model,
          temperature: Math.min(Math.max(configStore.temperature * 0.9, 0), 1),  // Slightly change temperature
          maxTokens: configStore.maxTokens
        };
        
        await configStore.updateConfig(updatedConfig);
        
        // Create a safe copy without sensitive data
        const configCopy = {
          provider: configStore.provider,
          model: configStore.model,
          temperature: configStore.temperature,
          maxTokens: configStore.maxTokens,
          aiRoles: configStore.aiRoles.map(role => role.role)
        };
        
        setConfigData(configCopy);
        return { success: true, updatedConfig: configCopy };
      });
    } catch (error) {
      console.error('Error updating config:', error);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Config Store Tests</CardTitle>
        <CardDescription>
          Test configuration operations using tRPC.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Button onClick={handleLoadConfig}>Load Config</Button>
            <Button onClick={handleUpdateConfig}>Update Config</Button>
          </div>
          
          <Separator className="my-2" />
          
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Test Results:</h3>
              <div className="space-y-2">
                {testResults.map((test, index) => (
                  <div key={index} className="p-2 border rounded">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{test.name}</span>
                      <Badge 
                        variant={test.status === 'success' ? 'default' : test.status === 'error' ? 'destructive' : 'outline'}
                      >
                        {test.status}
                      </Badge>
                    </div>
                    {test.message && (
                      <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-auto">
                        {test.message}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-2">Configuration Data:</h3>
              <div className="border rounded p-2">
                {configData ? (
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(configData, null, 2)}
                  </pre>
                ) : (
                  <p className="text-xs text-muted-foreground">No configuration loaded yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminApiTest() {
  const [testResults, setTestResults] = useState<Array<{name: string, status: 'success' | 'error' | 'pending', message?: string}>>([]);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  
  // Use direct tRPC hooks for admin functions
  const getSystemStatus = trpc.admin.getSystemStatus.useQuery(undefined, { 
    enabled: false,
    refetchOnWindowFocus: false
  });
  
  const getServerLogs = trpc.admin.getServerLogs.useMutation();
  
  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    setTestResults(prev => [...prev, { name: testName, status: 'pending' }]);
    try {
      const result = await testFn();
      setTestResults(prev => prev.map(test => 
        test.name === testName ? { name: testName, status: 'success', message: JSON.stringify(result, null, 2) } : test
      ));
      return result;
    } catch (error: any) {
      setTestResults(prev => prev.map(test => 
        test.name === testName ? { name: testName, status: 'error', message: error.message } : test
      ));
      throw error;
    }
  };
  
  const handleGetSystemStatus = async () => {
    try {
      await runTest('Get System Status', async () => {
        const result = await getSystemStatus.refetch();
        if (result.data) {
          setSystemStatus(result.data);
        }
        return result.data || { success: false };
      });
    } catch (error) {
      console.error('Error getting system status:', error);
    }
  };
  
  const handleGetLogs = async () => {
    try {
      await runTest('Get Server Logs', async () => {
        const result = await getServerLogs.mutateAsync({ 
          lines: 10,
          level: 'all'
        });
        setLogs(result.logs);
        return result;
      });
    } catch (error) {
      console.error('Error getting logs:', error);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin API Tests</CardTitle>
        <CardDescription>
          Test admin operations using tRPC.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Button onClick={handleGetSystemStatus}>Get System Status</Button>
            <Button onClick={handleGetLogs}>Get Logs</Button>
          </div>
          
          <Separator className="my-2" />
          
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Test Results:</h3>
              <div className="space-y-2">
                {testResults.map((test, index) => (
                  <div key={index} className="p-2 border rounded">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{test.name}</span>
                      <Badge 
                        variant={test.status === 'success' ? 'default' : test.status === 'error' ? 'destructive' : 'outline'}
                      >
                        {test.status}
                      </Badge>
                    </div>
                    {test.message && (
                      <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-auto">
                        {test.message}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium mb-2">System Status:</h3>
                <div className="border rounded p-2">
                  {systemStatus ? (
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(systemStatus, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-xs text-muted-foreground">No system status loaded yet.</p>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2">Server Logs:</h3>
                <ScrollArea className="h-64 border rounded p-2">
                  <div className="space-y-1">
                    {logs.length > 0 ? (
                      logs.map((log, index) => (
                        <div key={index} className={`text-xs p-1 rounded ${
                          log.level === 'error' ? 'bg-red-50 text-red-900' : 
                          log.level === 'warn' ? 'bg-yellow-50 text-yellow-900' : 
                          'hover:bg-muted'
                        }`}>
                          <span className="font-mono">[{log.timestamp}]</span> <span className="font-medium">{log.level.toUpperCase()}</span>: {log.message}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">No logs loaded yet.</p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 
 