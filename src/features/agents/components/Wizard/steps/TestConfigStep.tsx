import React, { useState } from 'react';
import type { MarketplaceTemplate, WizardData } from '@/features/agents/model/types';

export function TestConfigStep({ template, wizardData, onUpdate }: { template?: MarketplaceTemplate | null; wizardData: WizardData; onUpdate: (u: Partial<WizardData>) => void }) {
  const [cfg, setCfg] = useState(wizardData.testConfig || { framework: 'playwright', testDir: 'tests', coverage: true, parallel: true, retries: 0 });
  const set = (u: any) => { const next = { ...cfg, ...u }; setCfg(next); onUpdate({ testConfig: next }); };
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Test Configuration</h2>
        <p className="text-muted-foreground">Set up testing parameters</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Framework</label>
          <select className="border rounded px-3 py-2" value={cfg.framework} onChange={(e) => set({ framework: e.target.value })}>
            <option value="playwright">Playwright</option>
            <option value="jest">Jest</option>
            <option value="cypress">Cypress</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Test Directory</label>
          <input className="border rounded px-3 py-2 w-full" value={cfg.testDir} onChange={(e) => set({ testDir: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Coverage</label>
          <select className="border rounded px-3 py-2" value={String(cfg.coverage)} onChange={(e) => set({ coverage: e.target.value === 'true' })}>
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Parallel</label>
          <select className="border rounded px-3 py-2" value={String(cfg.parallel)} onChange={(e) => set({ parallel: e.target.value === 'true' })}>
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Retries</label>
          <input type="number" className="border rounded px-3 py-2 w-full" value={cfg.retries} onChange={(e) => set({ retries: Number(e.target.value) })} />
        </div>
      </div>
    </div>
  );
}

