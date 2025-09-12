```typescript
import React from 'react';
import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HealthCheckListProps {
  results: Array<{
    name: string;
    status: 'pending' | 'success' | 'error';
    message?: string;
    latency?: number;
  }>;
  isLoading?: boolean;
}

export function HealthCheckList({ results, isLoading }: HealthCheckListProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return isLoading ? <Loader2 className="h-4 w-4 text-blue-500 animate-spin" /> : <div className="h-4 w-4 border-2 border-gray-300 rounded-full" />;
      default:
        return <div className="h-4 w-4 border-2 border-gray-300 rounded-full" />;
    }
  };

  if (!results || results.length === 0) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center text-gray-500 dark:text-gray-400">
        No health check results available.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {results.map((check, index) => (
        <div
          key={index}
          className={cn(
            "flex items-center gap-3 p-3 rounded-lg border",
            check.status === 'success' && "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800",
            check.status === 'error' && "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800",
            check.status === 'pending' && "bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700"
          )}
        >
          {getStatusIcon(check.status)}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900 dark:text-white">{check.name}</span>
              {check.latency && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {check.latency}ms
                </span>
              )}
            </div>
            
            {check.message && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {check.message}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```