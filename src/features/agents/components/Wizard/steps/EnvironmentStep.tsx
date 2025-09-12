import React, { useState } from 'react';
import { Layers, Code, Play, Check, Plus, X } from 'lucide-react';
import { MarketplaceTemplate, WizardData } from '../../../model/types';

interface EnvironmentStepProps {
  template?: MarketplaceTemplate | null;
  wizardData: WizardData;
  onUpdate: (updates: Partial<WizardData>) => void;
}

export default function EnvironmentStep({
  template,
  wizardData,
  onUpdate
}: EnvironmentStepProps) {
  const [environmentConfig, setEnvironmentConfig] = useState(wizardData.environmentConfig || {
    nodeVersion: '',
    pythonVersion: '',
    dependencies: [],
    devDependencies: [],
    scripts: {}
  });

  const [newDependency, setNewDependency] = useState('');
  const [newDevDependency, setNewDevDependency] = useState('');
  const [newScript, setNewScript] = useState({ name: '', command: '' });

  const handleConfigChange = (field: string, value: any) => {
    const newConfig = { ...environmentConfig, [field]: value };
    setEnvironmentConfig(newConfig);
    onUpdate({ environmentConfig: newConfig });
  };

  const addDependency = (type: 'dependencies' | 'devDependencies') => {
    const dependency = type === 'dependencies' ? newDependency : newDevDependency;
    if (!dependency.trim()) return;

    const current = environmentConfig[type] || [];
    if (!current.includes(dependency)) {
      handleConfigChange(type, [...current, dependency]);
    }
    
    if (type === 'dependencies') {
      setNewDependency('');
    } else {
      setNewDevDependency('');
    }
  };

  const removeDependency = (type: 'dependencies' | 'devDependencies', dependency: string) => {
    const current = environmentConfig[type] || [];
    handleConfigChange(type, current.filter(dep => dep !== dependency));
  };

  const addScript = () => {
    if (!newScript.name.trim() || !newScript.command.trim()) return;
    
    const currentScripts = environmentConfig.scripts || {};
    handleConfigChange('scripts', {
      ...currentScripts,
      [newScript.name]: newScript.command
    });
    setNewScript({ name: '', command: '' });
  };

  const removeScript = (scriptName: string) => {
    const currentScripts = environmentConfig.scripts || {};
    const { [scriptName]: removed, ...remaining } = currentScripts;
    handleConfigChange('scripts', remaining);
  };

  const nodeVersions = ['18.x', '19.x', '20.x', '21.x', 'latest'];
  const pythonVersions = ['3.8', '3.9', '3.10', '3.11', '3.12'];

  const commonDependencies = [
    'express', 'axios', 'lodash', 'moment', 'uuid', 'cors', 'helmet',
    'jsonwebtoken', 'bcryptjs', 'mongoose', 'sequelize', 'prisma'
  ];

  const commonDevDependencies = [
    'nodemon', 'typescript', '@types/node', 'ts-node', 'eslint', 'prettier',
    'jest', 'supertest', '@types/jest', 'concurrently', 'dotenv'
  ];

  const frameworkScripts = {
    'jest': {
      'test': 'jest',
      'test:watch': 'jest --watch',
      'test:coverage': 'jest --coverage'
    },
    'mocha': {
      'test': 'mocha',
      'test:watch': 'mocha --watch',
      'test:coverage': 'nyc mocha'
    },
    'playwright': {
      'test': 'playwright test',
      'test:headed': 'playwright test --headed',
      'test:debug': 'playwright test --debug'
    },
    'cypress': {
      'cy:open': 'cypress open',
      'cy:run': 'cypress run',
      'cy:test': 'cypress run --headless'
    }
  };

  const addFrameworkScripts = (framework: string) => {
    const scripts = frameworkScripts[framework as keyof typeof frameworkScripts];
    if (scripts) {
      const currentScripts = environmentConfig.scripts || {};
      handleConfigChange('scripts', { ...currentScripts, ...scripts });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Environment Setup
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Configure the runtime environment for {template?.name}
        </p>
      </div>

      {/* Runtime Versions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-green-500" />
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Node.js Version
            </label>
          </div>
          <select
            value={environmentConfig.nodeVersion || ''}
            onChange={(e) => handleConfigChange('nodeVersion', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select Node.js version</option>
            {nodeVersions.map((version) => (
              <option key={version} value={version}>Node.js {version}</option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5 text-blue-500" />
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Python Version (Optional)
            </label>
          </div>
          <select
            value={environmentConfig.pythonVersion || ''}
            onChange={(e) => handleConfigChange('pythonVersion', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">No Python required</option>
            {pythonVersions.map((version) => (
              <option key={version} value={version}>Python {version}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Dependencies */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Dependencies</h3>
        
        {/* Production Dependencies */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Production Dependencies</h4>
          <div className="flex gap-2">
            <input
              type="text"
              value={newDependency}
              onChange={(e) => setNewDependency(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addDependency('dependencies')}
              placeholder="Add dependency (e.g., express)"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() => addDependency('dependencies')}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          {/* Common Dependencies Quick Add */}
          <div className="flex flex-wrap gap-2">
            {commonDependencies.map((dep) => (
              <button
                key={dep}
                onClick={() => {
                  if (!(environmentConfig.dependencies || []).includes(dep)) {
                    handleConfigChange('dependencies', [...(environmentConfig.dependencies || []), dep]);
                  }
                }}
                className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {dep}
              </button>
            ))}
          </div>

          {/* Current Dependencies */}
          {environmentConfig.dependencies && environmentConfig.dependencies.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {environmentConfig.dependencies.map((dep) => (
                <span
                  key={dep}
                  className="inline-flex items-center gap-2 px-3 py-1 text-sm bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-full"
                >
                  {dep}
                  <button
                    onClick={() => removeDependency('dependencies', dep)}
                    className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Development Dependencies */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Development Dependencies</h4>
          <div className="flex gap-2">
            <input
              type="text"
              value={newDevDependency}
              onChange={(e) => setNewDevDependency(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addDependency('devDependencies')}
              placeholder="Add dev dependency (e.g., nodemon)"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() => addDependency('devDependencies')}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          {/* Common Dev Dependencies Quick Add */}
          <div className="flex flex-wrap gap-2">
            {commonDevDependencies.map((dep) => (
              <button
                key={dep}
                onClick={() => {
                  if (!(environmentConfig.devDependencies || []).includes(dep)) {
                    handleConfigChange('devDependencies', [...(environmentConfig.devDependencies || []), dep]);
                  }
                }}
                className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {dep}
              </button>
            ))}
          </div>

          {/* Current Dev Dependencies */}
          {environmentConfig.devDependencies && environmentConfig.devDependencies.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {environmentConfig.devDependencies.map((dep) => (
                <span
                  key={dep}
                  className="inline-flex items-center gap-2 px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-full"
                >
                  {dep}
                  <button
                    onClick={() => removeDependency('devDependencies', dep)}
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Scripts */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Play className="w-5 h-5 text-purple-500" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">NPM Scripts</h3>
        </div>

        {/* Framework Script Templates */}
        <div className="space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">Quick add framework scripts:</p>
          <div className="flex flex-wrap gap-2">
            {Object.keys(frameworkScripts).map((framework) => (
              <button
                key={framework}
                onClick={() => addFrameworkScripts(framework)}
                className="px-3 py-1 text-sm bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-900/30 transition-colors"
              >
                {framework}
              </button>
            ))}
          </div>
        </div>

        {/* Add Custom Script */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input
            type="text"
            value={newScript.name}
            onChange={(e) => setNewScript({ ...newScript, name: e.target.value })}
            placeholder="Script name (e.g., start)"
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="text"
            value={newScript.command}
            onChange={(e) => setNewScript({ ...newScript, command: e.target.value })}
            placeholder="Script command (e.g., node index.js)"
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={addScript}
            className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Add Script
          </button>
        </div>

        {/* Current Scripts */}
        {environmentConfig.scripts && Object.keys(environmentConfig.scripts).length > 0 && (
          <div className="space-y-2">
            {Object.entries(environmentConfig.scripts).map(([name, command]) => (
              <div key={name} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{name}</span>
                    <code className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                      npm run {name}
                    </code>
                  </div>
                  <code className="text-sm text-gray-600 dark:text-gray-400">{command}</code>
                </div>
                <button
                  onClick={() => removeScript(name)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Environment Summary */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Check className="w-5 h-5 text-green-500" />
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            Environment Summary
          </h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Node.js:</span>
              <span className="text-gray-900 dark:text-white">
                {environmentConfig.nodeVersion || 'Not specified'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Python:</span>
              <span className="text-gray-900 dark:text-white">
                {environmentConfig.pythonVersion || 'Not required'}
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Dependencies:</span>
              <span className="text-gray-900 dark:text-white">
                {(environmentConfig.dependencies || []).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Scripts:</span>
              <span className="text-gray-900 dark:text-white">
                {Object.keys(environmentConfig.scripts || {}).length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}