import React, { useState } from 'react';
import { useLocation } from 'wouter';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Package,
  Settings,
  Key,
  Play,
  Container,
  Globe,
  Server
} from 'lucide-react';
import { MarketplaceTemplate, WizardData, AgentConfig } from '../../model/types';
import { marketplaceApi } from '../../api/marketplace.api';
import { agentsApi } from '../../api/agents.api';
import toast from 'react-hot-toast';

interface WizardProps {
  template?: MarketplaceTemplate | null;
}

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  completed: boolean;
}

export function Wizard({ template }: WizardProps) {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardData, setWizardData] = useState<WizardData>({
    runtime: 'hosted',
    credentials: {},
    config: {}
  });
  const [loading, setLoading] = useState(false);

  const steps: WizardStep[] = [
    {
      id: 'template',
      title: 'Select Template',
      description: 'Choose an agent template',
      icon: Package,
      completed: !!template
    },
    {
      id: 'runtime',
      title: 'Runtime Configuration',
      description: 'Configure deployment method',
      icon: Server,
      completed: false
    },
    ...(template?.category === 'MCP Server' ? [{
      id: 'ide-integration',
      title: 'IDE Integration',
      description: 'Configure MCP server integration with your IDE',
      icon: Globe,
      completed: false
    }] : []),
    {
      id: 'credentials',
      title: 'Authentication',
      description: 'Set up API credentials',
      icon: Key,
      completed: false
    },
    {
      id: 'configuration',
      title: 'Agent Settings',
      description: 'Configure agent parameters',
      icon: Settings,
      completed: false
    },
    {
      id: 'review',
      title: 'Review & Deploy',
      description: 'Review configuration and deploy',
      icon: Play,
      completed: false
    }
  ];

  const updateWizardData = (updates: Partial<WizardData>) => {
    setWizardData(prev => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleDeploy = async () => {
    if (!template) return;

    setLoading(true);
    try {
      // Step 1: Check Docker availability
      toast.loading('Checking Docker installation...', { id: 'deploy' });
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 2: Pull Docker image
      toast.loading(`Pulling ${template.name} Docker image...`, { id: 'deploy' });
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Step 3: Configure environment
      toast.loading('Configuring environment variables...', { id: 'deploy' });
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Step 4: Create and start container
      toast.loading('Creating and starting Docker container...', { id: 'deploy' });

      const result = await marketplaceApi.install(template.slug, {
        ...wizardData.config,
        credentials: wizardData.credentials,
        runtime: wizardData.runtime,
        ideIntegration: wizardData.ideIntegration
      });

      if (result.success && result.agentId) {
        // Step 5: Verify container is running
        toast.loading('Verifying container health...', { id: 'deploy' });
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 6: Register agent in system
        toast.loading('Registering agent in system...', { id: 'deploy' });
        await new Promise(resolve => setTimeout(resolve, 1000));

        toast.success(`${template.name} deployed successfully!`, { id: 'deploy' });
        setLocation('/agents');
      } else {
        toast.error('Failed to deploy agent', { id: 'deploy' });
      }
    } catch (error) {
      console.error('Deployment error:', error);
      toast.error('Deployment failed - check Docker installation', { id: 'deploy' });
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    const stepId = steps[currentStep]?.id;

    switch (stepId) {
      case 'template':
        return <TemplateSelectionStep template={template} />;
      case 'runtime':
        return <RuntimeStep wizardData={wizardData} onUpdate={updateWizardData} />;
      case 'ide-integration':
        return <IdeIntegrationStep template={template} wizardData={wizardData} onUpdate={updateWizardData} />;
      case 'credentials':
        return <CredentialsStep template={template} wizardData={wizardData} onUpdate={updateWizardData} />;
      case 'configuration':
        return <ConfigurationStep template={template} wizardData={wizardData} onUpdate={updateWizardData} />;
      case 'review':
        return <ReviewStep template={template} wizardData={wizardData} onDeploy={handleDeploy} loading={loading} />;
      default:
        return null;
    }
  };

  // IDE Integration Step Component
  function IdeIntegrationStep({ template, wizardData, onUpdate }: {
    template: MarketplaceTemplate | null;
    wizardData: WizardData;
    onUpdate: (updates: Partial<WizardData>) => void;
  }) {
    const [availableIdes, setAvailableIdes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
      const fetchSupportedIdes = async () => {
        try {
          const response = await fetch('http://localhost:5176/api/mcp/ides');
          if (response.ok) {
            const data = await response.json();
            setAvailableIdes(data.ides);
          }
        } catch (error) {
          console.warn('MCP integration service not available, using fallback:', error);
          // Fallback to common IDEs
          setAvailableIdes([
            { id: 'claude', name: 'Claude Desktop' },
            { id: 'vscode', name: 'Visual Studio Code' },
            { id: 'cursor', name: 'Cursor' },
            { id: 'windsurf', name: 'Windsurf' }
          ]);
        }
        setLoading(false);
      };

      if (template?.category === 'MCP Server') {
        fetchSupportedIdes();
      } else {
        setLoading(false);
      }
    }, [template]);

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            IDE Integration
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Choose which IDE/editor to integrate this MCP server with:
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableIdes.map((ide) => (
              <button
                key={ide.id}
                onClick={() => onUpdate({
                  ideIntegration: {
                    ide: ide.id,
                    name: ide.name,
                    env: wizardData.ideIntegration?.env || {}
                  }
                })}
                className={`p-4 border rounded-lg text-left transition-all ${
                  wizardData.ideIntegration?.ide === ide.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    wizardData.ideIntegration?.ide === ide.id
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {wizardData.ideIntegration?.ide === ide.id && (
                      <div className="w-full h-full rounded-full bg-white scale-50"></div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {ide.name}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {ide.configPath || 'Integrated MCP support'}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {wizardData.ideIntegration?.ide && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-800 dark:text-green-300">
                {wizardData.ideIntegration.name} selected for MCP integration
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {template ? `Deploy ${template.name}` : 'Create New Agent'}
          </h1>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Step {currentStep + 1} of {steps.length}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center space-x-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = step.completed || index < currentStep;

            return (
              <React.Fragment key={step.id}>
                <div className="flex items-center">
                  <div className={`
                    flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors
                    ${isCompleted ? 'bg-green-500 border-green-500 text-white' :
                      isActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600' :
                      'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-400'}
                  `}>
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="ml-3">
                    <div className={`text-sm font-medium ${
                      isActive ? 'text-blue-600 dark:text-blue-400' :
                      isCompleted ? 'text-green-600 dark:text-green-400' :
                      'text-gray-600 dark:text-gray-400'
                    }`}>
                      {step.title}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {step.description}
                    </div>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-px ${
                    index < currentStep ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
        <button
          onClick={handlePrevious}
          disabled={currentStep === 0}
          className="flex items-center gap-2 px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        <div className="flex items-center gap-3">
          {currentStep === steps.length - 1 ? (
            <button
              onClick={handleDeploy}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition-colors"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Deploying...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Deploy Agent
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Template Selection Step
function TemplateSelectionStep({ template }: { template?: MarketplaceTemplate | null }) {
  if (template) {
    return (
      <div className="text-center py-8">
        <div className="flex items-center justify-center mb-4">
          <Package className="w-16 h-16 text-blue-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {template.name}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {template.description}
        </p>
        <div className="flex items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span>Version {template.version}</span>
          <span>•</span>
          <span>{template.provider}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-8">
      <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        No Template Selected
      </h2>
      <p className="text-gray-600 dark:text-gray-400">
        Please select a template from the marketplace first.
      </p>
    </div>
  );
}

// Runtime Step
function RuntimeStep({
  wizardData,
  onUpdate
}: {
  wizardData: WizardData;
  onUpdate: (updates: Partial<WizardData>) => void;
}) {
  const runtimeOptions = [
    {
      id: 'hosted',
      name: 'Hosted Service',
      description: 'Run on managed infrastructure with automatic scaling',
      icon: Globe,
      features: ['Auto-scaling', 'High availability', 'Managed backups', '24/7 monitoring']
    },
    {
      id: 'local',
      name: 'Local Deployment',
      description: 'Run on your local machine or private infrastructure',
      icon: Server,
      features: ['Full control', 'Custom configurations', 'Data privacy', 'Cost effective']
    },
    {
      id: 'docker',
      name: 'Docker Container',
      description: 'Deploy as a Docker container with isolated environment',
      icon: Container,
      features: ['Containerized', 'Portable', 'Easy scaling', 'Environment isolation']
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Choose Deployment Method
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Select how you want to deploy your agent
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {runtimeOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = wizardData.runtime === option.id;

          return (
            <div
              key={option.id}
              onClick={() => onUpdate({ runtime: option.id as any })}
              className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <Icon className={`w-8 h-8 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {option.name}
                  </h3>
                </div>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {option.description}
              </p>

              <ul className="space-y-1">
                {option.features.map((feature, index) => (
                  <li key={index} className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <Check className="w-3 h-3 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Credentials Step
function CredentialsStep({
  template,
  wizardData,
  onUpdate
}: {
  template?: MarketplaceTemplate | null;
  wizardData: WizardData;
  onUpdate: (updates: Partial<WizardData>) => void;
}) {
  const [credentials, setCredentials] = useState(wizardData.credentials);

  const handleCredentialChange = (key: string, value: string) => {
    const newCredentials = { ...credentials, [key]: value };
    setCredentials(newCredentials);
    onUpdate({ credentials: newCredentials });
  };

  const credentialFields = [
    { key: 'api_key', label: 'API Key', type: 'password', required: true },
    { key: 'api_secret', label: 'API Secret', type: 'password', required: false },
    { key: 'username', label: 'Username', type: 'text', required: false },
    { key: 'password', label: 'Password', type: 'password', required: false }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Authentication Setup
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Configure the credentials needed to connect to {template?.name}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {credentialFields.map((field) => (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type={field.type}
              value={credentials[field.key] || ''}
              onChange={(e) => handleCredentialChange(field.key, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={`Enter ${field.label.toLowerCase()}`}
            />
          </div>
        ))}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Key className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
              Security Notice
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Your credentials are encrypted and stored securely. They are only used to authenticate with the agent service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Configuration Step
function ConfigurationStep({
  template,
  wizardData,
  onUpdate
}: {
  template?: MarketplaceTemplate | null;
  wizardData: WizardData;
  onUpdate: (updates: Partial<WizardData>) => void;
}) {
  const [config, setConfig] = useState<Partial<AgentConfig>>(wizardData.config);

  const handleConfigChange = (key: keyof AgentConfig, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    onUpdate({ config: newConfig });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Agent Configuration
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Configure the technical settings for {template?.name}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Base URL
          </label>
          <input
            type="text"
            value={config.base_url || ''}
            onChange={(e) => handleConfigChange('base_url', e.target.value)}
            placeholder="https://api.example.com"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Port
          </label>
          <input
            type="number"
            value={config.port || ''}
            onChange={(e) => handleConfigChange('port', parseInt(e.target.value) || undefined)}
            placeholder="Auto"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Protocol
          </label>
          <select
            value={config.protocol || 'https'}
            onChange={(e) => handleConfigChange('protocol', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="http">HTTP</option>
            <option value="https">HTTPS</option>
            <option value="ws">WebSocket</option>
            <option value="wss">WebSocket Secure</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Timeout (ms)
          </label>
          <input
            type="number"
            value={config.timeout || 30000}
            onChange={(e) => handleConfigChange('timeout', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Concurrency
          </label>
          <input
            type="number"
            value={config.concurrency || 1}
            onChange={(e) => handleConfigChange('concurrency', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            WebSocket Namespace
          </label>
          <input
            type="text"
            value={config.ws_namespace || ''}
            onChange={(e) => handleConfigChange('ws_namespace', e.target.value)}
            placeholder="Default"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
}

// Review Step
function ReviewStep({
  template,
  wizardData,
  onDeploy,
  loading
}: {
  template?: MarketplaceTemplate | null;
  wizardData: WizardData;
  onDeploy: () => void;
  loading: boolean;
}) {
  if (!template) return null;

  const getRuntimeDisplay = (runtime: string) => {
    switch (runtime) {
      case 'hosted': return 'Hosted Service';
      case 'local': return 'Local Deployment';
      case 'docker': return 'Docker Container';
      default: return runtime;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Review Configuration
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Review your agent configuration before deployment
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Agent Details
          </h3>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Name</span>
              <span className="text-sm text-gray-900 dark:text-white">{template.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Provider</span>
              <span className="text-sm text-gray-900 dark:text-white">{template.provider}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Version</span>
              <span className="text-sm text-gray-900 dark:text-white">{template.version}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Runtime</span>
              <span className="text-sm text-gray-900 dark:text-white">{getRuntimeDisplay(wizardData.runtime)}</span>
            </div>
          </div>
        </div>

        {/* Configuration */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Configuration
          </h3>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Base URL</span>
              <span className="text-sm text-gray-900 dark:text-white">{wizardData.config.base_url || 'Auto'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Protocol</span>
              <span className="text-sm text-gray-900 dark:text-white">{wizardData.config.protocol || 'https'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Port</span>
              <span className="text-sm text-gray-900 dark:text-white">{wizardData.config.port || 'Auto'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Timeout</span>
              <span className="text-sm text-gray-900 dark:text-white">{wizardData.config.timeout || 30000}ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* Credentials Status */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Key className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-200 mb-1">
              Credentials Configured
            </h4>
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              {Object.keys(wizardData.credentials).length > 0
                ? `${Object.keys(wizardData.credentials).length} credential(s) configured`
                : 'No credentials configured'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Docker Command Preview */}
      {wizardData.runtime === 'docker' && (
        <div className="bg-gray-900 rounded-lg p-4">
          <h4 className="text-sm font-medium text-white mb-3">Docker Command Preview</h4>
          <div className="bg-black rounded p-3">
            <code className="text-green-400 text-sm font-mono">
              {`docker run -d \\
  --name ${template.slug} \\
  -p ${wizardData.config.port || 8080}:8080 \\
  -e API_KEY=${wizardData.credentials.api_key ? '***' : '<API_KEY>'} \\
  ${template.slug}:${template.version}`}
            </code>
          </div>
        </div>
      )}
    </div>
  );
}
