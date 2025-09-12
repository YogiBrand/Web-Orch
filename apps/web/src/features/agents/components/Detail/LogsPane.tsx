```typescript
import React, { useState, useEffect, useRef } from 'react';
import { Observable } from 'rxjs';
import { Button } from '@/components/ui/button';
import { Play, Pause, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogsPaneProps {
  agentId: string;
  agentLog$: Observable<{ agentId: string; timestamp: string; level: string; message: string } | null>;
}

export function LogsPane({ agentId, agentLog$ }: LogsPaneProps) {
  const [logs, setLogs] = useState<Array<{ timestamp: string; level: string; message: string }>>([]);
  const [isPaused, setIsPaused] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const subscription = agentLog$.subscribe(log => {
      if (log && log.agentId === agentId && !isPaused) {
        setLogs(prevLogs => [...prevLogs, log]);
      }
    });

    return () => subscription.unsubscribe();
  }, [agentId, agentLog$, isPaused]);

  useEffect(() => {
    if (logsEndRef.current && !isPaused) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isPaused]);

  const handleClearLogs = () => {
    setLogs([]);
  };

  const getLogLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'info':
        return 'text-blue-400';
      case 'warn':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-300';
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 p-4 flex flex-col h-[600px]">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-white">Agent Logs</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsPaused(!isPaused)} className="text-white border-gray-600 hover:bg-gray-700">
            {isPaused ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleClearLogs} className="text-white border-gray-600 hover:bg-gray-700">
            <Trash2 className="h-4 w-4 mr-2" /> Clear
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto font-mono text-sm bg-black p-3 rounded-md">
        {logs.length === 0 ? (
          <div className="text-gray-500 text-center py-10">
            {isPaused ? "Logs are paused." : "Waiting for logs..."}
          </div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="flex space-x-2 text-gray-300">
              <span className="flex-shrink-0 text-gray-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
              <span className={cn("flex-shrink-0 font-bold", getLogLevelColor(log.level))}>
                {log.level.toUpperCase()}
              </span>
              <span className="flex-1 whitespace-pre-wrap">{log.message}</span>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}
```