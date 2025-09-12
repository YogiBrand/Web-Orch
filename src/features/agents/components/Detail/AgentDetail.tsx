import React, { useState } from 'react';
import { Link } from 'wouter';
import { Play, Square, RotateCcw, ArrowLeft, Server, Activity, Zap, Trash2 } from 'lucide-react';
import type { Agent } from '@/features/agents/model/types';
import { cn } from '@/lib/utils';
import { agentsApi } from '@/features/agents/api/agents.api';
import { toast } from '@/hooks/use-toast';

export function AgentDetail({ agent }: { agent: Agent }) {
  const [status, setStatus] = useState(agent.status);
  const statusColor = (s: Agent['status']) =>
    s === 'running' ? 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400' :
    s === 'error' ? 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400' :
    s === 'deploying' ? 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400' :
    'text-gray-600 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-400';

  const doAction = async (action: 'start' | 'stop' | 'restart') => {
    const fn = { start: agentsApi.start, stop: agentsApi.stop, restart: agentsApi.restart }[action];
    const res = await fn(agent.id);
    if (res.success) {
      toast({ title: `${action[0].toUpperCase()}${action.slice(1)} ${agent.name}` });
      setStatus(action === 'start' ? 'running' : action === 'stop' ? 'stopped' : status);
    } else {
      toast({ title: `Failed to ${action} ${agent.name}` });
    }
  };

  const remove = async () => {
    if (!confirm(`Delete ${agent.name}?`)) return;
    const res = await agentsApi.delete(agent.id);
    if (res.success) {
      toast({ title: `Deleted ${agent.name}` });
      window.location.href = '/agents';
    } else {
      toast({ title: `Failed to delete ${agent.name}` });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/agents"><a className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" title="Back"><ArrowLeft className="h-5 w-5" /></a></Link>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">{agent.name.charAt(0)}</div>
            <div>
              <h1 className="text-3xl font-bold">{agent.name}</h1>
              <div className="flex items-center gap-4 mt-2">
                <p className="text-muted-foreground">by {agent.provider}</p>
                <span className={cn('inline-flex items-center px-3 py-1 rounded-full text-sm font-medium', statusColor(status))}>{status}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {status === 'stopped' && (
            <button onClick={() => doAction('start')} className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"><Play className="h-4 w-4" />Start</button>
          )}
          {status === 'running' && (
            <>
              <button onClick={() => doAction('restart')} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"><RotateCcw className="h-4 w-4" />Restart</button>
              <button onClick={() => doAction('stop')} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"><Square className="h-4 w-4" />Stop</button>
            </>
          )}
          <button onClick={remove} className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"><Trash2 className="h-4 w-4" />Delete</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Runtime</p><p className="text-lg font-semibold">{agent.runtime}</p></div><Server className="h-8 w-8 text-blue-500" /></div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Latency</p><p className="text-lg font-semibold">{agent.latency ? `${agent.latency}ms` : 'N/A'}</p></div><Activity className="h-8 w-8 text-green-500" /></div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Version</p><p className="text-lg font-semibold">{agent.version}</p></div><Zap className="h-8 w-8 text-purple-500" /></div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Provider</p><p className="text-lg font-semibold">{agent.provider}</p></div><Server className="h-8 w-8 text-orange-500" /></div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-3">Capabilities</h2>
        <div className="flex flex-wrap gap-2">
          {(agent.capabilities || []).map((c) => (
            <span key={c} className="px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">{c}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

