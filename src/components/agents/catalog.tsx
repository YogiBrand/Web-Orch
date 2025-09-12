import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { PlusCircle, Rocket } from 'lucide-react';

interface AgentDefinition {
  id: string;
  name: string;
  description?: string;
  type: string;
  version?: string;
  capabilities?: string[];
  tags?: string[];
}

export default function AgentsCatalog() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery<{ agents: AgentDefinition[]; total: number; page: number; limit: number } | any>({
    queryKey: ['/api/agents/registry/definitions?page=1&limit=20'],
  });

  const defs: AgentDefinition[] = Array.isArray(data?.agents) ? data.agents : Array.isArray(data?.data?.agents) ? data.data.agents : [];

  const deployMutation = useMutation({
    mutationFn: async (agent: AgentDefinition) => {
      // Minimal deploy payload; server has schemas but we send safe defaults
      const payload = {
        agent_id: agent.id,
        name: `${agent.name} Instance`,
        config: {},
      };
      return apiRequest('/api/agents/registry/deploy', { method: 'POST', data: payload });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/agents'] });
    },
  });

  if (isLoading) return <div className="max-w-6xl mx-auto px-6 py-8 text-muted-foreground">Loading catalog…</div>;
  if (error) return <div className="max-w-6xl mx-auto px-6 py-8 text-red-600">Failed to load catalog</div>;

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2"><Rocket className="h-5 w-5" /> Agent Catalog</h2>
        <div className="text-sm text-muted-foreground">{defs.length} available</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {defs.map((def) => (
          <Card key={def.id}>
            <CardHeader>
              <CardTitle className="text-base">{def.name}</CardTitle>
              <CardDescription>{def.description || 'No description'}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground mb-3">Type: {def.type} • Version: {def.version || '1.0.0'}</div>
              <div className="flex flex-wrap gap-1 mb-4">
                {(def.capabilities || []).slice(0, 6).map((cap) => (
                  <span key={cap} className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">{cap}</span>
                ))}
              </div>
              <Button size="sm" onClick={() => deployMutation.mutate(def)} disabled={deployMutation.isPending} className="gap-2">
                <PlusCircle className="h-4 w-4" />
                {deployMutation.isPending ? 'Deploying…' : 'Deploy'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

