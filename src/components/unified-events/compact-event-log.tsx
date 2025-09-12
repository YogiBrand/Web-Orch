import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWebSocket } from "@/hooks/use-websocket";
import { UnifiedEvent, EventsWebSocketMessage } from "./types";
import { 
  Activity, 
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Bot,
  Globe,
  Mouse,
  Keyboard,
  Navigation
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface CompactEventLogProps {
  taskId: string;
  className?: string;
  maxEvents?: number;
  showViewAll?: boolean;
  onViewAll?: () => void;
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

export const CompactEventLog: React.FC<CompactEventLogProps> = ({
  taskId,
  className,
  maxEvents = 10,
  showViewAll = true,
  onViewAll
}) => {
  const [events, setEvents] = useState<UnifiedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  
  // WebSocket connection for real-time events
  const { 
    isConnected: wsConnected, 
    connectionStatus,
    addMessageHandler, 
    removeMessageHandler,
    sendMessage 
  } = useWebSocket(`/api/events/stream/${taskId}`, {
    reconnect: true,
    heartbeat: true,
    maxReconnectAttempts: 3
  });

  // Handle incoming WebSocket messages
  const handleEventMessage = useCallback((message: EventsWebSocketMessage) => {
    switch (message.type) {
      case "unified_event":
        if (message.data.event) {
          setEvents(prev => {
            const newEvents = [...prev, message.data.event!];
            return newEvents.slice(-maxEvents);
          });
        }
        break;
        
      case "events_batch":
        if (message.data.events) {
          setEvents(prev => {
            const combined = [...prev, ...message.data.events!];
            return combined.slice(-maxEvents);
          });
        }
        break;
        
      case "event_updated":
        if (message.data.event) {
          setEvents(prev => 
            prev.map(event => 
              event.id === message.data.event!.id ? message.data.event! : event
            )
          );
        }
        break;
    }
  }, [maxEvents]);

  // Setup WebSocket message handlers
  useEffect(() => {
    setIsConnected(wsConnected);
    
    if (wsConnected) {
      // Subscribe to events for this task
      sendMessage({
        type: "subscribe",
        task_id: taskId,
        filters: { task_id: taskId }
      });
      
      // Add message handlers
      addMessageHandler("unified_event", handleEventMessage);
      addMessageHandler("events_batch", handleEventMessage);
      addMessageHandler("event_updated", handleEventMessage);
      
      setIsLoading(false);
    }
    
    return () => {
      removeMessageHandler("unified_event", handleEventMessage);
      removeMessageHandler("events_batch", handleEventMessage);
      removeMessageHandler("event_updated", handleEventMessage);
    };
  }, [wsConnected, taskId, sendMessage, addMessageHandler, removeMessageHandler, handleEventMessage]);

  // Load historical events on mount
  useEffect(() => {
    const loadHistoricalEvents = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/events/history/${taskId}?limit=${maxEvents}`);
        if (response.ok) {
          const data = await response.json();
          if (data.events) {
            setEvents(data.events.slice(-maxEvents));
          }
        }
      } catch (error) {
        console.error("Failed to load historical events:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadHistoricalEvents();
  }, [taskId, maxEvents]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case "failed":
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      case "processing":
        return <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-3 w-3 text-yellow-500" />;
    }
  };

  const getConnectionStatusDot = () => {
    switch (connectionStatus) {
      case "connected":
        return <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />;
      case "connecting":
        return <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />;
      case "error":
        return <div className="w-2 h-2 bg-red-500 rounded-full" />;
      default:
        return <div className="w-2 h-2 bg-gray-400 rounded-full" />;
    }
  };

  const refreshEvents = () => {
    sendMessage({
      type: "refresh",
      task_id: taskId
    });
  };

  // Get recent events stats
  const completedCount = events.filter(e => e.status === "completed").length;
  const failedCount = events.filter(e => e.status === "failed").length;
  const processingCount = events.filter(e => e.status === "processing" || e.status === "pending").length;

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CardTitle className="text-base">Recent Events</CardTitle>
            {getConnectionStatusDot()}
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 text-xs">
              {processingCount > 0 && (
                <Badge variant="outline" className="text-xs">
                  {processingCount} active
                </Badge>
              )}
              {completedCount > 0 && (
                <Badge variant="outline" className="text-xs text-green-600">
                  {completedCount} done
                </Badge>
              )}
              {failedCount > 0 && (
                <Badge variant="outline" className="text-xs text-red-600">
                  {failedCount} failed
                </Badge>
              )}
            </div>
            
            <Button variant="ghost" size="sm" onClick={refreshEvents}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <ScrollArea className="h-64">
          <div className="space-y-2">
            {isLoading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                Loading events...
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No events yet
              </div>
            ) : (
              events.map((event) => {
                const AgentIcon = agentIcons[event.agent_type as keyof typeof agentIcons] || Bot;
                const ActionIcon = actionIcons[event.action_type as keyof typeof actionIcons] || Activity;
                const agentColor = agentColors[event.agent_type as keyof typeof agentColors] || "text-gray-600";
                
                return (
                  <div
                    key={event.id}
                    className="flex items-start space-x-3 p-2 rounded-lg hover:bg-accent/50 transition-colors group"
                  >
                    {/* Agent Icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      <div className={cn("p-1 rounded", `bg-${agentColor.split('-')[1]}-100 dark:bg-${agentColor.split('-')[1]}-950`)}>
                        <AgentIcon className={cn("h-3 w-3", agentColor)} />
                      </div>
                    </div>

                    {/* Event Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <ActionIcon className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm font-medium truncate">
                          {event.ai_title || event.action_type}
                        </span>
                        {getStatusIcon(event.status)}
                      </div>
                      
                      {event.ai_description && (
                        <p className="text-xs text-muted-foreground truncate mb-1">
                          {event.ai_description}
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {event.agent_type}
                          </Badge>
                          <span>{formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}</span>
                        </div>
                        
                        {event.metadata.url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                            asChild
                          >
                            <a href={event.metadata.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        {showViewAll && events.length > 0 && (
          <div className="mt-4 pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={onViewAll}
              className="w-full"
            >
              <Activity className="h-3 w-3 mr-2" />
              View All Events ({events.length}+)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};