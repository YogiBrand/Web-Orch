import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock, CheckCircle, AlertCircle } from "lucide-react";

interface AgentMetrics {
  activeTasks: number;
  queuedTasks: number;
  completedToday: number;
  averageResponseTime: number;
  successRate: number;
  cpuUsage?: number;
  memoryUsage?: number;
  lastTaskAt?: string;
}

interface AgentMetricsCardProps {
  metrics: AgentMetrics;
}

export function AgentMetricsCard({ metrics }: AgentMetricsCardProps) {
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return "text-green-600";
    if (rate >= 85) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Activity className="h-3 w-3" />
          Active Tasks
        </div>
        <div className="text-lg font-semibold">{metrics.activeTasks}</div>
        {metrics.queuedTasks > 0 && (
          <Badge variant="secondary" className="text-xs">
            {metrics.queuedTasks} queued
          </Badge>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <CheckCircle className="h-3 w-3" />
          Completed Today
        </div>
        <div className="text-lg font-semibold">{metrics.completedToday}</div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          Avg Response
        </div>
        <div className="text-lg font-semibold">
          {formatTime(metrics.averageResponseTime)}
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          Success Rate
        </div>
        <div className={`text-lg font-semibold ${getSuccessRateColor(metrics.successRate)}`}>
          {metrics.successRate.toFixed(1)}%
        </div>
        <Progress value={metrics.successRate} className="h-1" />
      </div>

      {(metrics.cpuUsage !== undefined || metrics.memoryUsage !== undefined) && (
        <>
          {metrics.cpuUsage !== undefined && (
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">CPU Usage</div>
              <div className="text-sm font-medium">{metrics.cpuUsage.toFixed(1)}%</div>
              <Progress value={metrics.cpuUsage} className="h-1" />
            </div>
          )}

          {metrics.memoryUsage !== undefined && (
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Memory</div>
              <div className="text-sm font-medium">{metrics.memoryUsage.toFixed(1)}%</div>
              <Progress value={metrics.memoryUsage} className="h-1" />
            </div>
          )}
        </>
      )}

      {metrics.lastTaskAt && (
        <div className="space-y-1 col-span-2">
          <div className="text-xs text-muted-foreground">Last Task</div>
          <div className="text-sm">
            {new Date(metrics.lastTaskAt).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}