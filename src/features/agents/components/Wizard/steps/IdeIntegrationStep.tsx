import React, { useState } from 'react';
import type { MarketplaceTemplate, WizardData } from '@/features/agents/model/types';

export function IdeIntegrationStep({ template, wizardData, onUpdate }: { template?: MarketplaceTemplate | null; wizardData: WizardData; onUpdate: (u: Partial<WizardData>) => void }) {
  const [ide, setIde] = useState(wizardData.ideIntegration?.primary || 'vscode');
  const [env, setEnv] = useState<string>(Object.entries(wizardData.ideIntegration?.env || {}).map(([k, v]) => `${k}=${v}`).join('\n'));
  const save = () => onUpdate({ ideIntegration: { primary: ide, ides: [ide], env: Object.fromEntries(env.split('\n').filter(Boolean).map(l => l.split('='))) } });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">IDE Integration</h2>
        <p className="text-muted-foreground">Connect {template?.name} to your preferred IDE</p>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Select IDE</label>
          <select className="border rounded px-3 py-2" value={ide} onChange={(e) => setIde(e.target.value)}>
            <option value="vscode">VS Code</option>
            <option value="cursor">Cursor</option>
            <option value="jetbrains">JetBrains</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Environment (KEY=VALUE per line)</label>
          <textarea className="w-full border rounded px-3 py-2 h-24" value={env} onChange={(e) => setEnv(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end"><button onClick={save} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">Save</button></div>
    </div>
  );
}

