```typescript
import React, { useState } from 'react';
import { Agent } from '../../model/types';
import { YamlViewer } from '../Shared/YamlViewer';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SecretField } from '../Shared/SecretField';
import { agentsApi } from '../../api/agents.api';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

interface ConfigPaneProps {
  agent: Agent;
}

export function ConfigPane({ agent }: ConfigPaneProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editableConfig, setEditableConfig] = useState(agent.config || {});
  const [editableCredentials, setEditableCredentials] = useState(agent.credentials || {});

  const handleConfigChange = (key: string, value: any) => {
    setEditableConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleCredentialChange = (key: string, value: string) => {
    setEditableCredentials(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      const updates = {
        config: editableConfig,
        credentials: editableCredentials,
      };
      const response = await agentsApi.update(agent.id, updates);
      if (response.success) {
        toast.success('Agent configuration updated successfully!');
        queryClient.invalidateQueries({ queryKey: ['agent', agent.id] });
        setIsEditing(false);
      } else {
        toast.error(response.message || 'Failed to update configuration.');
      }
    } catch (error: any) {
      toast.error(error.message || 'An unexpected error occurred during update.');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Agent Configuration</h3>
        <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
          <Pencil className="h-4 w-4 mr-2" /> {isEditing ? 'Cancel' : 'Edit'}
        </Button>
      </div>

      {isEditing ? (
        <div className="space-y-6">
          {/* Config Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="base_url" className="text-gray-700 dark:text-gray-300">Base URL</Label>
              <Input
                id="base_url"
                value={editableConfig.base_url || ''}
                onChange={(e) => handleConfigChange('base_url', e.target.value)}
                placeholder="e.g., http://localhost:8000"
              />
            </div>
            <div>
              <Label htmlFor="protocol" className="text-gray-700 dark:text-gray-300">Protocol</Label>
              <Select
                value={editableConfig.protocol || 'http'}
                onValueChange={(value) => handleConfigChange('protocol', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select protocol" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                  <SelectItem value="http">HTTP</SelectItem>
                  <SelectItem value="https">HTTPS</SelectItem>
                  <SelectItem value="ws">WS</SelectItem>
                  <SelectItem value="wss">WSS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="port" className="text-gray-700 dark:text-gray-300">Port</Label>
              <Input
                id="port"
                type="number"
                value={editableConfig.port || ''}
                onChange={(e) => handleConfigChange('port', parseInt(e.target.value) || undefined)}
                placeholder="e.g., 8000"
              />
            </div>
            <div>
              <Label htmlFor="ws_namespace" className="text-gray-700 dark:text-gray-300">WS Namespace</Label>
              <Input
                id="ws_namespace"
                value={editableConfig.ws_namespace || ''}
                onChange={(e) => handleConfigChange('ws_namespace', e.target.value)}
                placeholder="e.g., /agents"
              />
            </div>
            <div>
              <Label htmlFor="timeout" className="text-gray-700 dark:text-gray-300">Timeout (ms)</Label>
              <Input
                id="timeout"
                type="number"
                value={editableConfig.timeout || ''}
                onChange={(e) => handleConfigChange('timeout', parseInt(e.target.value) || undefined)}
                placeholder="e.g., 30000"
              />
            </div>
            <div>
              <Label htmlFor="concurrency" className="text-gray-700 dark:text-gray-300">Concurrency</Label>
              <Input
                id="concurrency"
                type="number"
                value={editableConfig.concurrency || ''}
                onChange={(e) => handleConfigChange('concurrency', parseInt(e.target.value) || undefined)}
                placeholder="e.g., 1"
              />
            </div>
          </div>

          {/* Credentials Fields */}
          {Object.keys(editableCredentials).length > 0 && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mt-6">Credentials</h4>
              {Object.entries(editableCredentials).map(([key, value]) => (
                <div key={key}>
                  <Label htmlFor={`credential-${key}`} className="text-gray-700 dark:text-gray-300">{key}</Label>
                  <SecretField
                    value={value}
                    onChange={(val) => handleCredentialChange(key, val)}
                    placeholder={`Enter ${key}`}
                  />
                </div>
              ))}
            </div>
          )}

          <Button onClick={handleSave} className="w-full">Save Changes</Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Agent Configuration</h4>
            <YamlViewer data={agent.config} />
          </div>
          {agent.credentials && Object.keys(agent.credentials).length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Credentials</h4>
              <YamlViewer data={Object.entries(agent.credentials).reduce((acc, [key, value]) => {
                acc[key] = value ? '********' : 'Not provided';
                return acc;
              }, {} as Record<string, string>)} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```