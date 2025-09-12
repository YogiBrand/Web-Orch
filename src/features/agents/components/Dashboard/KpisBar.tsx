import React from 'react';
import { Activity, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function KpisBar({ kpis }: { kpis: { connected: number; degraded: number; offline: number; total: number } }) {
  const items = [
    { label: 'Connected', value: kpis.connected, icon: CheckCircle2, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800' },
    { label: 'Degraded', value: kpis.degraded, icon: AlertTriangle, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800' },
    { label: 'Offline', value: kpis.offline, icon: XCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800' },
    { label: 'Total', value: kpis.total, icon: Activity, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {items.map((it) => (
        <div key={it.label} className={cn('p-6 rounded-lg border bg-white dark:bg-gray-800', it.border)}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{it.label}</p>
              <p className="text-2xl font-bold">{it.value}</p>
            </div>
            <div className={cn('p-3 rounded-full', it.bg)}>
              <it.icon className={cn('h-6 w-6', it.color)} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

