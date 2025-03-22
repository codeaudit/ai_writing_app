import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Save, Trash, Bot, CheckCircle, Plane, Sparkles, Building } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AIRoleInfo, getAllAIRoles } from '@/lib/ai-roles';
import { toast } from '@/components/ui/use-toast';

interface AIRoleEditorProps {
  markdownContent: string;
  onSave: (content: string) => Promise<void>;
}

interface RoleForm {
  role: string;
  prompt: string;
  isNew?: boolean;
}

export default function AIRoleEditor({ markdownContent, onSave }: AIRoleEditorProps) {
  const [roles, setRoles] = useState<AIRoleInfo[]>([]);
  const [activeTab, setActiveTab] = useState<string>('form');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<RoleForm | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newRoleForm, setNewRoleForm] = useState<RoleForm>({ role: '', prompt: '', isNew: true });
  const [isLoading, setIsLoading] = useState(true);
  const [rawMarkdown, setRawMarkdown] = useState(markdownContent);

  // Load roles from the API
  useEffect(() => {
    const loadRoles = async () => {
      try {
        setIsLoading(true);
        const allRoles = await getAllAIRoles();
        setRoles(allRoles);
        
        // Set the first role as selected if none is selected
        if (allRoles.length > 0 && !selectedRole) {
          setSelectedRole(allRoles[0].role);
          setEditForm({
            role: allRoles[0].role,
            prompt: allRoles[0].prompt
          });
        }
      } catch (error) {
        console.error('Error loading roles:', error);
        toast({
          title: 'Error',
          description: 'Failed to load AI roles',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadRoles();
  }, [selectedRole]);

  // Update raw markdown when switching tabs
  useEffect(() => {
    setRawMarkdown(markdownContent);
  }, [markdownContent, activeTab]);

  // Select a role to edit
  const handleSelectRole = (role: string) => {
    const selectedRoleInfo = roles.find(r => r.role === role);
    if (selectedRoleInfo) {
      setSelectedRole(role);
      setEditForm({
        role: selectedRoleInfo.role,
        prompt: selectedRoleInfo.prompt
      });
    }
  };

  // Update form field
  const handleFormChange = (field: keyof RoleForm, value: string) => {
    if (editForm) {
      setEditForm({
        ...editForm,
        [field]: value
      });
    }
  };

  // Add a new role
  const handleAddRole = () => {
    if (!newRoleForm.role.trim() || !newRoleForm.prompt.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Role name and prompt are required',
        variant: 'destructive',
      });
      return;
    }

    // Normalize role name (lowercase, hyphenated)
    const normalizedRoleName = newRoleForm.role
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-');

    // Check if role already exists
    if (roles.some(r => r.role.toLowerCase() === normalizedRoleName)) {
      toast({
        title: 'Error',
        description: `Role "${newRoleForm.role}" already exists`,
        variant: 'destructive',
      });
      return;
    }

    // Create updated markdown with the new role
    const updatedMarkdown = generateMarkdownWithNewRole(normalizedRoleName, newRoleForm.prompt);
    
    // Save the updated markdown
    onSave(updatedMarkdown)
      .then(() => {
        setIsAddDialogOpen(false);
        setNewRoleForm({ role: '', prompt: '', isNew: true });
        toast({
          title: 'Success',
          description: `Role "${newRoleForm.role}" added successfully`,
        });
      })
      .catch((error) => {
        console.error('Error adding role:', error);
        toast({
          title: 'Error',
          description: 'Failed to add role',
          variant: 'destructive',
        });
      });
  };

  // Update an existing role
  const handleUpdateRole = () => {
    if (!editForm || !selectedRole) return;

    // Create updated markdown with the edited role
    const updatedMarkdown = generateMarkdownWithUpdatedRole(selectedRole, editForm.prompt);
    
    // Save the updated markdown
    onSave(updatedMarkdown)
      .then(() => {
        toast({
          title: 'Success',
          description: `Role "${selectedRole}" updated successfully`,
        });
      })
      .catch((error) => {
        console.error('Error updating role:', error);
        toast({
          title: 'Error',
          description: 'Failed to update role',
          variant: 'destructive',
        });
      });
  };

  // Delete a role
  const handleDeleteRole = () => {
    if (!selectedRole) return;

    // Create updated markdown without the deleted role
    const updatedMarkdown = generateMarkdownWithoutRole(selectedRole);
    
    // Save the updated markdown
    onSave(updatedMarkdown)
      .then(() => {
        // Reset selection if the current role was deleted
        const remainingRoles = roles.filter(r => r.role !== selectedRole);
        if (remainingRoles.length > 0) {
          setSelectedRole(remainingRoles[0].role);
          setEditForm({
            role: remainingRoles[0].role,
            prompt: remainingRoles[0].prompt
          });
        } else {
          setSelectedRole(null);
          setEditForm(null);
        }
        
        toast({
          title: 'Success',
          description: `Role "${selectedRole}" deleted successfully`,
        });
      })
      .catch((error) => {
        console.error('Error deleting role:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete role',
          variant: 'destructive',
        });
      });
  };

  // Helper function to get the file header
  const getFileHeader = (): string => {
    const headerMatch = markdownContent.match(/^(---[\s\S]*?---\s*|)# AI Roles Configuration\s*[\s\S]*?(?=## |$)/);
    return headerMatch ? headerMatch[0] : '# AI Roles Configuration\n\nThis file defines the available AI roles and their system prompts.\n\n';
  };

  // Generate updated markdown with a new role
  const generateMarkdownWithNewRole = (roleName: string, promptContent: string): string => {
    const header = getFileHeader();
    const roleSection = `## ${roleName}\n\n${promptContent}\n\n`;
    
    // Extract existing role sections
    const roleSections = roles.map(role => {
      return `## ${role.role}\n\n${role.prompt}\n\n`;
    }).join('');
    
    return `${header}${roleSections}${roleSection}`;
  };

  // Generate updated markdown with an edited role
  const generateMarkdownWithUpdatedRole = (roleName: string, newPromptContent: string): string => {
    const header = getFileHeader();
    
    // Create sections for all roles, updating the selected one
    const roleSections = roles.map(role => {
      if (role.role === roleName) {
        return `## ${roleName}\n\n${newPromptContent}\n\n`;
      }
      return `## ${role.role}\n\n${role.prompt}\n\n`;
    }).join('');
    
    return `${header}${roleSections}`;
  };

  // Generate updated markdown without a deleted role
  const generateMarkdownWithoutRole = (roleName: string): string => {
    const header = getFileHeader();
    
    // Create sections for all roles except the deleted one
    const roleSections = roles
      .filter(role => role.role !== roleName)
      .map(role => {
        return `## ${role.role}\n\n${role.prompt}\n\n`;
      })
      .join('');
    
    return `${header}${roleSections}`;
  };

  // Function to get icon for a role
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'assistant':
        return <Bot size={16} className="mr-2" />;
      case 'co-creator':
        return <Sparkles size={16} className="mr-2" />;
      case 'validator':
        return <CheckCircle size={16} className="mr-2" />;
      case 'autopilot':
        return <Plane size={16} className="mr-2" />;
      case 'architect':
        return <Building size={16} className="mr-2" />;
      default:
        return <Bot size={16} className="mr-2" />;
    }
  };

  // Function to get a formatted role name (capitalize words)
  const formatRoleName = (role: string) => {
    return role
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Save raw markdown when in markdown mode
  const handleSaveRawMarkdown = () => {
    onSave(rawMarkdown)
      .then(() => {
        toast({
          title: 'Success',
          description: 'Markdown saved successfully',
        });
      })
      .catch((error) => {
        console.error('Error saving markdown:', error);
        toast({
          title: 'Error',
          description: 'Failed to save markdown',
          variant: 'destructive',
        });
      });
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="form">Form Editor</TabsTrigger>
          <TabsTrigger value="markdown">Markdown Editor</TabsTrigger>
        </TabsList>
        
        <TabsContent value="form" className="py-4">
          <div className="flex flex-col-reverse md:flex-row gap-4">
            {/* Role Selection Sidebar */}
            <div className="w-full md:w-64 border rounded-md overflow-hidden">
              <div className="p-3 bg-secondary/20 border-b flex justify-between items-center">
                <h3 className="font-medium">AI Roles</h3>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Plus size={14} />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New AI Role</DialogTitle>
                      <DialogDescription>
                        Create a new AI role with a custom system prompt.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="role-name">Role Name</Label>
                        <Input
                          id="role-name"
                          placeholder="e.g. Research Assistant"
                          value={newRoleForm.role}
                          onChange={(e) => setNewRoleForm({...newRoleForm, role: e.target.value})}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="role-prompt">System Prompt</Label>
                        <Textarea
                          id="role-prompt"
                          placeholder="Describe how the AI should behave in this role..."
                          value={newRoleForm.prompt}
                          onChange={(e) => setNewRoleForm({...newRoleForm, prompt: e.target.value})}
                          className="min-h-[200px]"
                        />
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddRole}>
                        Add Role
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              
              <ScrollArea className="h-[350px]">
                {isLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin h-5 w-5 border-b-2 border-primary rounded-full"></div>
                  </div>
                ) : (
                  <div className="space-y-0.5 p-1">
                    {roles.map((role) => (
                      <Button
                        key={role.role}
                        variant={selectedRole === role.role ? "secondary" : "ghost"}
                        className="w-full justify-start text-sm h-9"
                        onClick={() => handleSelectRole(role.role)}
                      >
                        {getRoleIcon(role.role)}
                        {formatRoleName(role.role)}
                      </Button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
            
            {/* Role Editor */}
            <div className="flex-1">
              {selectedRole && editForm ? (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex justify-between items-center">
                      <div className="flex items-center">
                        {getRoleIcon(selectedRole)}
                        {formatRoleName(selectedRole)}
                      </div>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-7 w-7 text-destructive"
                        onClick={handleDeleteRole}
                      >
                        <Trash size={14} />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-prompt">System Prompt</Label>
                      <Textarea
                        id="edit-prompt"
                        value={editForm.prompt}
                        onChange={(e) => handleFormChange('prompt', e.target.value)}
                        className="min-h-[250px] font-mono text-sm"
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button onClick={handleUpdateRole}>
                      <Save size={14} className="mr-2" />
                      Save Changes
                    </Button>
                  </CardFooter>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-10">
                    <div className="text-center text-muted-foreground">
                      <p>Select a role to edit or create a new one</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="markdown">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Raw Markdown Editor</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea 
                value={rawMarkdown} 
                onChange={(e) => setRawMarkdown(e.target.value)} 
                className="min-h-[400px] font-mono text-sm"
              />
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveRawMarkdown}>
                <Save size={14} className="mr-2" />
                Save Markdown
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 