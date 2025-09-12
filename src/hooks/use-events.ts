import { useState, useEffect, useCallback, useRef } from "react";
import { useWebSocket } from "./use-websocket";

// CloudEvents specification compliant event structure
export interface CloudEvent {
  id: string;
  source: string;
  specversion: string;
  type: string;
  datacontenttype?: string;
  dataschema?: string;
  subject?: string;
  time: string;
  data?: any;
  // Extension attributes
  priority?: 'low' | 'normal' | 'high' | 'critical';
  category?: 'system' | 'user' | 'agent' | 'task' | 'session' | 'error' | 'metrics';
  severity?: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  tags?: string[];
}

// Event filters
export interface EventFilter {
  types?: string[];
  sources?: string[];
  categories?: string[];
  priorities?: string[];
  severities?: string[];
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  search?: string;
}

// Event stream configuration
export interface EventStreamConfig {
  maxEvents?: number;
  autoScroll?: boolean;
  pauseOnHover?: boolean;
  enableFilters?: boolean;
  enableSearch?: boolean;
  groupByCategory?: boolean;
  showTimestamps?: boolean;
  bufferSize?: number;
}

export interface UseEventsOptions {
  config?: EventStreamConfig;
  initialFilter?: EventFilter;
  enablePersistence?: boolean;
  enableMetrics?: boolean;
}

