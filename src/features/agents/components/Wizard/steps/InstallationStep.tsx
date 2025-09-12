import React, { useState } from 'react';
import { Download, Package, Terminal, CheckCircle, AlertCircle } from 'lucide-react';
import { MarketplaceTemplate, WizardData } from '../../../model/types';

interface InstallationStepProps {
  template?: MarketplaceTemplate | null;
  wizardData: WizardData;
  onUpdate: (updates: Partial<WizardData>) => void;
}

export default function InstallationStep({
  template,
  wizardData,
  onUpdate
}: InstallationStepProps) {
  const [installationMethod, setInstallationMethod] = useState(wizardData.installationMethod || {
    type: 'npm',
    autoInstall: true,
    postInstallSteps: []
  });

  const handleMethodChange = (field: string, value: any) => {
    const newMethod = { ...installationMethod, [field]: value };
    setInstallationMethod(newMethod);
    onUpdate({ installationMethod: newMethod });
  };

  const installationOptions = [
    {
      type: 'npm',
      name: 'NPM Package',
      description: 'Install as an NPM package using node package manager',
      icon: Package,
      command: `npm install ${template?.slug || 'agent-package'}`,
      requirements: ['Node.js 16+', 'NPM 8+'],
      supported: true
    },
    {
      type: 'yarn',
      name: 'Yarn Package',
      description: 'Install using Yarn package manager',
      icon: Package,
      command: `yarn add ${template?.slug || 'agent-package'}`,
      requirements: ['Node.js 16+', 'Yarn 3+'],
      supported: true
    },
    {
      type: 'pip',
      name: 'Python Package',
      description: 'Install as a Python package using pip',
      icon: Package,
      command: `pip install ${template?.slug?.replace('-', '_') || 'agent_package'}`,
      requirements: ['Python 3.8+', 'pip 21+'],
      supported: template?.compatibility?.languages?.includes('Python')
    },
    {
      type: 'docker',
      name: 'Docker Container',
      description: 'Run as a Docker container with all dependencies included',
      icon: Download,
      command: `docker run -d ${template?.slug || 'agent-container'}:${template?.version || 'latest'}`,
      requirements: ['Docker 20+', 'Docker Compose (optional)'],
      supported: true
    },
    {
      type: 'extension',
      name: 'IDE Extension',
      description: 'Install as an IDE extension or plugin',
      icon: Download,
      command: 'Install from IDE marketplace or extensions panel',
      requirements: ['Compatible IDE', 'Extension marketplace access'],
      supported: template?.ideIntegration !== undefined
    },
    {
      type: 'manual',
      name: 'Manual Installation',
      description: 'Download and install manually with custom setup',
      icon: Terminal,
      command: 'Follow installation guide for manual setup',
      requirements: ['Manual configuration', 'System dependencies'],
      supported: true
    }
  ];

  const supportedOptions = installationOptions.filter(option => option.supported);

  const getPostInstallSteps = (type: string) => {
    switch (type) {
      case 'npm':
      case 'yarn':
        return [
          'Configure environment variables',
          'Run initial setup command',
          'Verify installation with test command'
        ];
      case 'pip':
        return [
          'Configure Python environment',
          'Set up virtual environment (recommended)',
          'Run initial configuration script'
        ];
      case 'docker':
        return [
          'Configure container ports',
          'Set up environment variables',
          'Verify container health'
        ];
      case 'extension':
        return [
          'Restart IDE',
          'Configure extension settings',
          'Set up keybindings'
        ];
      case 'manual':
        return [
          'Extract downloaded files',
          'Configure system dependencies',
          'Set up environment variables',
          'Run installation script'
        ];
      default:
        return [];
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Installation Method
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Choose how you want to install {template?.name}
        </p>
      </div>

      {/* Auto Install Toggle */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <Download className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
                Automatic Installation
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Automatically install and configure the agent
              </p>
            </div>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={installationMethod.autoInstall}
              onChange={(e) => handleMethodChange('autoInstall', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
          </div>
        </div>
      </div>

      {/* Installation Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {supportedOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = installationMethod.type === option.type;

          return (
            <div
              key={option.type}
              onClick={() => {
                handleMethodChange('type', option.type);
                handleMethodChange('postInstallSteps', getPostInstallSteps(option.type));
              }}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-start gap-3 mb-3">
                <Icon className={`w-6 h-6 mt-1 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                    {option.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {option.description}
                  </p>
                </div>
                {isSelected && (
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                )}
              </div>

              {/* Command Preview */}
              <div className="bg-gray-900 rounded p-2 mb-3">
                <code className="text-green-400 text-xs font-mono">
                  {option.command}
                </code>
              </div>

              {/* Requirements */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Requirements:</p>
                {option.requirements.map((req, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">{req}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Post Installation Steps */}
      {installationMethod.postInstallSteps && installationMethod.postInstallSteps.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-200 mb-2">
                Post-Installation Steps
              </h4>
              <ul className="space-y-1">
                {installationMethod.postInstallSteps.map((step, index) => (
                  <li key={index} className="text-sm text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
                    <span className="w-5 h-5 flex items-center justify-center text-xs bg-yellow-200 dark:bg-yellow-800 rounded-full">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Installation Preview */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
          Installation Summary
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Method:</span>
            <span className="text-gray-900 dark:text-white font-medium">
              {supportedOptions.find(opt => opt.type === installationMethod.type)?.name}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Auto Install:</span>
            <span className="text-gray-900 dark:text-white">
              {installationMethod.autoInstall ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Post Steps:</span>
            <span className="text-gray-900 dark:text-white">
              {installationMethod.postInstallSteps?.length || 0} steps
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}