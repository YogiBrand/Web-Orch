import React, { useState } from 'react';
import type { MarketplaceTemplate, WizardData } from '@/features/agents/model/types';

export function McpConfigurationStep({ template, wizardData, onUpdate }: { template?: MarketplaceTemplate | null; wizardData: WizardData; onUpdate: (u: Partial<WizardData>) => void }) {
  const [command, setCommand] = useState(wizardData.mcpConfig?.command || 'npx @modelcontextprotocol/server-filesystem');
  const [args, setArgs] = useState<string>(wizardData.mcpConfig?.args?.join(' ') || '');
  const [env, setEnv] = useState<string>(Object.entries(wizardData.mcpConfig?.env || {}).map(([k, v]) => `${k}=${v}`).join('\n'));

  const save = () => {
    onUpdate({ mcpConfig: { command, args: args.trim() ? args.split(/\s+/) : [], env: Object.fromEntries(env.split('\n').filter(Boolean).map(l => l.split('='))) } });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">MCP Configuration</h2>
        <p className="text-muted-foreground">Configure the MCP server command and environment</p>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Command</label>
          <input className="w-full border rounded px-3 py-2" value={command} onChange={(e) => setCommand(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Args</label>
          <input className="w-full border rounded px-3 py-2" value={args} onChange={(e) => setArgs(e.target.value)} placeholder="--host 0.0.0.0 --port 3002" />
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

