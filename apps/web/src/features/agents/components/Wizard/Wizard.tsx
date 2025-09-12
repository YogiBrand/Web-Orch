```typescript
import React, { useState, useCallback } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { WizardStep, WizardData, MarketplaceTemplate } from '../../model/types';
import { RuntimeStep } from './RuntimeStep';
import { CredentialsStep } from './CredentialsStep';
import { ConfigStep } from './ConfigStep';
import { TestStep } from './TestStep';
import { ReviewStep } from './ReviewStep';
import { agentsApi } from '../../api/agents.api';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';

interface WizardProps {
  template?: MarketplaceTemplate | null;
}

export function Wizard({ template }: WizardProps) {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [currentStep, setCurrentStep] = useState(0);
  const [wizardData, setWizardData] = useState<WizardData>(() => {
    const initialConfig = template?.defaultConfig || {};
    return {
      template: template || undefined,
      runtime: template?.runtime || 'local', // Default to local if no template
      credentials: {},
      config: initialConfig,
      testResults: undefined,
    };
  });

  const steps: WizardStep[] = [
    { id: 'runtime', title: 'Runtime', description: 'Choose where your agent will run', completed: false },
    { id: 'credentials', title: 'Credentials', description: 'Provide necessary API keys or tokens', completed: false },
    { id: 'config', title: 'Configuration', description: 'Set up agent specific parameters', completed: false },
    { id: 'test', title: 'Test Connection', description: 'Verify agent connectivity', completed: false },
    { id: 'review', title: 'Review & Create', description: 'Confirm and create your agent', completed: false },
  ];

  const updateWizardData = useCallback((newData: Partial<WizardData>) => {
    setWizardData(prevData => ({ ...prevData, ...newData }));
  }, []);

  const handleStepComplete = useCallback((data: any) => {
    setWizardData(prevData => {
      const updatedSteps = [...steps];
      updatedSteps[currentStep].completed = true;
      return { ...prevData, ...data };
    });
    setCurrentStep(prevStep => prevStep + 1);
  }, [currentStep, steps]);

  const handleBack = useCallback(() => {
    setCurrentStep(prevStep => prevStep - 1);
  }, []);

  const handleCreateAgent = async () => {
    try {
      const agentToCreate = {
        name: wizardData.template?.name || 'New Agent', // Fallback name
        type: wizardData.template?.slug || 'custom', // Fallback type
        runtime: wizardData.runtime,
        provider: wizardData.template?.provider || 'Custom',
        version: wizardData.template?.version || '1.0.0',
        capabilities: wizardData.template?.capabilities || [],
        config: wizardData.config,
        credentials: wizardData.credentials,
        status: 'deploying', // Initial status
      };

      const response = await agentsApi.create(agentToCreate);
      if (response.success) {
        toast.success('Agent created successfully!');
        queryClient.invalidateQueries({ queryKey: ['agents'] });
        setLocation(`/agents/${response.agentId}`); // Redirect to agent detail page
      } else {
        toast.error(response.message || 'Failed to create agent.');
      }
    } catch (error: any) {
      toast.error(error.message || 'An unexpected error occurred during agent creation.');
    }
  };

  const renderStepContent = () => {
    switch (steps[currentStep].id) {
      case 'runtime':
        return <RuntimeStep data={wizardData} onComplete={handleStepComplete} />;
      case 'credentials':
        return <CredentialsStep data={wizardData} onComplete={handleStepComplete} />;
      case 'config':
        return <ConfigStep data={wizardData} onComplete={handleStepComplete} />;
      case 'test':
        return <TestStep data={wizardData} onComplete={handleStepComplete} />;
      case 'review':
        return <ReviewStep data={wizardData} onComplete={handleCreateAgent} />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Create New Agent
        </h1>
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          Step {currentStep + 1} of {steps.length}
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                  index === currentStep
                    ? 'bg-blue-600'
                    : step.completed
                    ? 'bg-green-500'
                    : 'bg-gray-300 dark:bg-gray-700'
                }`}
              >
                {step.completed ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <span
                className={`mt-2 text-xs font-medium ${
                  index === currentStep
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {step.title}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 ${
                  step.completed ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">{renderStepContent()}</div>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        <button
          onClick={handleBack}
          disabled={currentStep === 0 || isNaN(currentStep)}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        {currentStep < steps.length - 1 && (
          <button
            onClick={() => handleStepComplete(wizardData)} // Pass current wizardData to next step
            disabled={!steps[currentStep].completed && steps[currentStep].id !== 'test'} // Allow proceeding from test step even if not completed
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {currentStep === steps.length - 1 && (
          <button
            onClick={handleCreateAgent}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            Create Agent
            <Check className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
```