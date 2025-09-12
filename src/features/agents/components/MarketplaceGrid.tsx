import React from 'react';
import type { MarketplaceTemplate } from '@/features/agents/model/types';
import { MarketplaceCard } from './MarketplaceCard';

export function MarketplaceGrid({ templates, onTemplateSelect }: { templates: MarketplaceTemplate[]; onTemplateSelect: (t: MarketplaceTemplate) => void }) {
  if (!templates.length) {
    return (
      <div className="text-center text-muted-foreground py-12">
        No templates found. Try adjusting filters or search.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {templates.map((t) => (
        <MarketplaceCard key={t.id} template={t} onClick={() => onTemplateSelect(t)} />
      ))}
    </div>
  );
}

