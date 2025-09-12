import React from 'react';
import type { MarketplaceTemplate, WizardData } from '@/features/agents/model/types';

export function TemplateSelectionStep({ template }: { template?: MarketplaceTemplate | null; wizardData: WizardData; onUpdate: (u: Partial<WizardData>) => void }) {
  return (
    <div className="text-center py-8">
      <h2 className="text-xl font-semibold mb-2">Template Selected</h2>
      <p className="text-muted-foreground">You are configuring {template?.name} by {template?.provider}</p>
    </div>
  );
}

