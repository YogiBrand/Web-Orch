declare module './supabase-config.js' {
  import { SupabaseClient } from '@supabase/supabase-js';

  export interface AgentData {
    name: string;
    type: string;
    runtime: string;
    status: string;
    version: string;
    provider: string;
    category?: string;
    description?: string;
    container_id?: string;
    container_name?: string;
    image_name?: string;
    port?: number;
    config?: Record<string, any>;
    capabilities?: string[];
    endpoints?: string[];
    metadata?: Record<string, any>;
  }

  export const supabase: SupabaseClient;
  export const AGENTS_TABLE: string;
  export const AGENT_LOGS_TABLE: string;
  export const AGENT_METRICS_TABLE: string;
  export const CONTAINER_INSTANCES_TABLE: string;
  export const MARKETPLACE_TEMPLATES_TABLE: string;

  export function createAgent(agentData: Partial<AgentData>): Promise<any>;
  export function updateAgent(id: string, updates: Partial<AgentData>): Promise<any>;
  export function getAgents(): Promise<any[]>;
  export function deleteAgent(id: string): Promise<boolean>;
  export function getAgentLogs(agentId: string, limit?: number): Promise<any[]>;
  export function getAgentMetrics(agentId: string, limit?: number): Promise<any[]>;

  // Container instance functions
  export function createContainerInstance(containerData: any): Promise<any>;

  // Log and metrics functions
  export function createLog(logData: any): Promise<any>;
  export function createMetrics(metricsData: any): Promise<any>;
  export function updateAgentHealth(agentId: string, healthStatus: string, lastHealthCheck?: string): Promise<any>;

  // Marketplace functions
  export function getMarketplaceTemplates(filters?: any): Promise<any[]>;
  export function getMarketplaceTemplate(slug: string): Promise<any>;
}
