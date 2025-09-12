import React, { useState } from 'react';
import { Code, Settings, Keyboard, Check } from 'lucide-react';
import { MarketplaceTemplate, WizardData } from '../../../model/types';

interface IdeConfigStepProps {
  template?: MarketplaceTemplate | null;
  wizardData: WizardData;
  onUpdate: (updates: Partial<WizardData>) => void;
}

export default function IdeConfigStep({
  template,
  wizardData,
  onUpdate
}: IdeConfigStepProps) {
  const [ideConfig, setIdeConfig] = useState(wizardData.ideConfig || {
    autoInstall: true,
    settings: {},
    keybindings: {}
  });

  const handleConfigChange = (field: string, value: any) => {
    const newConfig = { ...ideConfig, [field]: value };
    setIdeConfig(newConfig);
    onUpdate({ ideConfig: newConfig });
  };

  const handleSettingChange = (key: string, value: any) => {
    const newSettings = { ...ideConfig.settings, [key]: value };
    handleConfigChange('settings', newSettings);
  };

  const handleKeybindingChange = (command: string, keybinding: string) => {
    const newKeybindings = { ...ideConfig.keybindings, [command]: keybinding };
    handleConfigChange('keybindings', newKeybindings);
  };

  const defaultSettings = [
    { key: 'autoSave', label: 'Auto Save', type: 'boolean', description: 'Automatically save files when modified' },
    { key: 'formatOnSave', label: 'Format on Save', type: 'boolean', description: 'Format code when saving files' },
    { key: 'lintOnSave', label: 'Lint on Save', type: 'boolean', description: 'Run linting when saving files' },
    { key: 'theme', label: 'Theme', type: 'select', options: ['dark', 'light', 'auto'], description: 'IDE color theme' },
    { key: 'fontSize', label: 'Font Size', type: 'number', min: 10, max: 24, description: 'Editor font size in pixels' }
  ];

  const defaultKeybindings = [
    { command: 'agent.run', label: 'Run Agent', defaultKey: 'Ctrl+R' },
    { command: 'agent.stop', label: 'Stop Agent', defaultKey: 'Ctrl+Shift+R' },
    { command: 'agent.debug', label: 'Debug Agent', defaultKey: 'F5' },
    { command: 'agent.logs', label: 'Show Logs', defaultKey: 'Ctrl+`' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          IDE Configuration
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Configure IDE extension settings and keybindings for {template?.name}
        </p>
      </div>

      {/* Auto Install Option */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <Code className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
                Automatic Installation
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Automatically install and configure the IDE extension
              </p>
            </div>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={ideConfig.autoInstall}
              onChange={(e) => handleConfigChange('autoInstall', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
          </div>
        </div>
      </div>

      {/* IDE Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Extension Settings
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {defaultSettings.map((setting) => (
            <div key={setting.key} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {setting.label}
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {setting.description}
              </p>
              {setting.type === 'boolean' && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={ideConfig.settings[setting.key] || false}
                    onChange={(e) => handleSettingChange(setting.key, e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                    {ideConfig.settings[setting.key] ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              )}
              {setting.type === 'select' && (
                <select
                  value={ideConfig.settings[setting.key] || setting.options?.[0]}
                  onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {setting.options?.map((option) => (
                    <option key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </option>
                  ))}
                </select>
              )}
              {setting.type === 'number' && (
                <input
                  type="number"
                  min={setting.min}
                  max={setting.max}
                  value={ideConfig.settings[setting.key] || ''}
                  onChange={(e) => handleSettingChange(setting.key, parseInt(e.target.value) || undefined)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={`${setting.min}-${setting.max}`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Keybindings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Keyboard className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Keyboard Shortcuts
          </h3>
        </div>
        <div className="space-y-3">
          {defaultKeybindings.map((binding) => (
            <div key={binding.command} className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {binding.label}
                </label>
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={ideConfig.keybindings?.[binding.command] || binding.defaultKey}
                  onChange={(e) => handleKeybindingChange(binding.command, e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={binding.defaultKey}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Configuration Preview */}
      {Object.keys(ideConfig.settings).length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Check className="w-5 h-5 text-green-500" />
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Configuration Preview
            </h4>
          </div>
          <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">
            {JSON.stringify(ideConfig, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}