import React from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { agentsApi } from '@/features/agents/api/agents.api';
import { AgentDetail } from '@/features/agents/components/Detail/AgentDetail';

export function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: agent, isLoading } = useQuery({ queryKey: ['agent', id], queryFn: () => agentsApi.get(id!), enabled: !!id });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="p-8 text-center text-muted-foreground">Agent not found</div>
    );
  }

  return (
    <div className="p-8">
      <AgentDetail agent={agent} />
    </div>
  );
}

