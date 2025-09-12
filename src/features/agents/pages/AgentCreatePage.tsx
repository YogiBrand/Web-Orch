import React from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { marketplaceApi } from '@/features/agents/api/marketplace.api';
import { IntelligentWizard } from '@/features/agents/components/Wizard/IntelligentWizard';

export function AgentCreatePage() {
  const { template: templateSlug } = useParams<{ template?: string }>();
  const { data: template } = useQuery({ queryKey: ['marketplace-template', templateSlug], queryFn: () => templateSlug ? marketplaceApi.getTemplate(templateSlug) : Promise.resolve(null), enabled: !!templateSlug });
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <IntelligentWizard template={template as any} />
      </div>
    </div>
  );
}

