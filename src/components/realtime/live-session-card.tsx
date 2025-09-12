/**
 * Live Session Card Component
 * Real-time session monitoring with WebSocket integration
 */

import React, { memo, useMemo, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { cn } from '../../lib/utils';
import { useSessionRealtime, type RealtimeMessage } from '../../hooks/use-realtime-websocket';
import { 
  Play, 
  Pause, 
  Square, 
  Monitor, 
  Activity, 
  Clock, 
  Cpu, 
  MemoryStick,
  Network,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface SessionData {
  id: string;
  name?: string;
  status: 'created' | 'running' | 'paused' | 'completed' | 'error' | 'terminated';
  progress?: number;
  startTime?: string;
  endTime?: string;
  browserType?: string;
  url?: string;
  taskCount?: number;
  completedTasks?: number;
  successRate?: number;
  metrics?: {
    cpu: number;
    memory: number;
    networkIn: number;
    networkOut: number;
    responseTime: number;
  };
  logs?: Array<{
    timestamp: string;
    level: 'info' | 'warn' | 'error';
    message: string;
  }>;
}

interface LiveSessionCardProps {
  sessionId: string;
  initialData?: Partial<SessionData>;
  onSessionAction?: (sessionId: string, action: 'start' | 'pause' | 'stop') => void;
  className?: string;
  compact?: boolean;
}

export const LiveSessionCard = memo<LiveSessionCardProps>(({ 
  sessionId, 
  initialData = {},
  onSessionAction,
  className,
  compact = false
}) => {
  const [sessionData, setSessionData] = useState<SessionData>({
    id: sessionId,
    name: `Session ${sessionId.slice(0, 8)}`,
    status: 'created',
    progress: 0,
    taskCount: 0,
    completedTasks: 0,
    successRate: 100,
    ...initialData
  });

  const [lastActivity, setLastActivity] = useState<Date | null>(null);
  const [activityCount, setActivityCount] = useState(0);

  const { 
    isConnected, 
    connectionStatus, 
    lastMessage,
    sendMessage
  } = useSessionRealtime(sessionId);

  // Handle real-time updates
  useEffect(() => {
    if (lastMessage && lastMessage.sessionId === sessionId) {
      setLastActivity(new Date());
      setActivityCount(prev => prev + 1);

      switch (lastMessage.type) {
        case 'session:update':
        case 'session-status-changed':
          setSessionData(prev => ({
            ...prev,
            ...lastMessage.data,
            status: lastMessage.data.status || prev.status
          }));
          break;

        case 'session-metrics-updated':
          setSessionData(prev => ({
            ...prev,
            metrics: lastMessage.data
          }));
          break;

        case 'session-action-logged':
          const newLog = {
            timestamp: lastMessage.timestamp,
            level: lastMessage.data.success ? 'info' as const : 'error' as const,
            message: lastMessage.data.action
          };
          
          setSessionData(prev => ({
            ...prev,
            logs: [newLog, ...(prev.logs || [])].slice(0, 10) // Keep last 10 logs
          }));
          break;

        case 'session-progress-updated':
          setSessionData(prev => ({
            ...prev,
            progress: lastMessage.data.progress,
            completedTasks: lastMessage.data.completedTasks,
            taskCount: lastMessage.data.totalTasks
          }));
          break;
      }
    }
  }, [lastMessage, sessionId]);

  // Status styling
  const statusConfig = useMemo(() => {
    switch (sessionData.status) {
      case 'running':
        return {
          color: 'text-green-600',
          bg: 'bg-green-100',
          icon: Play,
          pulse: true
        };
      case 'paused':
        return {
          color: 'text-yellow-600',
          bg: 'bg-yellow-100',
          icon: Pause,
          pulse: false
        };
      case 'completed':
        return {
          color: 'text-blue-600',
          bg: 'bg-blue-100',
          icon: CheckCircle,
          pulse: false
        };
      case 'error':
        return {
          color: 'text-red-600',
          bg: 'bg-red-100',
          icon: XCircle,
          pulse: false
        };
      case 'terminated':
        return {
          color: 'text-gray-600',
          bg: 'bg-gray-100',
          icon: Square,
          pulse: false
        };
      default:
        return {
          color: 'text-gray-600',
          bg: 'bg-gray-100',
          icon: AlertCircle,
          pulse: false
        };
    }
  }, [sessionData.status]);

  // Session actions
  const handleSessionAction = (action: 'start' | 'pause' | 'stop') => {
    // Send WebSocket message
    sendMessage({
      type: 'session_action',
      sessionId,
      action,
      timestamp: new Date().toISOString()
    });

    // Call parent handler
    onSessionAction?.(sessionId, action);
  };

  // Calculate uptime
  const uptime = useMemo(() => {
    if (!sessionData.startTime) return null;
    const start = new Date(sessionData.startTime);
    const end = sessionData.endTime ? new Date(sessionData.endTime) : new Date();
    return Math.floor((end.getTime() - start.getTime()) / 1000);
  }, [sessionData.startTime, sessionData.endTime]);

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  if (compact) {
    return (
      <div className={cn("flex items-center justify-between p-3 border rounded-lg bg-white", className)}>
        <div className="flex items-center space-x-3">
          <div className={cn(
            "flex items-center justify-center w-8 h-8 rounded-full",
            statusConfig.bg,
            statusConfig.pulse && "animate-pulse"
          )}>
            <statusConfig.icon className={cn("w-4 h-4", statusConfig.color)} />
          </div>
          
          <div>
            <div className="font-medium text-sm">{sessionData.name}</div>
            <div className="text-xs text-gray-500">
              {sessionData.status} • {isConnected ? '🟢' : '🔴'} WebSocket
            </div>
          </div>
        </div>
        
        {sessionData.progress !== undefined && (
          <div className="flex items-center space-x-2">
            <Progress value={sessionData.progress} className="w-16" />
            <span className="text-xs text-gray-500">{sessionData.progress.toFixed(0)}%</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      {/* Connection indicator */}
      <div className={cn(
        "absolute top-2 right-2 w-2 h-2 rounded-full",
        isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
      )} />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <statusConfig.icon className={cn("w-5 h-5", statusConfig.color)} />
            <span>{sessionData.name}</span>
          </CardTitle>
          
          <Badge variant="outline" className={cn(statusConfig.color)}>
            {sessionData.status}
          </Badge>
        </div>
        
        <CardDescription className="flex items-center space-x-4 text-sm">
          <span>ID: {sessionId.slice(0, 8)}...</span>
          {sessionData.browserType && <span>• {sessionData.browserType}</span>}
          {lastActivity && (
            <span>• Last activity: {formatRelativeTime(lastActivity)}</span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress */}
        {sessionData.progress !== undefined && (
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Progress</span>
              <span>{sessionData.progress.toFixed(1)}%</span>
            </div>
            <Progress value={sessionData.progress} className="h-2" />
          </div>
        )}

        {/* Task Summary */}
        {sessionData.taskCount !== undefined && (
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <div className="font-semibold">{sessionData.completedTasks || 0}</div>
              <div className="text-gray-500">Completed</div>
            </div>
            <div>
              <div className="font-semibold">{sessionData.taskCount}</div>
              <div className="text-gray-500">Total</div>
            </div>
            <div>
              <div className="font-semibold">{sessionData.successRate?.toFixed(1) || 0}%</div>
              <div className="text-gray-500">Success</div>
            </div>
          </div>
        )}

        {/* Metrics */}
        {sessionData.metrics && (
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-blue-500" />
              <span>CPU: {sessionData.metrics.cpu.toFixed(1)}%</span>
            </div>
            <div className="flex items-center space-x-2">
              <MemoryStick className="w-4 h-4 text-green-500" />
              <span>Memory: {(sessionData.metrics.memory / 1024 / 1024).toFixed(0)}MB</span>
            </div>
            <div className="flex items-center space-x-2">
              <Network className="w-4 h-4 text-purple-500" />
              <span>Network: {(sessionData.metrics.networkIn / 1024).toFixed(1)}KB/s</span>
            </div>
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-orange-500" />
              <span>Response: {sessionData.metrics.responseTime.toFixed(0)}ms</span>
            </div>
          </div>
        )}

        {/* Session Info */}
        <div className="pt-2 border-t space-y-2 text-xs text-gray-600">
          {uptime && (
            <div className="flex items-center space-x-2">
              <Clock className="w-3 h-3" />
              <span>Uptime: {formatUptime(uptime)}</span>
            </div>
          )}
          
          {sessionData.url && (
            <div className="flex items-center space-x-2">
              <Monitor className="w-3 h-3" />
              <span className="truncate">{sessionData.url}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span>WebSocket: {connectionStatus}</span>
            <span>Activity: {activityCount}</span>
          </div>
        </div>

        {/* Recent Logs */}
        {sessionData.logs && sessionData.logs.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2">Recent Activity</div>
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {sessionData.logs.slice(0, 3).map((log, index) => (
                <div 
                  key={index}
                  className="text-xs p-2 rounded bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs",
                        log.level === 'error' ? 'text-red-600 border-red-200' :
                        log.level === 'warn' ? 'text-yellow-600 border-yellow-200' :
                        'text-blue-600 border-blue-200'
                      )}
                    >
                      {log.level}
                    </Badge>
                    <span className="text-gray-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="mt-1 truncate">{log.message}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-2 border-t">
          {sessionData.status === 'created' || sessionData.status === 'paused' ? (
            <Button 
              size="sm" 
              onClick={() => handleSessionAction('start')}
              className="flex items-center space-x-1"
            >
              <Play className="w-3 h-3" />
              <span>Start</span>
            </Button>
          ) : null}
          
          {sessionData.status === 'running' ? (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleSessionAction('pause')}
              className="flex items-center space-x-1"
            >
              <Pause className="w-3 h-3" />
              <span>Pause</span>
            </Button>
          ) : null}
          
          {['running', 'paused'].includes(sessionData.status) ? (
            <Button 
              size="sm" 
              variant="destructive"
              onClick={() => handleSessionAction('stop')}
              className="flex items-center space-x-1"
            >
              <Square className="w-3 h-3" />
              <span>Stop</span>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
});

LiveSessionCard.displayName = 'LiveSessionCard';

export default LiveSessionCard;