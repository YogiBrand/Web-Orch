```typescript
import React, { useState, useEffect, useRef } from 'react';
import { Observable } from 'rxjs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';

interface MetricsPaneProps {
  agentId: string;
  agentMetrics$: Observable<{ agentId: string; cpu: number; memory: number; rps: number; timestamp: string } | null>;
}

interface MetricData {
  time: string;
  cpu: number;
  memory: number;
  rps: number;
}

export function MetricsPane({ agentId, agentMetrics$ }: MetricsPaneProps) {
  const [metricsData, setMetricsData] = useState<MetricData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsLoading(true);
    const initialLoadTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 1000); // Simulate initial loading

    const subscription = agentMetrics$.subscribe(metric => {
      if (metric && metric.agentId === agentId) {
        setMetricsData(prevData => {
          const newData = [
            ...prevData,
            {
              time: new Date(metric.timestamp).toLocaleTimeString(),
              cpu: metric.cpu,
              memory: metric.memory,
              rps: metric.rps,
            },
          ];
          // Keep only the last 30 data points for performance
          return newData.slice(-30);
        });
        setIsLoading(false);
      }
    });

    return () => {
      clearTimeout(initialLoadTimeout);
      subscription.unsubscribe();
    };
  }, [agentId, agentMetrics$]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-gray-800 rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-400">Loading metrics...</span>
      </div>
    );
  }

  if (metricsData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-gray-800 rounded-lg text-gray-400">
        No metrics data available yet.
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 space-y-8">
      <h3 className="text-lg font-medium text-white mb-4">Real-time Metrics</h3>

      <div ref={chartContainerRef} className="w-full h-[250px]">
        <h4 className="text-md font-medium text-gray-300 mb-2">CPU Usage (%)</h4>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={metricsData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" />
            <XAxis dataKey="time" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
            <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} domain={[0, 100]} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '4px' }}
              labelStyle={{ color: '#E5E7EB' }}
              itemStyle={{ color: '#9CA3AF' }}
            />
            <Line type="monotone" dataKey="cpu" stroke="#3B82F6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="w-full h-[250px]">
        <h4 className="text-md font-medium text-gray-300 mb-2">Memory Usage (MB)</h4>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={metricsData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" />
            <XAxis dataKey="time" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
            <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} domain={[0, 1024]} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '4px' }}
              labelStyle={{ color: '#E5E7EB' }}
              itemStyle={{ color: '#9CA3AF' }}
            />
            <Line type="monotone" dataKey="memory" stroke="#10B981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="w-full h-[250px]">
        <h4 className="text-md font-medium text-gray-300 mb-2">Requests Per Second (RPS)</h4>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={metricsData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" />
            <XAxis dataKey="time" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
            <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} domain={[0, 50]} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '4px' }}
              labelStyle={{ color: '#E5E7EB' }}
              itemStyle={{ color: '#9CA3AF' }}
            />
            <Line type="monotone" dataKey="rps" stroke="#F59E0B" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```