import React from 'react';
import { Link } from 'wouter';
import { Play, Square, RotateCcw, Eye, Trash2 } from 'lucide-react';
import type { Agent } from '@/features/agents/model/types';
import { cn } from '@/lib/utils';
import { agentsApi } from '@/features/agents/api/agents.api';
import { toast } from '@/hooks/use-toast';

export function AgentsTable({ agents }: { agents: Agent[] }) {
  const color = (status: Agent['status']) =>
    status === 'running'
      ? 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400'
      : status === 'error'
      ? 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400'
      : status === 'deploying'
      ? 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400'
      : 'text-gray-600 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-400';

  const act = async (action: 'start' | 'stop' | 'restart', id: string, name: string) => {
    const map = { start: agentsApi.start, stop: agentsApi.stop, restart: agentsApi.restart } as const;
    const fn = map[action];
    const res = await fn(id);
    if (res.success) toast({ title: `${action[0].toUpperCase()}${action.slice(1)} ${name}`, description: 'Operation successful' });
    else toast({ title: `Failed to ${action} ${name}`, description: 'See logs for details' });
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}?`)) return;
    const res = await agentsApi.delete(id);
    if (res.success) toast({ title: `Deleted ${name}` });
    else toast({ title: `Failed to delete ${name}` });
  };

  if (!agents.length) {
    return (
      <div className="p-8 text-center text-muted-foreground">No agents connected yet. Add one from Marketplace.</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Agent</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Runtime</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Latency</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Version</th>
            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          {agents.map((a) => (
            <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">{a.name.charAt(0)}</div>
                  <div className="ml-4">
                    <div className="text-sm font-medium">{a.name}</div>
                    <div className="text-sm text-muted-foreground">{a.provider}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', color(a.status))}>{a.status}</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', a.runtime === 'hosted' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300')}>{a.runtime}</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">{a.latency ? `${a.latency}ms` : 'N/A'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">{a.version}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end gap-2">
                  {a.status === 'stopped' && (<button onClick={() => act('start', a.id, a.name)} className="p-1 text-green-600 dark:text-green-400" title="Start"><Play className="h-4 w-4" /></button>)}
                  {a.status === 'running' && (
                    <>
                      <button onClick={() => act('restart', a.id, a.name)} className="p-1 text-blue-600 dark:text-blue-400" title="Restart"><RotateCcw className="h-4 w-4" /></button>
                      <button onClick={() => act('stop', a.id, a.name)} className="p-1 text-gray-600 dark:text-gray-400" title="Stop"><Square className="h-4 w-4" /></button>
                    </>
                  )}
                  <Link href={`/agents/${a.id}`}><a className="p-1 text-gray-600 dark:text-gray-400" title="View"><Eye className="h-4 w-4" /></a></Link>
                  <button onClick={() => remove(a.id, a.name)} className="p-1 text-red-600 dark:text-red-400" title="Delete"><Trash2 className="h-4 w-4" /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

