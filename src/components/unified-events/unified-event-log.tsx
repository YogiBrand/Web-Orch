import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useWebSocket } from "@/hooks/use-websocket";
import { EventItem } from "./event-item";
import { EventsFilter } from "./events-filter";
import { EventsAnalytics } from "./events-analytics";
import { UnifiedEvent, EventFilter, EventsWebSocketMessage } from "./types";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Filter,
  BarChart3,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UnifiedEventLogProps {
  taskId: string;
  className?: string;
  autoScroll?: boolean;
  maxEvents?: number;
  showAnalytics?: boolean;
  showFilter?: boolean;
  compact?: boolean;
}

export const UnifiedEventLog: React.FC<UnifiedEventLogProps> = ({
  taskId,
  className,
  autoScroll = true,
  maxEvents = 1000,
  showAnalytics = true,
  showFilter = true,
  compact = false
}) => {
  const [events, setEvents] = useState<UnifiedEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<UnifiedEvent[]>([]);
  const [filter, setFilter] = useState<EventFilter>({ task_id: taskId });
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(autoScroll);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const endOfEventsRef = useRef<HTMLDivElement>(null);
  
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
    maxReconnectAttempts: 5
  });

  // Scroll to bottom when new events arrive
  const scrollToBottom = useCallback(() => {
    if (isAutoScrollEnabled && endOfEventsRef.current) {
      endOfEventsRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [isAutoScrollEnabled]);

  // Handle incoming WebSocket messages
  const handleEventMessage = useCallback((message: EventsWebSocketMessage) => {
    console.log("Received event message:", message);
    
    switch (message.type) {
      case "unified_event":
        if (message.data.event) {
          setEvents(prev => {
            const newEvents = [...prev, message.data.event!];
            return newEvents.slice(-maxEvents); // Keep only the latest maxEvents
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
    
    // Auto-scroll to bottom after a brief delay
    setTimeout(scrollToBottom, 100);
  }, [maxEvents, scrollToBottom]);

  // Setup WebSocket message handlers
  useEffect(() => {
    setIsConnected(wsConnected);
    
    if (wsConnected) {
      // Subscribe to events for this task
      sendMessage({
        type: "subscribe",
        task_id: taskId,
        filters: filter
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
  }, [wsConnected, taskId, filter, sendMessage, addMessageHandler, removeMessageHandler, handleEventMessage]);

  // Apply filters to events
  useEffect(() => {
    let filtered = events;
    
    if (filter.agent_types?.length) {
      filtered = filtered.filter(event => filter.agent_types!.includes(event.agent_type));
    }
    
    if (filter.action_types?.length) {
      filtered = filtered.filter(event => filter.action_types!.includes(event.action_type));
    }
    
    if (filter.statuses?.length) {
      filtered = filtered.filter(event => filter.statuses!.includes(event.status));
    }
    
    if (filter.search_query) {
      const query = filter.search_query.toLowerCase();
      filtered = filtered.filter(event => 
        event.ai_title?.toLowerCase().includes(query) ||
        event.ai_description?.toLowerCase().includes(query) ||
        event.raw_log.toLowerCase().includes(query)
      );
    }
    
    if (filter.date_range) {
      filtered = filtered.filter(event => {
        const eventTime = new Date(event.timestamp);
        return eventTime >= filter.date_range!.start && eventTime <= filter.date_range!.end;
      });
    }
    
    setFilteredEvents(filtered);
  }, [events, filter]);

  // Load historical events on mount
  useEffect(() => {
    const loadHistoricalEvents = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/events/history/${taskId}?limit=${maxEvents}`);
        if (response.ok) {
          const data = await response.json();
          if (data.events) {
            setEvents(data.events);
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
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "processing":
        return <Activity className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getConnectionStatusBadge = () => {
    switch (connectionStatus) {
      case "connected":
        return <Badge variant="success" className="ml-2">Connected</Badge>;
      case "connecting":
        return <Badge variant="secondary" className="ml-2">Connecting...</Badge>;
      case "error":
        return <Badge variant="destructive" className="ml-2">Error</Badge>;
      default:
        return <Badge variant="outline" className="ml-2">Disconnected</Badge>;
    }
  };

  const exportEvents = () => {
    const dataStr = JSON.stringify(filteredEvents, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `events-${taskId}-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const refreshEvents = () => {
    sendMessage({
      type: "refresh",
      task_id: taskId
    });
  };

  if (!compact) {
    return (
      <div className={cn("flex flex-col h-full space-y-4", className)}>
        {/* Analytics Section */}
        {showAnalytics && (
          <Card className="flex-shrink-0">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Events Analytics
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAnalyticsOpen(!isAnalyticsOpen)}
                >
                  {isAnalyticsOpen ? "Hide" : "Show"}
                </Button>
              </div>
            </CardHeader>
            {isAnalyticsOpen && (
              <CardContent className="pt-0">
                <EventsAnalytics events={filteredEvents} />
              </CardContent>
            )}
          </Card>
        )}

        {/* Main Events Card */}
        <Card className="flex-1 min-h-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CardTitle className="text-lg">
                  Unified Event Log
                </CardTitle>
                {getConnectionStatusBadge()}
              </div>
              
              <div className="flex items-center space-x-2">
                <Badge variant="outline">
                  {filteredEvents.length} events
                </Badge>
                
                {showFilter && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className={cn(isFilterOpen && "bg-accent")}
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAutoScrollEnabled(!isAutoScrollEnabled)}
                  className={cn(isAutoScrollEnabled && "bg-accent")}
                >
                  {isAutoScrollEnabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                
                <Button variant="ghost" size="sm" onClick={refreshEvents}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                
                <Button variant="ghost" size="sm" onClick={exportEvents}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          {/* Filter Section */}
          {showFilter && isFilterOpen && (
            <>
              <CardContent className="pt-0 pb-3">
                <EventsFilter
                  filter={filter}
                  onFilterChange={setFilter}
                  events={events}
                />
              </CardContent>
              <Separator />
            </>
          )}

          {/* Events List */}
          <CardContent className="flex-1 min-h-0 p-0">
            <ScrollArea className="h-full" ref={scrollAreaRef}>
              <div className="p-6 space-y-2">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading events...
                  </div>
                ) : filteredEvents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No events found
                    {Object.keys(filter).length > 1 && " for current filters"}
                  </div>
                ) : (
                  filteredEvents.map((event) => (
                    <EventItem key={event.id} event={event} />
                  ))
                )}
                <div ref={endOfEventsRef} />
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Compact version for embedding in other components
  return (
    <div className={cn("h-full", className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <h3 className="font-medium">Recent Events</h3>
          {getConnectionStatusBadge()}
        </div>
        <Badge variant="outline" className="text-xs">
          {filteredEvents.length}
        </Badge>
      </div>
      
      <ScrollArea className="h-full">
        <div className="space-y-1">
          {filteredEvents.slice(-10).map((event) => (
            <div key={event.id} className="flex items-center space-x-2 text-sm p-2 rounded hover:bg-accent">
              {getStatusIcon(event.status)}
              <span className="flex-1 truncate">
                {event.ai_title || event.action_type}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(event.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
          {filteredEvents.length === 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No events
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};