import React, { useState } from 'react';
import type { MarketplaceTemplate, WizardData } from '@/features/agents/model/types';

export default function CredentialsStep({ template, wizardData, onUpdate }: { template?: MarketplaceTemplate | null; wizardData: WizardData; onUpdate: (u: Partial<WizardData>) => void }) {
  const [credentials, setCredentials] = useState<Record<string, string>>(wizardData.credentials || {});
  const fields = [
    { key: 'api_key', label: 'API Key', type: 'password', required: true },
    { key: 'api_secret', label: 'API Secret', type: 'password', required: false },
  ];
  const set = (k: string, v: string) => { const next = { ...credentials, [k]: v }; setCredentials(next); onUpdate({ credentials: next }); };
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Authentication</h2>
        <p className="text-muted-foreground">Configure credentials for {template?.name}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="block text-sm font-medium mb-2">{f.label} {f.required && (<span className="text-red-500">*</span>)}</label>
            <input type={f.type} value={credentials[f.key] || ''} onChange={(e) => set(f.key, e.target.value)} className="w-full px-3 py-2 border rounded" placeholder={`Enter ${f.label.toLowerCase()}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

