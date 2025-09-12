```typescript
import React from 'react';
import { CheckCircle2, AlertTriangle, Rocket, Settings, Key, TestTube } from 'lucide-react';
import { YamlViewer } from '../Shared/YamlViewer';
import { AgentConfig, MarketplaceTemplate, WizardData } from '../../model/types';
import { cn } from '@/lib/utils';

interface ReviewStepProps {
  data: WizardData;
  onComplete: () => void;
}

export function ReviewStep({ data, onComplete }: ReviewStepProps) {
  const { template, runtime, credentials, config, testResults } = data;

  const agentConfig: Partial<AgentConfig> = {
    ...template?.defaultConfig,
    ...config,
    runtime,
  };

  // Filter out empty credentials for display
  const filteredCredentials = Object.entries(credentials).reduce((acc, [key, value]) => {
    if (value) {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, string>);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Review Agent Configuration
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Please review the details before creating your agent.
        </p>
      </div>

      {/* Template Summary */}
      {template && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Rocket className="h-4 w-4" />
            Agent Template
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Name:</span>
              <span className="font-medium text-gray-900 dark:text-white">{template.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Provider:</span>
              <span className="font-medium text-gray-900 dark:text-white">{template.provider}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Category:</span>
              <span className="font-medium text-gray-900 dark:text-white">{template.category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Version:</span>
              <span className="font-medium text-gray-900 dark:text-white">{template.version}</span>
            </div>
          </div>
        </div>
      )}

      {/* Runtime & Config Summary */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Runtime & Configuration
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Runtime:</span>
            <span className="font-medium text-gray-900 dark:text-white capitalize">{runtime}</span>
          </div>
          {agentConfig.protocol && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Protocol:</span>
              <span className="font-medium text-gray-900 dark:text-white uppercase">{agentConfig.protocol}</span>
            </div>
          )}
          {agentConfig.base_url && (
            <div className="flex justify-between col-span-full">
              <span className="text-gray-600 dark:text-gray-400">Base URL:</span>
              <span className="font-medium text-gray-900 dark:text-white font-mono text-xs">{agentConfig.base_url}</span>
            </div>
          )}
          {agentConfig.port && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Port:</span>
              <span className="font-medium text-gray-900 dark:text-white">{agentConfig.port}</span>
            </div>
          )}
          {agentConfig.ws_namespace && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">WS Namespace:</span>
              <span className="font-medium text-gray-900 dark:text-white">{agentConfig.ws_namespace}</span>
            </div>
          )}
          {agentConfig.timeout && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Timeout:</span>
              <span className="font-medium text-gray-900 dark:text-white">{agentConfig.timeout}ms</span>
            </div>
          )}
          {agentConfig.concurrency && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Concurrency:</span>
              <span className="font-medium text-gray-900 dark:text-white">{agentConfig.concurrency}</span>
            </div>
          )}
        </div>
      </div>

      {/* Credentials Summary */}
      {Object.keys(filteredCredentials).length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Key className="h-4 w-4" />
            Credentials
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {Object.entries(filteredCredentials).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{key}:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {value.length > 0 ? '********' : 'Not provided'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Results Summary */}
      {testResults && (
        <div className={cn(
          "p-4 rounded-lg border",
          testResults.status === 'success' ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800" : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
        )}>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Connection Test Results
          </h4>
          <div className="flex items-center gap-2 mb-2">
            {testResults.status === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-500" />
            )}
            <span className={cn(
              "font-semibold",
              testResults.status === 'success' ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
            )}>
              {testResults.status === 'success' ? 'All Tests Passed' : 'Some Tests Failed'}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Last tested: {new Date(testResults.timestamp).toLocaleString()}
          </p>
        </div>
      )}

      {/* YAML Preview (Stretch Goal) */}
      {template && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Agent Configuration (YAML Preview)
          </h4>
          <YamlViewer
            data={{
              name: template.name,
              type: template.slug,
              runtime: runtime,
              config: agentConfig,
              credentials: filteredCredentials,
              capabilities: template.capabilities,
              provider: template.provider,
              version: template.version,
            }}
          />
        </div>
      )}
    </div>
  );
}
```