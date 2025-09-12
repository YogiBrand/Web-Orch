import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Link } from 'wouter';
import { agentsApi } from '@/features/agents/api/agents.api';
import { AgentsTable } from '@/features/agents/components/Dashboard/AgentsTable';
import { KpisBar } from '@/features/agents/components/Dashboard/KpisBar';

export function AgentsDashboardPage() {
  const { data: agents = [], isLoading } = useQuery({ queryKey: ['agents-list'], queryFn: agentsApi.list });

  const kpis = React.useMemo(() => {
    const connected = agents.filter(a => a.status === 'running').length;
    const degraded = agents.filter(a => a.status === 'error').length;
    const offline = agents.filter(a => a.status === 'stopped').length;
    return { connected, degraded, offline, total: agents.length };
  }, [agents]);

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (<div key={i} className="h-24 bg-gray-200 rounded" />))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agent Dashboard</h1>
          <p className="text-muted-foreground mt-1">Monitor and manage your connected agents</p>
        </div>
        <Link href="/agents/marketplace">
          <a className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"><Plus className="h-4 w-4" />Add Agent</a>
        </Link>
      </div>
      <KpisBar kpis={kpis} />
      <div className="bg-white dark:bg-gray-800 rounded-lg border">
        <div className="px-6 py-4 border-b"><h2 className="text-lg font-medium">Connected Agents</h2></div>
        <AgentsTable agents={agents} />
      </div>
    </div>
  );
}

