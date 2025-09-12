import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { UnifiedEvent, EventAnalytics } from "./types";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Activity,
  Bot,
  Globe,
  Mouse,
  Keyboard,
  Navigation,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EventsAnalyticsProps {
  events: UnifiedEvent[];
  className?: string;
  timeWindow?: number; // hours to analyze (default: 24)
}

const agentIcons = {
  skyvern: Bot,
  playwright: Globe,
  "browser-use": Mouse,
  selenium: Bot,
  puppeteer: Bot
};

const agentColors = {
  skyvern: "text-purple-600",
  playwright: "text-green-600",
  "browser-use": "text-blue-600",
  selenium: "text-orange-600",
  puppeteer: "text-red-600"
};

const actionIcons = {
  click: Mouse,
  type: Keyboard,
  navigate: Navigation,
  scroll: Mouse,
  wait: Clock,
  extract: Activity,
  submit: CheckCircle2,
  error: AlertCircle,
  success: CheckCircle2
};

export const EventsAnalytics: React.FC<EventsAnalyticsProps> = ({
  events,
  className,
  timeWindow = 24
}) => {
  const analytics = useMemo(() => {
    if (!events.length) {
      return {
        total_events: 0,
        success_rate: 0,
        failure_rate: 0,
        avg_processing_time: 0,
        most_common_actions: [],
        agent_distribution: [],
        timeline_data: [],
        processed_events: 0,
        pending_events: 0,
        recent_trend: 0
      };
    }

    // Filter events by time window
    const cutoffTime = new Date(Date.now() - timeWindow * 60 * 60 * 1000);
    const recentEvents = events.filter(event => new Date(event.timestamp) >= cutoffTime);

    const total_events = recentEvents.length;
    const completed_events = recentEvents.filter(e => e.status === "completed").length;
    const failed_events = recentEvents.filter(e => e.status === "failed").length;
    const processed_events = completed_events + failed_events;
    const pending_events = recentEvents.filter(e => e.status === "pending" || e.status === "processing").length;

    const success_rate = processed_events > 0 ? (completed_events / processed_events) * 100 : 0;
    const failure_rate = processed_events > 0 ? (failed_events / processed_events) * 100 : 0;

    // Calculate average processing time
    const eventsWithDuration = recentEvents.filter(e => e.metadata.duration);
    const avg_processing_time = eventsWithDuration.length > 0 
      ? eventsWithDuration.reduce((sum, e) => sum + (e.metadata.duration || 0), 0) / eventsWithDuration.length
      : 0;

    // Most common actions
    const actionCounts = recentEvents.reduce((acc, event) => {
      acc[event.action_type] = (acc[event.action_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const most_common_actions = Object.entries(actionCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([action_type, count]) => ({
        action_type,
        count,
        percentage: (count / total_events) * 100
      }));

    // Agent distribution
    const agentCounts = recentEvents.reduce((acc, event) => {
      if (!acc[event.agent_type]) {
        acc[event.agent_type] = { total: 0, completed: 0 };
      }
      acc[event.agent_type].total++;
      if (event.status === "completed") {
        acc[event.agent_type].completed++;
      }
      return acc;
    }, {} as Record<string, { total: number; completed: number }>);

    const agent_distribution = Object.entries(agentCounts)
      .sort(([,a], [,b]) => b.total - a.total)
      .map(([agent_type, { total, completed }]) => ({
        agent_type,
        count: total,
        percentage: (total / total_events) * 100,
        success_rate: total > 0 ? (completed / total) * 100 : 0
      }));

    // Timeline data (last 12 hours, hourly buckets)
    const now = new Date();
    const timeline_data = Array.from({ length: 12 }, (_, i) => {
      const hourStart = new Date(now.getTime() - (11 - i) * 60 * 60 * 1000);
      hourStart.setMinutes(0, 0, 0);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

      const hourEvents = recentEvents.filter(event => {
        const eventTime = new Date(event.timestamp);
        return eventTime >= hourStart && eventTime < hourEnd;
      });

      return {
        timestamp: hourStart.toISOString(),
        success_count: hourEvents.filter(e => e.status === "completed").length,
        failure_count: hourEvents.filter(e => e.status === "failed").length,
        total_count: hourEvents.length
      };
    });

    // Calculate trend (comparing last hour to hour before)
    const lastHourEvents = timeline_data[11]?.total_count || 0;
    const prevHourEvents = timeline_data[10]?.total_count || 0;
    const recent_trend = prevHourEvents > 0 ? ((lastHourEvents - prevHourEvents) / prevHourEvents) * 100 : 0;

    return {
      total_events,
      success_rate,
      failure_rate,
      avg_processing_time,
      most_common_actions,
      agent_distribution,
      timeline_data,
      processed_events,
      pending_events,
      recent_trend
    };
  }, [events, timeWindow]);

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Total Events</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{analytics.total_events}</div>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                {analytics.recent_trend >= 0 ? (
                  <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1 text-red-600" />
                )}
                {formatPercentage(Math.abs(analytics.recent_trend))} vs prev hour
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Success Rate</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-green-600">
                {formatPercentage(analytics.success_rate)}
              </div>
              <div className="text-xs text-muted-foreground">
                {analytics.processed_events} completed
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium">Avg Time</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">
                {formatDuration(analytics.avg_processing_time)}
              </div>
              <div className="text-xs text-muted-foreground">
                per event
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Active</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{analytics.pending_events}</div>
              <div className="text-xs text-muted-foreground">
                pending/processing
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Most Common Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <Target className="h-4 w-4 mr-2" />
              Most Common Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.most_common_actions.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                No actions recorded
              </div>
            ) : (
              analytics.most_common_actions.map(({ action_type, count, percentage }) => {
                const Icon = actionIcons[action_type as keyof typeof actionIcons] || Activity;
                return (
                  <div key={action_type} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <Icon className="h-3 w-3" />
                        <span className="capitalize">{action_type}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-muted-foreground">{count}</span>
                        <Badge variant="outline" className="text-xs">
                          {formatPercentage(percentage)}
                        </Badge>
                      </div>
                    </div>
                    <Progress value={percentage} className="h-1" />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Agent Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <Bot className="h-4 w-4 mr-2" />
              Agent Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.agent_distribution.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                No agents active
              </div>
            ) : (
              analytics.agent_distribution.map(({ agent_type, count, percentage, success_rate }) => {
                const Icon = agentIcons[agent_type as keyof typeof agentIcons] || Bot;
                const colorClass = agentColors[agent_type as keyof typeof agentColors] || "text-gray-600";
                
                return (
                  <div key={agent_type} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <Icon className={cn("h-3 w-3", colorClass)} />
                        <span className="capitalize">{agent_type}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-muted-foreground">{count}</span>
                        <Badge variant="outline" className="text-xs">
                          {formatPercentage(percentage)}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Progress value={percentage} className="h-1 flex-1" />
                      <span className="text-xs text-muted-foreground min-w-12">
                        {formatPercentage(success_rate)} success
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Timeline Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center">
            <Activity className="h-4 w-4 mr-2" />
            Event Timeline (Last 12 Hours)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.timeline_data.length === 0 || analytics.timeline_data.every(d => d.total_count === 0) ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              No events in timeline
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-end space-x-4 text-xs">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-green-500 rounded" />
                  <span>Success</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-red-500 rounded" />
                  <span>Failed</span>
                </div>
              </div>
              
              <div className="grid grid-cols-12 gap-1 h-32">
                {analytics.timeline_data.map((data, index) => {
                  const maxCount = Math.max(...analytics.timeline_data.map(d => d.total_count));
                  const successHeight = maxCount > 0 ? (data.success_count / maxCount) * 100 : 0;
                  const failureHeight = maxCount > 0 ? (data.failure_count / maxCount) * 100 : 0;
                  
                  return (
                    <div key={index} className="flex flex-col justify-end h-full relative group">
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-popover border rounded px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        <div>{new Date(data.timestamp).toLocaleTimeString()}</div>
                        <div>Success: {data.success_count}</div>
                        <div>Failed: {data.failure_count}</div>
                      </div>
                      
                      {data.failure_count > 0 && (
                        <div 
                          className="bg-red-500 rounded-t"
                          style={{ height: `${failureHeight}%` }}
                        />
                      )}
                      {data.success_count > 0 && (
                        <div 
                          className="bg-green-500 rounded-t"
                          style={{ height: `${successHeight}%` }}
                        />
                      )}
                      
                      {data.total_count === 0 && (
                        <div className="h-1 bg-muted rounded" />
                      )}
                      
                      <div className="text-xs text-muted-foreground text-center mt-1">
                        {new Date(data.timestamp).getHours()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Insights */}
      {analytics.total_events > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium">Performance</h4>
                <ul className="space-y-1 text-muted-foreground">
                  {analytics.success_rate >= 90 && (
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                      <span>Excellent success rate ({formatPercentage(analytics.success_rate)})</span>
                    </li>
                  )}
                  {analytics.success_rate < 70 && (
                    <li className="flex items-center space-x-2">
                      <AlertCircle className="h-3 w-3 text-yellow-600" />
                      <span>Success rate needs attention ({formatPercentage(analytics.success_rate)})</span>
                    </li>
                  )}
                  {analytics.avg_processing_time > 10000 && (
                    <li className="flex items-center space-x-2">
                      <Clock className="h-3 w-3 text-yellow-600" />
                      <span>Consider optimizing processing time</span>
                    </li>
                  )}
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Activity</h4>
                <ul className="space-y-1 text-muted-foreground">
                  {analytics.recent_trend > 50 && (
                    <li className="flex items-center space-x-2">
                      <TrendingUp className="h-3 w-3 text-green-600" />
                      <span>High activity increase this hour</span>
                    </li>
                  )}
                  {analytics.pending_events > analytics.processed_events * 0.5 && (
                    <li className="flex items-center space-x-2">
                      <Activity className="h-3 w-3 text-blue-600" />
                      <span>High number of pending events</span>
                    </li>
                  )}
                  {analytics.agent_distribution.length > 3 && (
                    <li className="flex items-center space-x-2">
                      <Bot className="h-3 w-3 text-purple-600" />
                      <span>Good agent diversity active</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};