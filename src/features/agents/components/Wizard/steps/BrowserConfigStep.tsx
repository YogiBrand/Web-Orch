import React, { useState } from 'react';
import type { MarketplaceTemplate, WizardData } from '@/features/agents/model/types';

export function BrowserConfigStep({ template, wizardData, onUpdate }: { template?: MarketplaceTemplate | null; wizardData: WizardData; onUpdate: (u: Partial<WizardData>) => void }) {
  const [cfg, setCfg] = useState(wizardData.browserConfig || { browserType: 'chrome', headless: true, viewport: { width: 1280, height: 720 } });
  const set = (u: any) => { const next = { ...cfg, ...u }; setCfg(next); onUpdate({ browserConfig: next }); };
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Browser Settings</h2>
        <p className="text-muted-foreground">Configure browser automation preferences for {template?.name}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Browser</label>
          <select className="border rounded px-3 py-2" value={cfg.browserType} onChange={(e) => set({ browserType: e.target.value })}>
            <option value="chrome">Chrome</option>
            <option value="firefox">Firefox</option>
            <option value="edge">Edge</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Headless</label>
          <select className="border rounded px-3 py-2" value={String(cfg.headless)} onChange={(e) => set({ headless: e.target.value === 'true' })}>
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Viewport Width</label>
          <input type="number" className="border rounded px-3 py-2 w-full" value={cfg.viewport.width} onChange={(e) => set({ viewport: { ...cfg.viewport, width: Number(e.target.value) } })} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Viewport Height</label>
          <input type="number" className="border rounded px-3 py-2 w-full" value={cfg.viewport.height} onChange={(e) => set({ viewport: { ...cfg.viewport, height: Number(e.target.value) } })} />
        </div>
      </div>
    </div>
  );
}

