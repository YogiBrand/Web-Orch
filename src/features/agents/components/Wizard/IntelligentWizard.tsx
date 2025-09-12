import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Check, ChevronLeft, ChevronRight, Package, Settings, Key, Play, Container, Globe, Server, Code, FileText, AlertCircle, Download } from 'lucide-react';
import type { MarketplaceTemplate, WizardData } from '@/features/agents/model/types';
import { marketplaceApi } from '@/features/agents/api/marketplace.api';
import { toast } from '@/hooks/use-toast';
import { TemplateSelectionStep } from './steps/TemplateSelectionStep';
import { McpConfigurationStep } from './steps/McpConfigurationStep';
import { IdeIntegrationStep } from './steps/IdeIntegrationStep';
import RuntimeStep from './steps/RuntimeStep';
import { BrowserConfigStep } from './steps/BrowserConfigStep';
import { TestConfigStep } from './steps/TestConfigStep';
import CredentialsStep from './steps/CredentialsStep';
import ConfigurationStep from './steps/ConfigurationStep';
import ReviewStep from './steps/ReviewStep';

export function IntelligentWizard({ template }: { template?: MarketplaceTemplate | null }) {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardData, setWizardData] = useState<WizardData>({ runtime: 'hosted', credentials: {}, config: {} });
  const [loading, setLoading] = useState(false);
  const [agentTypeConfig, setAgentTypeConfig] = useState<any>(null);

  const AGENT_TYPE_CONFIGS: any = {
    'mcp-server': { name: 'MCP Server', icon: Server, deployment: 'npx', requiredSteps: ['template', 'mcp-config', 'ide-integration', 'review'], optionalSteps: ['credentials'], needsDocker: false, needsIdeIntegration: true, defaultCommand: 'npx @modelcontextprotocol/server-filesystem' },
    'ide-extension': { name: 'IDE Extension', icon: Code, deployment: 'extension', requiredSteps: ['template', 'ide-config', 'installation', 'review'], optionalSteps: [], needsDocker: false, needsIdeIntegration: false, installMethod: 'extension-marketplace' },
    'ai-agent': { name: 'AI Agent', icon: Globe, deployment: 'docker', requiredSteps: ['template', 'runtime', 'credentials', 'configuration', 'review'], optionalSteps: ['advanced-config'], needsDocker: true, needsIdeIntegration: false },
    'automation-tool': { name: 'Automation Tool', icon: Play, deployment: 'docker', requiredSteps: ['template', 'runtime', 'browser-config', 'credentials', 'review'], optionalSteps: ['proxy-config'], needsDocker: true, needsIdeIntegration: false },
    'testing-framework': { name: 'Testing Framework', icon: Check, deployment: 'npm', requiredSteps: ['template', 'test-config', 'environment', 'review'], optionalSteps: ['ci-integration'], needsDocker: false, needsIdeIntegration: false, installMethod: 'npm' },
  };

  useEffect(() => {
    if (template) {
      const category = template.category.toLowerCase().replace(/\s+/g, '-');
      setAgentTypeConfig(AGENT_TYPE_CONFIGS[category] || AGENT_TYPE_CONFIGS['ai-agent']);
    }
  }, [template]);

  if (!template || !agentTypeConfig) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <AlertCircle className="w-16 h-16 mx-auto mb-4" />
        Preparing intelligent wizard for {template?.name || 'selected agent'}...
      </div>
    );
  }

  const stepsConfig: Record<string, any> = {
    template: { id: 'template', title: 'Template Selection', description: `Selected ${agentTypeConfig.name}`, icon: Package, required: true },
    'mcp-config': { id: 'mcp-config', title: 'MCP Configuration', description: 'Configure MCP server command and capabilities', icon: Server, required: true },
    'ide-integration': { id: 'ide-integration', title: 'IDE Integration', description: 'Connect to your preferred IDE', icon: Code, required: true },
    runtime: { id: 'runtime', title: 'Deployment Method', description: 'Choose how to deploy the agent', icon: Container, required: true },
    'browser-config': { id: 'browser-config', title: 'Browser Settings', description: 'Configure browser automation preferences', icon: Globe, required: true },
    'test-config': { id: 'test-config', title: 'Test Configuration', description: 'Set up testing parameters', icon: Check, required: true },
    credentials: { id: 'credentials', title: 'Authentication', description: 'Configure API credentials if needed', icon: Key, required: false },
    configuration: { id: 'configuration', title: 'Agent Settings', description: 'Configure advanced parameters', icon: Settings, required: true },
    review: { id: 'review', title: 'Review & Deploy', description: 'Review configuration and deploy', icon: FileText, required: true },
  };

  const stepsOrder = agentTypeConfig.requiredSteps as string[];
  const steps = stepsOrder.map((id: string) => stepsConfig[id]).filter(Boolean);

  const setData = (updates: Partial<WizardData>) => setWizardData((prev) => ({ ...prev, ...updates }));
  const handleNext = () => setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  const handlePrevious = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const deploy = async () => {
    setLoading(true);
    try {
      const res = await marketplaceApi.install(template.slug, {
        ...wizardData.config,
        credentials: wizardData.credentials,
        runtime: wizardData.runtime,
        browserConfig: wizardData.browserConfig,
      });
      if (res.success) {
        toast({ title: `${template.name} deployed successfully!` });
        setLocation('/agents');
      } else {
        toast({ title: `Deployment failed`, description: res.error || 'Unknown error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    const step = steps[currentStep]?.id;
    switch (step) {
      case 'template':
        return <TemplateSelectionStep template={template} wizardData={wizardData} onUpdate={setData} />;
      case 'mcp-config':
        return <McpConfigurationStep template={template} wizardData={wizardData} onUpdate={setData} />;
      case 'ide-integration':
        return <IdeIntegrationStep template={template} wizardData={wizardData} onUpdate={setData} />;
      case 'runtime':
        return <RuntimeStep template={template} wizardData={wizardData} onUpdate={setData} />;
      case 'browser-config':
        return <BrowserConfigStep template={template} wizardData={wizardData} onUpdate={setData} />;
      case 'test-config':
        return <TestConfigStep template={template} wizardData={wizardData} onUpdate={setData} />;
      case 'credentials':
        return <CredentialsStep template={template} wizardData={wizardData} onUpdate={setData} />;
      case 'configuration':
        return <ConfigurationStep template={template} wizardData={wizardData} onUpdate={setData} />;
      case 'review':
        return <ReviewStep template={template} wizardData={wizardData} onUpdate={setData} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Deploy {template.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">{agentTypeConfig.name} • {String(agentTypeConfig.deployment).toUpperCase()} deployment</p>
          </div>
          <div className="text-sm text-muted-foreground">Step {currentStep + 1} of {steps.length}</div>
        </div>
        <div className="flex items-center space-x-4">
          {steps.map((s: any, i: number) => {
            const Icon = s.icon || Download;
            const isActive = i === currentStep;
            const isCompleted = i < currentStep;
            return (
              <React.Fragment key={s.id}>
                <div className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${isCompleted ? 'bg-green-500 border-green-500 text-white' : isActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-400'}`}>
                    {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <div className="ml-3">
                    <div className={`text-sm font-medium ${isActive ? 'text-blue-600 dark:text-blue-400' : isCompleted ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>{s.title}</div>
                    <div className="text-xs text-muted-foreground">{s.description}</div>
                  </div>
                </div>
                {i < steps.length - 1 && (<div className={`flex-1 h-px ${i < currentStep ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />)}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border p-8">{renderStep()}</div>

      <div className="flex items-center justify-between mt-8">
        <button onClick={handlePrevious} disabled={currentStep === 0} className="flex items-center gap-2 px-6 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 rounded-lg"><ChevronLeft className="w-4 h-4" />Previous</button>
        <div className="flex items-center gap-3">
          {currentStep === steps.length - 1 ? (
            <button onClick={deploy} disabled={loading} className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg">{loading ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>Deploying...</>) : (<><Play className="w-4 h-4" />Deploy {agentTypeConfig.name}</>)}</button>
          ) : (
            <button onClick={handleNext} className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Next<ChevronRight className="w-4 h-4" /></button>
          )}
        </div>
      </div>
    </div>
  );
}

