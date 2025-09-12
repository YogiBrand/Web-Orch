```typescript
import React from 'react';
import { Agent } from '../../model/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Play, StopCircle, RefreshCw, Trash2, HeartPulse, Key, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'wouter';
import { agentsApi } from '../../api/agents.api';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { SocketStatusBadge } from '../Shared/SocketStatusBadge';
import { useAgentsWs } from '../../hooks/useAgentsWs';
import { Observable } from 'rxjs';

interface AgentsTableProps {
  agents: Agent[];
}

export function AgentsTable({ agents }: AgentsTableProps) {
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
          // This would typically open a modal for new credentials
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

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Name
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Type
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Runtime
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Version
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Latency
            </th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {agents.map((agent) => {
            const { status, latency } = getAgentStatus(agent);
            return (
              <tr key={agent.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link href={`/agents/${agent.id}`}>
                    <a className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                      {agent.name}
                    </a>
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">{agent.type}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white capitalize">{agent.runtime}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={cn("px-2 inline-flex text-xs leading-5 font-semibold rounded-full", getStatusColor(status))}>
                    {status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {agent.version}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {latency ? `${latency}ms` : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
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
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```