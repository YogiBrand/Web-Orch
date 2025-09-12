import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle2, XCircle, Info } from 'lucide-react';
import { Agent } from '../../model/types';

interface Event {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  description: string;
  timestamp: string;
  source: string;
}

interface EventsPaneProps {
  agent: Agent;
}

export function EventsPane({ agent }: EventsPaneProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [filter, setFilter] = useState<'all' | 'info' | 'success' | 'warning' | 'error'>('all');

  // Mock events data - in real app this would come from API
  useEffect(() => {
    const mockEvents: Event[] = [
      {
        id: '1',
        type: 'success',
        title: 'Agent Started',
        description: 'Agent successfully initialized and connected to provider API',
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        source: 'system'
      },
      {
        id: '2',
        type: 'info',
        title: 'Health Check Passed',
        description: 'All system components are operating normally',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        source: 'health-monitor'
      },
      {
        id: '3',
        type: 'warning',
        title: 'High Memory Usage',
        description: 'Memory usage exceeded 80% threshold',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        source: 'resource-monitor'
      },
      {
        id: '4',
        type: 'error',
        title: 'Connection Timeout',
        description: 'Failed to connect to external API endpoint',
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        source: 'api-client'
      },
      {
        id: '5',
        type: 'success',
        title: 'Configuration Updated',
        description: 'Agent configuration successfully applied',
        timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        source: 'config-manager'
      }
    ];
    setEvents(mockEvents);
  }, [agent.id]);

  const getEventIcon = (type: Event['type']) => {
    switch (type) {
      case 'success':
        return CheckCircle2;
      case 'warning':
        return AlertTriangle;
      case 'error':
        return XCircle;
      case 'info':
      default:
        return Info;
    }
  };

  const getEventColor = (type: Event['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-600 bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'error':
        return 'text-red-600 bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'info':
      default:
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
  };

  const filteredEvents = events.filter(event =>
    filter === 'all' || event.type === filter
  );

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const eventStats = {
    total: events.length,
    success: events.filter(e => e.type === 'success').length,
    warning: events.filter(e => e.type === 'warning').length,
    error: events.filter(e => e.type === 'error').length,
    info: events.filter(e => e.type === 'info').length
  };

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
          }`}
        >
          All ({eventStats.total})
        </button>
        <button
          onClick={() => setFilter('success')}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            filter === 'success'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
          }`}
        >
          Success ({eventStats.success})
        </button>
        <button
          onClick={() => setFilter('warning')}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            filter === 'warning'
              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
          }`}
        >
          Warnings ({eventStats.warning})
        </button>
        <button
          onClick={() => setFilter('error')}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            filter === 'error'
              ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
          }`}
        >
          Errors ({eventStats.error})
        </button>
      </div>

      {/* Event Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {eventStats.success}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Success</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            <div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {eventStats.info}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Info</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {eventStats.warning}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Warnings</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            <div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {eventStats.error}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Errors</div>
            </div>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-4">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Clock className="mx-auto h-12 w-12" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No events found</h3>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {filter === 'all' ? 'No events recorded yet' : `No ${filter} events found`}
            </p>
          </div>
        ) : (
          filteredEvents.map((event) => {
            const Icon = getEventIcon(event.type);
            return (
              <div
                key={event.id}
                className={`p-4 rounded-lg border bg-white dark:bg-gray-800 ${getEventColor(event.type)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {event.title}
                      </h4>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTimestamp(event.timestamp)}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {event.description}
                    </p>

                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Source: {event.source}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