export function useEvents(options: UseEventsOptions = {}) {
  const {
    config = {
      maxEvents: 1000,
      autoScroll: true,
      pauseOnHover: true,
      enableFilters: true,
      enableSearch: true,
      groupByCategory: false,
      showTimestamps: true,
      bufferSize: 10000
    },
    initialFilter = {},
    enablePersistence = true,
    enableMetrics = true
  } = options;

  // State management
  const [events, setEvents] = useState<CloudEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<CloudEvent[]>([]);
  const [filter, setFilter] = useState<EventFilter>(initialFilter);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(config.autoScroll || false);
  
  // Metrics
  const [metrics, setMetrics] = useState({
    totalEvents: 0,
    eventsPerSecond: 0,
    eventsByType: {} as Record<string, number>,
    eventsByCategory: {} as Record<string, number>,
    eventsBySeverity: {} as Record<string, number>,
    lastEventTime: null as string | null
  });

  // Refs for performance
  const eventBufferRef = useRef<CloudEvent[]>([]);
  const metricsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const filterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eventCountRef = useRef(0);
  const lastMetricsUpdate = useRef(Date.now());

  // WebSocket connection
  const { 
    isConnected, 
    connectionStatus, 
    addMessageHandler, 
    removeMessageHandler 
  } = useWebSocket('/ws/events', {
    reconnect: true,
    heartbeat: true,
    messageQueue: false
  });

  // Convert WebSocket message to CloudEvent
  const messageToCloudEvent = useCallback((message: any): CloudEvent => {
    // If it's already a CloudEvent, return as-is
    if (message.specversion) {
      return message as CloudEvent;
    }

    // Convert legacy message to CloudEvent format
    return {
      id: message.id || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      source: message.source || 'weborchestrator/system',
      specversion: '1.0',
      type: message.type || 'system.message',
      time: message.timestamp || new Date().toISOString(),
      datacontenttype: 'application/json',
      data: message.data || message,
      priority: message.priority || 'normal',
      category: getCategoryFromType(message.type || 'system'),
      severity: getSeverityFromMessage(message),
      tags: message.tags || []
    };
  }, []);

  // Categorize event by type
  const getCategoryFromType = (type: string): string => {
    // Nexus-specific categories
    if (type.startsWith('workspace')) return 'workspace';
    if (type.startsWith('agent')) return 'agent';
    if (type.startsWith('mcp')) return 'mcp';
    if (type.startsWith('chat')) return 'chat';
    if (type.startsWith('task')) return 'task';
    
    // Legacy categories
    if (type.startsWith('session')) return 'session';
    if (type.startsWith('user')) return 'user';
    if (type.includes('error') || type.includes('failed')) return 'error';
    if (type.includes('metric') || type.includes('stats')) return 'metrics';
    return 'system';
  };

  // Determine severity from message content
  const getSeverityFromMessage = (message: any): string => {
    if (message.severity) return message.severity;
    
    // Nexus-specific severity mapping
    if (message.type?.includes('failed') || message.type?.includes('error')) return 'error';
    if (message.type?.includes('disconnected')) return 'warn';
    if (message.type?.includes('connected') || message.type?.includes('completed')) return 'info';
    if (message.type?.includes('started') || message.type?.includes('launched')) return 'info';
    if (message.type?.includes('typing') || message.type?.includes('output')) return 'debug';
    
    // Legacy severity mapping
    if (message.type?.includes('warn')) return 'warn';
    if (message.type?.includes('debug')) return 'debug';
    
    // Default based on priority
    if (message.priority === 'critical') return 'fatal';
    if (message.priority === 'high') return 'error';
    if (message.priority === 'low') return 'debug';
    
    return 'info';
  };

  // Add event to buffer and state
  const addEvent = useCallback((event: CloudEvent) => {
    if (isPaused) {
      // Add to buffer but don't update visible events
      eventBufferRef.current.push(event);
      if (eventBufferRef.current.length > (config.bufferSize || 10000)) {
        eventBufferRef.current.shift();
      }
      return;
    }

    setEvents(prev => {
      const newEvents = [event, ...prev];
      // Keep only maxEvents
      if (newEvents.length > (config.maxEvents || 1000)) {
        newEvents.splice(config.maxEvents || 1000);
      }
      return newEvents;
    });

    // Update metrics
    if (enableMetrics) {
      eventCountRef.current++;
      setMetrics(prev => ({
        ...prev,
        totalEvents: prev.totalEvents + 1,
        eventsByType: {
          ...prev.eventsByType,
          [event.type]: (prev.eventsByType[event.type] || 0) + 1
        },
        eventsByCategory: {
          ...prev.eventsByCategory,
          [event.category || 'unknown']: (prev.eventsByCategory[event.category || 'unknown'] || 0) + 1
        },
        eventsBySeverity: {
          ...prev.eventsBySeverity,
          [event.severity || 'info']: (prev.eventsBySeverity[event.severity || 'info'] || 0) + 1
        },
        lastEventTime: event.time
      }));
    }
  }, [isPaused, config.maxEvents, config.bufferSize, enableMetrics]);

  // Handle incoming WebSocket messages
  useEffect(() => {
    const handleMessage = (message: any) => {
      const cloudEvent = messageToCloudEvent(message);
      addEvent(cloudEvent);
    };

    // Listen to all message types
    addMessageHandler('*', handleMessage);

    return () => {
      removeMessageHandler('*', handleMessage);
    };
  }, [addMessageHandler, removeMessageHandler, messageToCloudEvent, addEvent]);

  // Filter events
  const filterEvents = useCallback(() => {
    if (!filter || Object.keys(filter).length === 0) {
      setFilteredEvents(events);
      return;
    }

    setIsFiltering(true);

    // Use timeout for debounced filtering
    if (filterTimeoutRef.current) {
      clearTimeout(filterTimeoutRef.current);
    }

    filterTimeoutRef.current = setTimeout(() => {
      const filtered = events.filter(event => {
        // Type filter
        if (filter.types && filter.types.length > 0) {
          if (!filter.types.includes(event.type)) return false;
        }

        // Source filter
        if (filter.sources && filter.sources.length > 0) {
          if (!filter.sources.includes(event.source)) return false;
        }

        // Category filter
        if (filter.categories && filter.categories.length > 0) {
          if (!filter.categories.includes(event.category || 'unknown')) return false;
        }

        // Priority filter
        if (filter.priorities && filter.priorities.length > 0) {
          if (!filter.priorities.includes(event.priority || 'normal')) return false;
        }

        // Severity filter
        if (filter.severities && filter.severities.length > 0) {
          if (!filter.severities.includes(event.severity || 'info')) return false;
        }

        // Tags filter
        if (filter.tags && filter.tags.length > 0) {
          const eventTags = event.tags || [];
          if (!filter.tags.some(tag => eventTags.includes(tag))) return false;
        }

        // Date range filter
        if (filter.dateRange) {
          const eventTime = new Date(event.time);
          if (eventTime < filter.dateRange.start || eventTime > filter.dateRange.end) {
            return false;
          }
        }

        // Search filter
        if (filter.search && filter.search.trim()) {
          const searchLower = filter.search.toLowerCase();
          const searchableText = [
            event.type,
            event.source,
            event.subject,
            event.category,
            event.severity,
            JSON.stringify(event.data),
            ...(event.tags || [])
          ].join(' ').toLowerCase();

          if (!searchableText.includes(searchLower)) return false;
        }

        return true;
      });

      setFilteredEvents(filtered);
      setIsFiltering(false);
    }, 100);
  }, [events, filter]);

  // Apply filters when events or filter changes
  useEffect(() => {
    filterEvents();
  }, [filterEvents]);

  // Calculate events per second
  useEffect(() => {
    if (!enableMetrics) return;

    metricsIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const timeDiff = (now - lastMetricsUpdate.current) / 1000;
      const eventsInPeriod = eventCountRef.current;
      
      setMetrics(prev => ({
        ...prev,
        eventsPerSecond: Math.round(eventsInPeriod / timeDiff * 10) / 10
      }));

      eventCountRef.current = 0;
      lastMetricsUpdate.current = now;
    }, 1000);

    return () => {
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
      }
    };
  }, [enableMetrics]);

  // Resume events (flush buffer)
  const resumeEvents = useCallback(() => {
    setIsPaused(false);
    
    if (eventBufferRef.current.length > 0) {
      setEvents(prev => {
        const combined = [...eventBufferRef.current.reverse(), ...prev];
        eventBufferRef.current = [];
        
        // Keep only maxEvents
        if (combined.length > (config.maxEvents || 1000)) {
          combined.splice(config.maxEvents || 1000);
        }
        
        return combined;
      });
    }
  }, [config.maxEvents]);

  // Pause events
  const pauseEvents = useCallback(() => {
    setIsPaused(true);
  }, []);

  // Clear events
  const clearEvents = useCallback(() => {
    setEvents([]);
    setFilteredEvents([]);
    eventBufferRef.current = [];
    setMetrics(prev => ({
      ...prev,
      totalEvents: 0,
      eventsByType: {},
      eventsByCategory: {},
      eventsBySeverity: {}
    }));
  }, []);

  // Update filter
  const updateFilter = useCallback((newFilter: Partial<EventFilter>) => {
    setFilter(prev => ({ ...prev, ...newFilter }));
  }, []);

  // Clear filter
  const clearFilter = useCallback(() => {
    setFilter({});
  }, []);

  // Get unique values for filter options
  const getFilterOptions = useCallback(() => {
    const types = [...new Set(events.map(e => e.type))];
    const sources = [...new Set(events.map(e => e.source))];
    const categories = [...new Set(events.map(e => e.category).filter(Boolean))];
    const priorities = [...new Set(events.map(e => e.priority).filter(Boolean))];
    const severities = [...new Set(events.map(e => e.severity).filter(Boolean))];
    const tags = [...new Set(events.flatMap(e => e.tags || []))];

    return {
      types: types.sort(),
      sources: sources.sort(),
      categories: categories.sort(),
      priorities: priorities.sort(),
      severities: severities.sort(),
      tags: tags.sort()
    };
  }, [events]);

  // Export events
  const exportEvents = useCallback((format: 'json' | 'csv' = 'json') => {
    const eventsToExport = filteredEvents.length > 0 ? filteredEvents : events;
    
    if (format === 'json') {
      const dataStr = JSON.stringify(eventsToExport, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `weborchestrator-events-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } else if (format === 'csv') {
      const csvHeaders = 'ID,Time,Type,Source,Category,Priority,Severity,Subject,Data\n';
      const csvData = eventsToExport.map(event => 
        [
          event.id,
          event.time,
          event.type,
          event.source,
          event.category || '',
          event.priority || '',
          event.severity || '',
          event.subject || '',
          JSON.stringify(event.data || '').replace(/"/g, '""')
        ].join(',')
      ).join('\n');
      
      const dataStr = csvHeaders + csvData;
      const dataUri = 'data:text/csv;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `weborchestrator-events-${new Date().toISOString().split('T')[0]}.csv`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }
  }, [events, filteredEvents]);

  // Persistence
  useEffect(() => {
    if (!enablePersistence) return;

    // Save filter to localStorage
    localStorage.setItem('weborchestrator:event-filter', JSON.stringify(filter));
  }, [filter, enablePersistence]);

  useEffect(() => {
    if (!enablePersistence) return;

    // Load filter from localStorage
    const savedFilter = localStorage.getItem('weborchestrator:event-filter');
    if (savedFilter) {
      try {
        const parsedFilter = JSON.parse(savedFilter);
        setFilter(parsedFilter);
      } catch (error) {
        console.warn('Failed to load saved event filter:', error);
      }
    }
  }, [enablePersistence]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
      }
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Connection state
    isConnected,
    connectionStatus,
    
    // Events data
    events: filteredEvents.length > 0 ? filteredEvents : events,
    allEvents: events,
    eventCount: filteredEvents.length > 0 ? filteredEvents.length : events.length,
    totalEventCount: events.length,
    bufferedEventCount: eventBufferRef.current.length,
    
    // Filter state
    filter,
    isFiltering,
    updateFilter,
    clearFilter,
    getFilterOptions,
    
    // Control actions
    isPaused,
    pauseEvents,
    resumeEvents,
    clearEvents,
    
    // Auto-scroll control
    isAutoScrolling,
    setIsAutoScrolling,
    
    // Metrics
    metrics,
    
    // Utilities
    exportEvents,
    
    // Configuration
    config
  };
}