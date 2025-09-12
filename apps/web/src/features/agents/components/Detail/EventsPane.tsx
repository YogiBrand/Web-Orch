```typescript
import React from 'react';
import { Clock, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventsPaneProps {
  agentId: string;
}

interface AgentEvent {
  id: string;
  timestamp: string;
  type: 'status_change' | 'config_update' | 'deployment' | 'error' | 'health_check';
  description: string;
  details?: Record<string, any>;
  status?: 'success' | 'failed';
}

// Mock data for events
const mockEvents: AgentEvent[] = [
  {
    id: 'e1',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    type: 'deployment',
    description: 'Agent deployment initiated.',
    status: 'success',
  },
  {
    id: 'e2',
    timestamp: new Date(Date.now() - 3500000).toISOString(),
    type: 'status_change',
    description: 'Agent status changed to deploying.',
    status: 'success',
    details: { oldStatus: 'stopped', newStatus: 'deploying' },
  },
  {
    id: 'e3',
    timestamp: new Date(Date.now() - 3000000).toISOString(),
    type: 'deployment',
    description: 'Agent deployment completed successfully.',
    status: 'success',
  },
  {
    id: 'e4',
    timestamp: new Date(Date.now() - 2800000).toISOString(),
    type: 'status_change',
    description: 'Agent status changed to running.',
    status: 'success',
    details: { oldStatus: 'deploying', newStatus: 'running' },
  },
  {
    id: 'e5',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    type: 'health_check',
    description: 'Health check performed. Agent is healthy.',
    status: 'success',
  },
  {
    id: 'e6',
    timestamp: new Date(Date.now() - 1200000).toISOString(),
    type: 'config_update',
    description: 'Agent configuration updated.',
    status: 'success',
    details: { changedFields: ['timeout', 'concurrency'] },
  },
  {
    id: 'e7',
    timestamp: new Date(Date.now() - 600000).toISOString(),
    type: 'error',
    description: 'Connection to external service failed.',
    status: 'failed',
    details: { errorCode: 'CONN-001', service: 'External API' },
  },
  {
    id: 'e8',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    type: 'status_change',
    description: 'Agent status changed to error.',
    status: 'failed',
    details: { oldStatus: 'running', newStatus: 'error' },
  },
  {
    id: 'e9',
    timestamp: new Date(Date.now() - 120000).toISOString(),
    type: 'health_check',
    description: 'Health check performed. Agent is degraded.',
    status: 'failed',
  },
];

export function EventsPane({ agentId }: EventsPaneProps) {
  // In a real application, you would fetch events related to agentId
  // For now, we use mock data and filter by agentId if needed (though mock data is generic)
  const events = React.useMemo(() => {
    // Filter mock events if agentId was used in mock data generation
    // For this example, we'll just return all mock events as they are generic
    return mockEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [agentId]);

  const getEventTypeIcon = (type: AgentEvent['type'], status?: AgentEvent['status']) => {
    switch (type) {
      case 'status_change':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'config_update':
        return <Settings className="h-5 w-5 text-purple-500" />;
      case 'deployment':
        return <Rocket className="h-5 w-5 text-indigo-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'health_check':
        return status === 'success' ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <AlertTriangle className="h-5 w-5 text-orange-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Agent Event History</h3>

      {events.length === 0 ? (
        <div className="text-center py-10 text-gray-500 dark:text-gray-400">
          No events recorded for this agent yet.
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div key={event.id} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex-shrink-0 mt-1">
                {getEventTypeIcon(event.type, event.status)}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(event.timestamp).toLocaleString()}
                </p>
                <p className="font-medium text-gray-900 dark:text-white mt-1">
                  {event.description}
                </p>
                {event.details && (
                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 p-2 rounded-md font-mono">
                    <pre>{JSON.stringify(event.details, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```