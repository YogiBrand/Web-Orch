```typescript
import React from 'react';
import { Agent } from '../../model/types';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';
import { Activity, AlertTriangle, CheckCircle2, MoreHorizontal, Play, StopCircle, RefreshCw, Trash2, HeartPulse, Key, ExternalLink } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { agentsApi } from '../../api/agents.api';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAgentsWs } from '../../hooks/useAgentsWs';
import { Observable } from 'rxjs';

interface AgentCardListProps {
  agents: Agent[];
}

export function AgentCardList({ agents }: AgentCardListProps) {
  const queryClient = useQueryClient();
  const { agentStatus$ } = useAgentsWs();
  const [liveStatuses, setLiveStatuses] = React.useState<Record<string, { status: Agent['status']; latency?: number }>>({});

  React.useEffect(() => {
    const subscription = (agentStatus$ as Observable<{ agentId: string; status: Agent['status']; latency?: number }>).subscribe(
      (update) => {
        if (update) {
          setLiveStatuses(prev => ({
            ...prev,
            [update.agentId]: { status: update.status, latency: update.latency }
          }));
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [agentStatus$]);

  const getAgentStatus = (agent: Agent) => {
    return liveStatuses[agent.id] || { status: agent.status, latency: agent.latency };
  };

  const handleAction = async (agentId: string, action: 'start' | 'stop' | 'redeploy' | 'delete' | 'healthcheck' | 'rotate-credentials') => {
    try {
      let response;
      switch (action) {
        case 'start':
          response = await agentsApi.deploy(agentId);
          break;
        case 'stop':
          response = await agentsApi.stop(agentId);
          break;
        case 'redeploy':
          response = await agentsApi.redeploy(agentId);
          break;
        case 'delete':
          response = await agentsApi.remove(agentId);
          break;
        case 'healthcheck':
          response = await agentsApi.healthcheck(agentId);
          break;
        case 'rotate-credentials':
          toast('Rotate credentials action triggered (UI not implemented)', { icon: '🔑' });
          return;
        default:
          return;
      }

      if (response.success) {
        toast.success(`${action.charAt(0).toUpperCase() + action.slice(1)} successful!`);
        queryClient.invalidateQueries({ queryKey: ['agents'] });
      } else {
        toast.error(response.message || `${action.charAt(0).toUpperCase() + action.slice(1)} failed.`);
      }
    } catch (error: any) {
      toast.error(error.message || `An unexpected error occurred during ${action}.`);
    }
  };

  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'running':
        return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300';
      case 'stopped':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      case 'error':
        return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300';
      case 'deploying':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: Agent['status']) => {
    switch (status) {
      case 'running':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'stopped':
        return <StopCircle className="h-4 w-4" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4" />;
      case 'deploying':
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  if (agents.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 6c-3.037 0-5.789 1.096-7.965 2.909-.087.075-.16.159-.228.248l-.004.004A7.995 7.995 0 004 12.25c0 1.093.218 2.136.614 3.086l.004.014A7.995 7.995 0 0012.25 20c1.093 0 2.136-.218 3.086-.614l.014-.004A7.995 7.995 0 0020 12.25c0-1.093-.218-2.136-.614-3.086l-.004-.014A7.995 7.995 0 0012.25 4c-1.093 0-2.136.218-3.086.614l-.014.004A7.995 7.995 0 004 12.25z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">No agents found</h3>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          You haven't created any agents yet.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {agents.map((agent) => {
        const { status, latency } = getAgentStatus(agent);
        return (
          <div key={agent.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <Link href={`/agents/${agent.id}`}>
                  <a className="text-lg font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                    {agent.name}
                  </a>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg">
                    <DropdownMenuItem className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" onClick={() => handleAction(agent.id, 'start')} disabled={status === 'running' || status === 'deploying'}>
                      <Play className="h-4 w-4" /> Start
                    </DropdownMenuItem>
                    <DropdownMenuItem className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" onClick={() => handleAction(agent.id, 'stop')} disabled={status === 'stopped' || status === 'deploying'}>
                      <StopCircle className="h-4 w-4" /> Stop
                    </DropdownMenuItem>
                    <DropdownMenuItem className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" onClick={() => handleAction(agent.id, 'redeploy')} disabled={status === 'deploying'}>
                      <RefreshCw className="h-4 w-4" /> Redeploy
                    </DropdownMenuItem>
                    <DropdownMenuItem className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" onClick={() => handleAction(agent.id, 'healthcheck')}>
                      <HeartPulse className="h-4 w-4" /> Health Check
                    </DropdownMenuItem>
                    <DropdownMenuItem className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" onClick={() => handleAction(agent.id, 'rotate-credentials')}>
                      <Key className="h-4 w-4" /> Rotate Secrets
                    </DropdownMenuItem>
                    <DropdownMenuItem className="flex items-center gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer" onClick={() => handleAction(agent.id, 'delete')}>
                      <Trash2 className="h-4 w-4" /> Delete
                    </DropdownMenuItem>
                    <DropdownMenuItem className="flex items-center gap-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer">
                      <Link href={`/agents/${agent.id}`} className="flex items-center gap-2 w-full">
                        <ExternalLink className="h-4 w-4" /> View Details
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                {getStatusIcon(status)}
                <span className={cn("font-medium capitalize", getStatusColor(status))}>
                  {status}
                </span>
                {latency && status === 'running' && (
                  <span className="ml-auto text-gray-500 dark:text-gray-400">
                    {latency}ms
                  </span>
                )}
              </div>

              <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                <p>Type: {agent.type}</p>
                <p>Runtime: <span className="capitalize">{agent.runtime}</span></p>
                <p>Version: {agent.version}</p>
              </div>

              <div className="flex flex-wrap gap-1">
                {agent.capabilities.slice(0, 3).map((cap) => (
                  <span key={cap} className="px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                    {cap}
                  </span>
                ))}
                {agent.capabilities.length > 3 && (
                  <span className="px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                    +{agent.capabilities.length - 3}
                  </span>
                )}
              </div>
            </div>
            <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Last updated: {new Date(agent.updated_at).toLocaleString()}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```