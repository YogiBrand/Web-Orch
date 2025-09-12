import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Cloud, 
  Server, 
  Plus, 
  Trash2, 
  TestTube, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Key,
  Globe,
  Zap
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AgentProvider {
  id: string;
  name: string;
  type: 'skyvern-cloud' | 'skyvern-local' | 'browserbase' | 'custom';
  apiKey?: string;
  endpoint?: string;
  websocketUrl?: string;
  capabilities: string[];
  isActive: boolean;
}

export function AgentProviderManager() {
  const [providers, setProviders] = useState<AgentProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [newProvider, setNewProvider] = useState<Partial<AgentProvider>>({
    type: 'skyvern-cloud',
    capabilities: ['browser-automation', 'data-extraction'],
    isActive: true
  });

  // API keys (can be set via environment or UI)
  const SKYVERN_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjQ4OTk3OTg3MzQsInN1YiI6Im9fNDI1ODY5NzY0MTI1MTQxNzEwIn0.65x52hHrdOw4UCbYfBXeDH1EvNxNkqWmz3ug67ZBbU0';
  const BROWSER_USE_API_KEY = 'bu_RjcIytsqF2Qa2U6QjXH29eqv0dCtZX4B6_QKQLU4DNQ';

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const response = await fetch('/api/agent-providers/providers');
      if (response.ok) {
        const data = await response.json();
        setProviders(data.providers || []);
      }
    } catch (error) {
      console.error('Failed to fetch providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const testProvider = async (providerId: string) => {
    setTestingProvider(providerId);
    try {
      const response = await fetch(`/api/agent-providers/providers/${providerId}/test`, {
        method: 'POST'
      });
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: 'Connection successful',
          description: result.message
        });
      } else {
        toast({
          title: 'Connection failed',
          description: result.message,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Test failed',
        description: 'Failed to test provider connection',
        variant: 'destructive'
      });
    } finally {
      setTestingProvider(null);
    }
  };

  const addProvider = async () => {
    if (!newProvider.name || !newProvider.type) {
      toast({
        title: 'Invalid provider',
        description: 'Please provide a name and type',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await fetch('/api/agent-providers/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProvider)
      });
      
      if (response.ok) {
        toast({
          title: 'Provider added',
          description: 'Successfully added new agent provider'
        });
        fetchProviders();
        setShowAddProvider(false);
        setNewProvider({
          type: 'skyvern-cloud',
          capabilities: ['browser-automation', 'data-extraction'],
          isActive: true
        });
      }
    } catch (error) {
      toast({
        title: 'Failed to add provider',
        description: 'An error occurred while adding the provider',
        variant: 'destructive'
      });
    }
  };

  const setupSkyvernCloud = async () => {
    try {
      const response = await fetch('/api/agent-providers/test-skyvern-cloud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: SKYVERN_API_KEY })
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: 'Skyvern Cloud connected',
          description: 'Successfully connected to Skyvern Cloud API'
        });
        fetchProviders();
      } else {
        toast({
          title: 'Connection failed',
          description: result.message,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Setup failed',
        description: 'Failed to setup Skyvern Cloud',
        variant: 'destructive'
      });
    }
  };

  const setupBrowserUseCloud = async () => {
    try {
      const response = await fetch('/api/agent-providers/test-browser-use-cloud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: BROWSER_USE_API_KEY })
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: 'Browser-Use Cloud connected',
          description: 'Successfully connected to Browser-Use Cloud API'
        });
        fetchProviders();
      } else {
        toast({
          title: 'Connection failed',
          description: result.message,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Setup failed',
        description: 'Failed to setup Browser-Use Cloud',
        variant: 'destructive'
      });
    }
  };

  const getProviderIcon = (type: string) => {
    switch (type) {
      case 'skyvern-cloud':
        return <Cloud className="h-4 w-4" />;
      case 'skyvern-local':
        return <Server className="h-4 w-4" />;
      case 'browser-use-cloud':
        return <Zap className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  const getCapabilityBadge = (capability: string) => {
    const colors: Record<string, string> = {
      'browser-automation': 'bg-blue-100 text-blue-800',
      'data-extraction': 'bg-green-100 text-green-800',
      'form-filling': 'bg-purple-100 text-purple-800',
      'anti-detection': 'bg-red-100 text-red-800',
      'cloud-based': 'bg-indigo-100 text-indigo-800'
    };
    
    return (
      <Badge 
        key={capability} 
        variant="outline" 
        className={colors[capability] || 'bg-gray-100 text-gray-800'}
      >
        {capability}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Agent Providers</h2>
          <p className="text-muted-foreground">
            Manage browser automation providers and API connections
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={setupSkyvernCloud}
          >
            <Cloud className="h-4 w-4 mr-2" />
            Skyvern Cloud
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={setupBrowserUseCloud}
          >
            <Zap className="h-4 w-4 mr-2" />
            Browser-Use
          </Button>
          <Button
            onClick={() => setShowAddProvider(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Provider
          </Button>
        </div>
      </div>

      {showAddProvider && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Provider</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={newProvider.name || ''}
                  onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
                  placeholder="Provider name"
                />
              </div>
              <div>
                <Label>Type</Label>
                <select
                  className="w-full p-2 border rounded"
                  value={newProvider.type}
                  onChange={(e) => setNewProvider({ ...newProvider, type: e.target.value as any })}
                >
                  <option value="skyvern-cloud">Skyvern Cloud</option>
                  <option value="skyvern-local">Skyvern Local</option>
                  <option value="browser-use-cloud">Browser-Use Cloud</option>
                  <option value="browserbase">BrowserBase</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>
            
            <div>
              <Label>API Key</Label>
              <Input
                type="password"
                value={newProvider.apiKey || ''}
                onChange={(e) => setNewProvider({ ...newProvider, apiKey: e.target.value })}
                placeholder="API key (optional)"
              />
            </div>
            
            <div>
              <Label>Endpoint URL</Label>
              <Input
                value={newProvider.endpoint || ''}
                onChange={(e) => setNewProvider({ ...newProvider, endpoint: e.target.value })}
                placeholder="https://api.example.com"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddProvider(false);
                  setNewProvider({
                    type: 'skyvern-cloud',
                    capabilities: ['browser-automation', 'data-extraction'],
                    isActive: true
                  });
                }}
              >
                Cancel
              </Button>
              <Button onClick={addProvider}>
                Add Provider
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {providers.map((provider) => (
          <Card key={provider.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getProviderIcon(provider.type)}
                  <div>
                    <CardTitle className="text-lg">{provider.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {provider.endpoint || 'No endpoint configured'}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {provider.isActive ? (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-600">
                      <XCircle className="h-3 w-3 mr-1" />
                      Inactive
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testProvider(provider.id)}
                    disabled={testingProvider === provider.id}
                  >
                    {testingProvider === provider.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <TestTube className="h-4 w-4" />
                    )}
                    Test
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Key className="h-3 w-3" />
                  API Key: {provider.apiKey ? '***' + provider.apiKey.slice(-4) : 'Not configured'}
                </div>
                
                <div className="flex flex-wrap gap-1">
                  {provider.capabilities.map((cap) => getCapabilityBadge(cap))}
                </div>
                
                {provider.type === 'skyvern-cloud' && (
                  <div className="pt-2 border-t">
                    <a
                      href="https://app.skyvern.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                    >
                      View in Skyvern Dashboard
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                
                {provider.type === 'browser-use-cloud' && (
                  <div className="pt-2 border-t">
                    <a
                      href="https://cloud.browser-use.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                    >
                      View in Browser-Use Cloud
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {providers.length === 0 && (
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium mb-2">No providers configured</h3>
          <p className="text-muted-foreground mb-4">
            Add agent providers to enable browser automation capabilities
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={setupSkyvernCloud}>
              <Cloud className="h-4 w-4 mr-2" />
              Setup Skyvern Cloud
            </Button>
            <Button onClick={setupBrowserUseCloud}>
              <Zap className="h-4 w-4 mr-2" />
              Setup Browser-Use
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}