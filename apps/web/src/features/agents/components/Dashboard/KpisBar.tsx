```typescript
import React from 'react';
import { Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpisBarProps {
  kpis: {
    connected: number;
    degraded: number;
    offline: number;
    total: number;
  };
}

export function KpisBar({ kpis }: KpisBarProps) {
  const kpiItems = [
    {
      name: 'Connected',
      value: kpis.connected,
      icon: CheckCircle2,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      name: 'Degraded',
      value: kpis.degraded,
      icon: AlertTriangle,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    },
    {
      name: 'Offline',
      value: kpis.offline,
      icon: Activity,
      color: 'text-red-500',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
    },
    {
      name: 'Total Agents',
      value: kpis.total,
      icon: Activity,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpiItems.map((item) => (
        <div
          key={item.name}
          className={cn(
            "p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700",
            item.bgColor
          )}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {item.name}
            </h3>
            <item.icon className={cn("h-5 w-5", item.color)} />
          </div>
          <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
```