import React, { useState } from 'react';
import type { MarketplaceTemplate, WizardData } from '@/features/agents/model/types';

export default function ConfigurationStep({ template, wizardData, onUpdate }: { template?: MarketplaceTemplate | null; wizardData: WizardData; onUpdate: (u: Partial<WizardData>) => void }) {
  const [timeout, setTimeoutMs] = useState<number>(wizardData.config?.timeout || 30000);
  const [concurrency, setConcurrency] = useState<number>(wizardData.config?.concurrency || 2);
  const save = () => onUpdate({ config: { ...(wizardData.config || {}), timeout, concurrency } });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Agent Settings</h2>
        <p className="text-muted-foreground">Configure advanced parameters</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Timeout (ms)</label>
          <input type="number" className="border rounded px-3 py-2 w-full" value={timeout} onChange={(e) => setTimeoutMs(Number(e.target.value))} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Concurrency</label>
          <input type="number" className="border rounded px-3 py-2 w-full" value={concurrency} onChange={(e) => setConcurrency(Number(e.target.value))} />
        </div>
      </div>
      <div className="flex justify-end"><button onClick={save} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">Save</button></div>
    </div>
  );
}

