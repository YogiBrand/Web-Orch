import React from 'react';
import type { MarketplaceTemplate, WizardData } from '@/features/agents/model/types';

export default function ReviewStep({ template, wizardData }: { template?: MarketplaceTemplate | null; wizardData: WizardData; onUpdate: (u: Partial<WizardData>) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Review & Deploy</h2>
        <p className="text-muted-foreground">Confirm your configuration for {template?.name}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded p-4">
          <h3 className="font-medium mb-2">Runtime</h3>
          <div className="text-sm text-muted-foreground">{wizardData.runtime}</div>
        </div>
        <div className="border rounded p-4">
          <h3 className="font-medium mb-2">Credentials</h3>
          <div className="text-sm text-muted-foreground">{Object.keys(wizardData.credentials || {}).length ? 'Configured' : 'None'}</div>
        </div>
        <div className="border rounded p-4">
          <h3 className="font-medium mb-2">Config</h3>
          <pre className="text-xs bg-muted p-2 rounded overflow-auto">{JSON.stringify(wizardData.config || {}, null, 2)}</pre>
        </div>
      </div>
      <div className="text-sm text-muted-foreground">Click Deploy to start installation.</div>
    </div>
  );
}

