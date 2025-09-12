import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, Search } from 'lucide-react';
import { Agent } from '../../model/types';
import { agentsApi } from '../../api/agents.api';
import toast from 'react-hot-toast';

interface LogsPaneProps {
  agent: Agent;
}

export function LogsPane({ agent }: LogsPaneProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [logLevel, setLogLevel] = useState<'all' | 'error' | 'warn' | 'info'>('all');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const fetchedLogs = await agentsApi.getLogs(agent.id);
      setLogs(fetchedLogs);
    } catch (error) {
      toast.error('Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [agent.id]);

  const getLogLevelColor = (log: string) => {
    if (log.toLowerCase().includes('error')) return 'text-red-600 dark:text-red-400';
    if (log.toLowerCase().includes('warn')) return 'text-yellow-600 dark:text-yellow-400';
    if (log.toLowerCase().includes('info')) return 'text-blue-600 dark:text-blue-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getLogLevel = (log: string) => {
    if (log.toLowerCase().includes('error')) return 'error';
    if (log.toLowerCase().includes('warn')) return 'warn';
    if (log.toLowerCase().includes('info')) return 'info';
    return 'info';
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchQuery === '' ||
      log.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLevel = logLevel === 'all' || getLogLevel(log) === logLevel;

    return matchesSearch && matchesLevel;
  });

  const downloadLogs = () => {
    const logText = logs.join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${agent.name}-logs.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Logs downloaded successfully');
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={logLevel}
            onChange={(e) => setLogLevel(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Levels</option>
            <option value="error">Errors</option>
            <option value="warn">Warnings</option>
            <option value="info">Info</option>
          </select>

          <button
            onClick={fetchLogs}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={downloadLogs}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
        </div>
      </div>

      {/* Log Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {logs.length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Logs</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {logs.filter(log => getLogLevel(log) === 'error').length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Errors</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {logs.filter(log => getLogLevel(log) === 'warn').length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Warnings</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {logs.filter(log => getLogLevel(log) === 'info').length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Info</div>
        </div>
      </div>

      {/* Logs Display */}
      <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Agent Logs</h3>
          <p className="text-sm text-gray-400">
            {filteredLogs.length} of {logs.length} logs shown
          </p>
        </div>

        <div className="h-96 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <div className="text-4xl mb-4">📄</div>
                <p>No logs found</p>
                {searchQuery && <p className="text-sm mt-1">Try adjusting your search or filter</p>}
              </div>
            </div>
          ) : (
            filteredLogs.map((log, index) => (
              <div
                key={index}
                className="font-mono text-sm leading-relaxed"
              >
                <span className={getLogLevelColor(log)}>
                  {log}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Auto-refresh toggle */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Logs are updated in real-time when the agent is running
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${agent.status === 'running' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {agent.status === 'running' ? 'Live' : 'Static'}
          </span>
        </div>
      </div>
    </div>
  );
}

