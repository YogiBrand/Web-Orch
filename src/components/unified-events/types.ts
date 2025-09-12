import { WebSocketMessage } from "@/hooks/use-websocket";

export interface UnifiedEvent extends WebSocketMessage {
  id: string;
  task_id: string;
  timestamp: string;
  agent_type: "skyvern" | "playwright" | "browser-use" | "selenium" | "puppeteer";
  action_type: "click" | "type" | "navigate" | "scroll" | "wait" | "extract" | "submit" | "error" | "success";
  status: "pending" | "processing" | "completed" | "failed";
  
  // AI-enriched fields (from AI enrichment service)
  ai_title?: string;
  ai_description?: string;
  confidence_score?: number;
  
  // Raw data from agent
  raw_log: string;
  metadata: {
    element_selector?: string;
    element_text?: string;
    url?: string;
    screenshot?: string;
    coordinates?: { x: number; y: number };
    duration?: number;
    error_message?: string;
    success?: boolean;
    [key: string]: any;
  };
}

export interface EventFilter {
  agent_types?: string[];
  action_types?: string[];
  statuses?: string[];
  date_range?: {
    start: Date;
    end: Date;
  };
  search_query?: string;
  task_id?: string;
}

export interface EventAnalytics {
  total_events: number;
  success_rate: number;
  failure_rate: number;
  avg_processing_time: number;
  most_common_actions: Array<{
    action_type: string;
    count: number;
    percentage: number;
  }>;
  agent_distribution: Array<{
    agent_type: string;
    count: number;
    percentage: number;
    success_rate: number;
  }>;
  timeline_data: Array<{
    timestamp: string;
    success_count: number;
    failure_count: number;
  }>;
}

export interface EventsWebSocketMessage extends WebSocketMessage {
  type: "unified_event" | "events_batch" | "event_updated" | "analytics_updated";
  data: {
    events?: UnifiedEvent[];
    event?: UnifiedEvent;
    analytics?: EventAnalytics;
    task_id?: string;
  };
}

export interface AgentIcon {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}

export interface ActionTypeConfig {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  label: string;
}

export interface StatusConfig {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  label: string;
}