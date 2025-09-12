import React, { useState, useEffect } from 'react';
import { Activity, Cpu, HardDrive, Zap, TrendingUp, TrendingDown } from 'lucide-react';
import { Agent } from '../../model/types';
import { agentsApi } from '../../api/agents.api';

interface Metrics {
  requests_per_minute: number;
  average_response_time: number;
  error_rate: number;
  uptime_percentage: number;
  memory_usage: number;
  cpu_usage: number;
  network_in: number;
  network_out: number;
}

interface MetricsPaneProps {
  agent: Agent;
}

export function MetricsPane({ agent }: MetricsPaneProps) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const fetchedMetrics = await agentsApi.getMetrics(agent.id);
      setMetrics({
        ...fetchedMetrics,
        memory_usage: Math.random() * 100,
        cpu_usage: Math.random() * 100,
        network_in: Math.random() * 1000,
        network_out: Math.random() * 1000
      });
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    // Set up real-time updates if agent is running
    if (agent.status === 'running') {
      const interval = setInterval(fetchMetrics, 5000);
      return () => clearInterval(interval);
    }
  }, [agent.id, agent.status]);

  const getHealthColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'text-green-600';
    if (value <= thresholds.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthBgColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'bg-green-100 dark:bg-green-900/20';
    if (value <= thresholds.warning) return 'bg-yellow-100 dark:bg-yellow-900/20';
    return 'bg-red-100 dark:bg-red-900/20';
  };

  if (loading || !metrics) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const performanceMetrics = [
    {
      title: 'Requests/min',
      value: metrics.requests_per_minute,
      icon: Activity,
      color: getHealthColor(metrics.requests_per_minute, { good: 30, warning: 70 }),
      bgColor: getHealthBgColor(metrics.requests_per_minute, { good: 30, warning: 70 }),
      format: (val: number) => val.toFixed(0)
    },
    {
      title: 'Avg Response Time',
      value: metrics.average_response_time,
      icon: Zap,
      color: getHealthColor(metrics.average_response_time, { good: 200, warning: 500 }),
      bgColor: getHealthBgColor(metrics.average_response_time, { good: 200, warning: 500 }),
      format: (val: number) => `${val.toFixed(0)}ms`
    },
    {
      title: 'Error Rate',
      value: metrics.error_rate * 100,
      icon: TrendingUp,
      color: getHealthColor(metrics.error_rate * 100, { good: 1, warning: 5 }),
      bgColor: getHealthBgColor(metrics.error_rate * 100, { good: 1, warning: 5 }),
      format: (val: number) => `${val.toFixed(2)}%`
    },
    {
      title: 'Uptime',
      value: metrics.uptime_percentage,
      icon: TrendingUp,
      color: getHealthColor(100 - metrics.uptime_percentage, { good: 1, warning: 5 }),
      bgColor: getHealthBgColor(100 - metrics.uptime_percentage, { good: 1, warning: 5 }),
      format: (val: number) => `${val.toFixed(1)}%`
    }
  ];

  const resourceMetrics = [
    {
      title: 'CPU Usage',
      value: metrics.cpu_usage,
      icon: Cpu,
      color: getHealthColor(metrics.cpu_usage, { good: 60, warning: 80 }),
      bgColor: getHealthBgColor(metrics.cpu_usage, { good: 60, warning: 80 }),
      format: (val: number) => `${val.toFixed(1)}%`
    },
    {
      title: 'Memory Usage',
      value: metrics.memory_usage,
      icon: HardDrive,
      color: getHealthColor(metrics.memory_usage, { good: 70, warning: 85 }),
      bgColor: getHealthBgColor(metrics.memory_usage, { good: 70, warning: 85 }),
      format: (val: number) => `${val.toFixed(1)}%`
    },
    {
      title: 'Network In',
      value: metrics.network_in,
      icon: TrendingDown,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
      format: (val: number) => `${val.toFixed(1)} KB/s`
    },
    {
      title: 'Network Out',
      value: metrics.network_out,
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
      format: (val: number) => `${val.toFixed(1)} KB/s`
    }
  ];

  return (
    <div className="space-y-6">
      {/* Performance Metrics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Performance Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {performanceMetrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.title}
                className={`p-6 rounded-lg border bg-white dark:bg-gray-800 ${metric.bgColor}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {metric.title}
                    </p>
                    <p className={`text-2xl font-bold mt-1 ${metric.color}`}>
                      {metric.format(metric.value)}
                    </p>
                  </div>
                  <Icon className={`h-8 w-8 ${metric.color}`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resource Metrics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Resource Usage
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {resourceMetrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.title}
                className={`p-6 rounded-lg border bg-white dark:bg-gray-800 ${metric.bgColor}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {metric.title}
                    </p>
                    <p className={`text-2xl font-bold mt-1 ${metric.color}`}>
                      {metric.format(metric.value)}
                    </p>
                  </div>
                  <Icon className={`h-8 w-8 ${metric.color}`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Performance Chart Placeholder */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Performance Trends
        </h3>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <Activity className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Performance Chart
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                Real-time performance metrics visualization would be displayed here
              </p>
              <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                Status: {agent.status === 'running' ? 'Live' : 'Static'} data
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Health Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Health Status
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Overall Health</span>
              <span className={`text-sm font-medium ${
                metrics.uptime_percentage > 99 ? 'text-green-600' :
                metrics.uptime_percentage > 95 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {metrics.uptime_percentage > 99 ? 'Excellent' :
                 metrics.uptime_percentage > 95 ? 'Good' : 'Needs Attention'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Response Time</span>
              <span className={`text-sm font-medium ${
                metrics.average_response_time < 200 ? 'text-green-600' :
                metrics.average_response_time < 500 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {metrics.average_response_time < 200 ? 'Fast' :
                 metrics.average_response_time < 500 ? 'Moderate' : 'Slow'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Error Rate</span>
              <span className={`text-sm font-medium ${
                metrics.error_rate < 0.01 ? 'text-green-600' :
                metrics.error_rate < 0.05 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {metrics.error_rate < 0.01 ? 'Low' :
                 metrics.error_rate < 0.05 ? 'Moderate' : 'High'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h4>
          <div className="space-y-3">
            <button
              onClick={fetchMetrics}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Refresh Metrics
            </button>
            <button
              className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              View Detailed Report
            </button>
            <button
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              Export Metrics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

