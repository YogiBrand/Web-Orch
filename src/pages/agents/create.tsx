import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Bot, Plus, X, Settings, Play, Save } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { useLocation } from 'wouter';

const AgentCreatePage = () => {
  const [, setLocation] = useLocation();
  const [agentData, setAgentData] = useState({
    name: '',
    description: '',
    category: '',
    tags: [] as string[],
    capabilities: [] as string[],
    configuration: {
      maxConcurrentTasks: 5,
      timeout: 300,
      retryAttempts: 3,
      memoryLimit: 512
    }
  });
  const [currentTag, setCurrentTag] = useState('');
  const [currentCapability, setCurrentCapability] = useState('');

  const handleSectionChange = (section: string) => {
    if (section === 'agents-create') {
      return; // already here
    } else if (section === 'agents-dashboard') {
      setLocation('/agents/dashboard');
    } else if (section === 'agents-marketplace') {
      setLocation('/agents/marketplace');
    } else if (section === 'tasks') {
      setLocation('/tasks');
    } else if (section === 'sessions') {
      setLocation('/sessions');
    } else {
      setLocation(`/?section=${section}`);
    }
  };

  const addTag = () => {
    if (currentTag.trim() && !agentData.tags.includes(currentTag.trim())) {
      setAgentData(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()]
      }));
      setCurrentTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setAgentData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const addCapability = () => {
    if (currentCapability.trim() && !agentData.capabilities.includes(currentCapability.trim())) {
      setAgentData(prev => ({
        ...prev,
        capabilities: [...prev.capabilities, currentCapability.trim()]
      }));
      setCurrentCapability('');
    }
  };

  const removeCapability = (capabilityToRemove: string) => {
    setAgentData(prev => ({
      ...prev,
      capabilities: prev.capabilities.filter(cap => cap !== capabilityToRemove)
    }));
  };

  const handleSave = () => {
    // TODO: Implement agent creation logic
    console.log('Creating agent:', agentData);
    // For now, just redirect to dashboard
    setLocation('/agents/dashboard');
  };

  const categories = [
    'Data Processing',
    'Automation',
    'AI/ML',
    'Communication',
    'Analytics',
    'Web Scraping',
    'Content Generation',
    'Testing',
    'Monitoring'
  ];

  const suggestedCapabilities = [
    'Web Navigation',
    'Data Extraction',
    'Form Filling',
    'API Integration',
    'File Processing',
    'Email Handling',
    'Database Operations',
    'Image Processing',
    'Text Analysis',
    'Code Generation'
  ];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeSection="agents-create" onSectionChange={handleSectionChange} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-foreground">Create New Agent</h1>
            <p className="text-muted-foreground mt-2">Build a custom AI agent for your specific needs</p>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Agent Name</Label>
                    <Input
                      id="name"
                      placeholder="Enter agent name"
                      value={agentData.name}
                      onChange={(e) => setAgentData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={agentData.category}
                      onValueChange={(value) => setAgentData(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what this agent does..."
                    value={agentData.description}
                    onChange={(e) => setAgentData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag"
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  />
                  <Button onClick={addTag} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {agentData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Capabilities */}
            <Card>
              <CardHeader>
                <CardTitle>Capabilities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Select value={currentCapability} onValueChange={setCurrentCapability}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select capability" />
                    </SelectTrigger>
                    <SelectContent>
                      {suggestedCapabilities.map((capability) => (
                        <SelectItem key={capability} value={capability}>
                          {capability}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={addCapability} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {agentData.capabilities.map((capability) => (
                    <div key={capability} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">{capability}</span>
                      <button
                        onClick={() => removeCapability(capability)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="maxConcurrent">Max Concurrent Tasks</Label>
                    <Input
                      id="maxConcurrent"
                      type="number"
                      value={agentData.configuration.maxConcurrentTasks}
                      onChange={(e) => setAgentData(prev => ({
                        ...prev,
                        configuration: {
                          ...prev.configuration,
                          maxConcurrentTasks: parseInt(e.target.value) || 1
                        }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="timeout">Timeout (seconds)</Label>
                    <Input
                      id="timeout"
                      type="number"
                      value={agentData.configuration.timeout}
                      onChange={(e) => setAgentData(prev => ({
                        ...prev,
                        configuration: {
                          ...prev.configuration,
                          timeout: parseInt(e.target.value) || 60
                        }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="retryAttempts">Retry Attempts</Label>
                    <Input
                      id="retryAttempts"
                      type="number"
                      value={agentData.configuration.retryAttempts}
                      onChange={(e) => setAgentData(prev => ({
                        ...prev,
                        configuration: {
                          ...prev.configuration,
                          retryAttempts: parseInt(e.target.value) || 0
                        }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="memoryLimit">Memory Limit (MB)</Label>
                    <Input
                      id="memoryLimit"
                      type="number"
                      value={agentData.configuration.memoryLimit}
                      onChange={(e) => setAgentData(prev => ({
                        ...prev,
                        configuration: {
                          ...prev.configuration,
                          memoryLimit: parseInt(e.target.value) || 256
                        }
                      }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={() => setLocation('/agents/dashboard')}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Create Agent
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentCreatePage;

