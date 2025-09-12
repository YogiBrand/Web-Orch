```typescript
import React from 'react';
import { Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAgentsWs } from '../../hooks/useAgentsWs';

export function SocketStatusBadge() {
  const { isConnected } = useAgentsWs();

  return (
    <div className="flex items-center gap-1 text-xs font-medium">
      <Circle
        className={cn(
          "h-2 w-2 fill-current",
          isConnected ? "text-green-500" : "text-red-500"
        )}
      />
      <span className={cn(
        isConnected ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
      )}>
        {isConnected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  );
}
```