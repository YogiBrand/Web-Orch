```typescript
import React, { useState, useEffect } from 'react';
import { Agent } from '../../model/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Play, StopCircle, RefreshCw, Trash2, HeartPulse, Key, Activity, AlertTriangle, CheckCircle2, Settings, FileText, BarChart2, Clock } from 'lucide-react';
import { agentsApi } from '../../api/agents.api';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useAgentsWs } from '../../hooks/useAgentsWs';
import { Observable } from 'rxjs';
import { LogsPane } from './LogsPane';
import { MetricsPane } from './MetricsPane';
import { ConfigPane } from './ConfigPane';
import { EventsPane } from './EventsPane';

interface AgentDetailProps {
  agent: Agent;
}

export function AgentDetail({ agent: initialAgent }: AgentDetailProps) {
  const queryClient = useQueryClient();
  const { agentStatus$, agentLog$, agentMetrics$, subscribeAgent, unsubscribeAgent } = useAgentsWs();
  const [agent, setAgent] = useState<Agent>(initialAgent);
  const [currentStatus, setCurrentStatus] = useState(initialAgent.status);
  const [currentLatency, setCurrentLatency] = useState<number | undefined>(initialAgent.latency);

  useEffect(() => {
    subscribeAgent(agent.id);

    const statusSubscription = (agentStatus$ as Observable<{ agentId: string; status: Agent['status']; latency?: number }>).subscribe(
      (update) => {
        if (update && update.agentId === agent.id) {
          setCurrentStatus(update.status);
          setCurrentLatency(update.latency);
          // Optionally update the agent in cache to reflect latest status
          queryClient.setQueryData(['agent', agent.id], (oldAgent: Agent | undefined) => {
            if (oldAgent) {
              return { ...oldAgent, status: update.status, latency: update.latency };
            }
            return oldAgent;
          });
        }
      }
    );

    return () => {
      unsubscribeAgent(agent.id);
      statusSubscription.unsubscribe();
    };
  }, [agent.id, subscribeAgent, unsubscribeAgent, agentStatus$, queryClient]);

  useEffect(() => {
    setAgent(initialAgent);
    setCurrentStatus(initialAgent.status);
    setCurrentLatency(initialAgent.latency);
  }, [initialAgent]);

  const handleAction = async (action: 'start' | 'stop' | 'redeploy' | 'delete' | 'healthcheck' | 'rotate-credentials') => {
    try {
      let response;
      switch (action) {
        case 'start':
          response = await agentsApi.deploy(agent.id);
          break;
        case 'stop':
          response = await agentsApi.stop(agent.id);
          break;
        case 'redeploy':
          response = await agentsApi.redeploy(agent.id);
          break;
        case 'delete':
          response = await agentsApi.remove(agent.id);
          // Redirect to dashboard after deletion
          if (response.success) {
            toast.success('Agent deleted successfully!');
            queryClient.invalidateQueries({ queryKey: ['agents'] });
            window.location.href = '/agents'; // Simple redirect for now
          }
          break;
        case 'healthcheck':
          response = await agentsApi.healthcheck(agent.id);
          break;
        case 'rotate-credentials':
          toast('Rotate credentials action triggered (UI not implemented)', { icon: '🔑' });
          return;
        default:
          return;
      }

      if (response.success) {
        toast.success(`${action.charAt(0).toUpperCase() + action.slice(1)} successful!`);
        queryClient.invalidateQueries({ queryKey: ['agent', agent.id] });
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
        return <CheckCircle2 className="h-5 w-5" />;
      case 'stopped':
        return <StopCircle className="h-5 w-5" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5" />;
      case 'deploying':
        return <RefreshCw className="h-5 w-5 animate-spin" />;
      default:
        return <Activity className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {agent.name}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={cn("px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1", getStatusColor(currentStatus))}>
              {getStatusIcon(currentStatus)} {currentStatus}
            </span>
            {currentLatency && currentStatus === 'running' && (
              <span className="text-gray-600 dark:text-gray-400 text-sm">
                Latency: {currentLatency}ms
              </span>
            )}
            <span className="text-gray-600 dark:text-gray-400 text-sm capitalize">
              Runtime: {agent.runtime}
            </span>
            <span className="text-gray-600 dark:text-gray-400 text-sm">
              Version: {agent.version}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => handleAction('start')} disabled={currentStatus === 'running' || currentStatus === 'deploying'}>
            <Play className="h-4 w-4 mr-2" /> Start
          </Button>
          <Button variant="outline" onClick={() => handleAction('stop')} disabled={currentStatus === 'stopped' || currentStatus === 'deploying'}>
            <StopCircle className="h-4 w-4 mr-2" /> Stop
          </Button>
          <Button variant="outline" onClick={() => handleAction('redeploy')} disabled={currentStatus === 'deploying'}>
            <RefreshCw className="h-4 w-4 mr-2" /> Redeploy
          </Button>
          <Button variant="outline" onClick={() => handleAction('healthcheck')}>
            <HeartPulse className="h-4 w-4 mr-2" /> Health Check
          </Button>
          <Button variant="outline" onClick={() => handleAction('rotate-credentials')}>
            <Key className="h-4 w-4 mr-2" /> Rotate Secrets
          </Button>
          <Button variant="destructive" onClick={() => handleAction('delete')}>
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-gray-100 dark:bg-gray-800">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Settings className="h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> Configuration
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> Logs
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4" /> Metrics
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-2">
            <Clock className="h-4 w-4" /> Events
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-6 p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Agent Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Capabilities</h4>
              <ul className="space-y-2">
                {agent.capabilities.map((cap, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" /> {cap}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Endpoints</h4>
              <ul className="space-y-2">
                {agent.endpoints && agent.endpoints.length > 0 ? (
                  agent.endpoints.map((endpoint, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <ExternalLink className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <a href={endpoint} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {endpoint}
                      </a>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-gray-500 dark:text-gray-400">No endpoints configured.</li>
                )}
              </ul>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="config" className="mt-6">
          <ConfigPane agent={agent} />
        </TabsContent>
        <TabsContent value="logs" className="mt-6">
          <LogsPane agentId={agent.id} agentLog$={agentLog$} />
        </TabsContent>
        <TabsContent value="metrics" className="mt-6">
          <MetricsPane agentId={agent.id} agentMetrics$={agentMetrics$} />
        </TabsContent>
        <TabsContent value="events" className="mt-6">
          <EventsPane agentId={agent.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```