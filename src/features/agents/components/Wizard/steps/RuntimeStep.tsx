import React from 'react';
import type { MarketplaceTemplate, WizardData } from '@/features/agents/model/types';

export default function RuntimeStep({ template, wizardData, onUpdate }: { template?: MarketplaceTemplate | null; wizardData: WizardData; onUpdate: (u: Partial<WizardData>) => void }) {
  const setRuntime = (r: 'local' | 'hosted' | 'docker') => onUpdate({ runtime: r });
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Deployment Method</h2>
        <p className="text-muted-foreground">Choose how to deploy {template?.name}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {([
          { id: 'hosted', title: 'Hosted', desc: 'Use a hosted endpoint or SaaS' },
          { id: 'local', title: 'Local', desc: 'Run locally on your machine' },
          { id: 'docker', title: 'Docker', desc: 'Run in a containerized environment' },
        ] as const).map((opt) => (
          <button key={opt.id} onClick={() => setRuntime(opt.id)} className={`border rounded p-4 text-left hover:shadow ${wizardData.runtime === opt.id ? 'border-blue-500' : ''}`}>
            <div className="font-medium">{opt.title}</div>
            <div className="text-sm text-muted-foreground">{opt.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

