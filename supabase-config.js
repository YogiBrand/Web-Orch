import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from './supabase-env.js';

// TypeScript declarations for better type safety
/**
 * @typedef {Object} AgentData
 * @property {string} name
 * @property {string} type
 * @property {string} runtime
 * @property {string} status
 * @property {string} version
 * @property {string} provider
 * @property {string} category
 * @property {string} description
 * @property {string} container_id
 * @property {string} container_name
 * @property {string} image_name
 * @property {number} port
 * @property {Object} config
 * @property {string[]} capabilities
 * @property {string[]} endpoints
 * @property {Object} metadata
 */

// Supabase configuration
const supabaseUrl = SUPABASE_CONFIG.url;
const supabaseKey = SUPABASE_CONFIG.anonKey;

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);

// Database schema for agents
export const AGENTS_TABLE = 'agents';
export const AGENT_LOGS_TABLE = 'agent_logs';
export const AGENT_METRICS_TABLE = 'agent_metrics';
export const CONTAINER_INSTANCES_TABLE = 'container_instances';
export const MARKETPLACE_TEMPLATES_TABLE = 'marketplace_templates';

// Marketplace Templates schema
export const MARKETPLACE_TEMPLATE_SCHEMA = {
  id: 'text PRIMARY KEY',
  name: 'text NOT NULL',
  slug: 'text NOT NULL UNIQUE',
  description: 'text NOT NULL',
  longDescription: 'text',
  provider: 'text NOT NULL',
  category: 'text NOT NULL',
  tags: 'jsonb DEFAULT \'[]\'',
  logoUrl: 'text',
  version: 'text NOT NULL',
  rating: 'numeric DEFAULT 0',
  reviews: 'integer DEFAULT 0',
  downloads: 'integer DEFAULT 0',
  runtime: 'text NOT NULL DEFAULT \'docker\'',
  capabilities: 'jsonb DEFAULT \'[]\'',
  requirements: 'jsonb DEFAULT \'[]\'',
  ports: 'jsonb DEFAULT \'{}\'',
  pricing: 'jsonb DEFAULT \'{}\'',
  installation: 'jsonb DEFAULT \'{}\'',
  documentation: 'text',
  defaultConfig: 'jsonb DEFAULT \'{}\'',
  ideIntegration: 'jsonb DEFAULT \'{}\'',
  created_at: 'timestamp with time zone DEFAULT now()',
  updated_at: 'timestamp with time zone DEFAULT now()'
};

// Agent schema
export const AGENT_SCHEMA = {
  id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
  name: 'text NOT NULL',
  type: 'text NOT NULL',
  runtime: 'text NOT NULL DEFAULT \'docker\'',
  status: 'text NOT NULL DEFAULT \'stopped\'',
  version: 'text',
  provider: 'text NOT NULL',
  category: 'text NOT NULL',
  description: 'text',
  container_id: 'text',
  container_name: 'text',
  image_name: 'text',
  port: 'integer',
  config: 'jsonb DEFAULT \'{}\'',
  capabilities: 'jsonb DEFAULT \'[]\'',
  endpoints: 'jsonb DEFAULT \'[]\'',
  created_at: 'timestamp with time zone DEFAULT now()',
  updated_at: 'timestamp with time zone DEFAULT now()',
  last_health_check: 'timestamp with time zone',
  health_status: 'text DEFAULT \'unknown\'',
  metadata: 'jsonb DEFAULT \'{}\''
};

// Log schema
export const LOG_SCHEMA = {
  id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
  agent_id: 'uuid REFERENCES agents(id) ON DELETE CASCADE',
  level: 'text NOT NULL',
  message: 'text NOT NULL',
  source: 'text DEFAULT \'system\'',
  metadata: 'jsonb DEFAULT \'{}\'',
  created_at: 'timestamp with time zone DEFAULT now()'
};

// Metrics schema
export const METRICS_SCHEMA = {
  id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
  agent_id: 'uuid REFERENCES agents(id) ON DELETE CASCADE',
  requests_per_minute: 'numeric DEFAULT 0',
  average_response_time: 'numeric DEFAULT 0',
  error_rate: 'numeric DEFAULT 0',
  uptime_percentage: 'numeric DEFAULT 100',
  memory_usage: 'numeric DEFAULT 0',
  cpu_usage: 'numeric DEFAULT 0',
  network_in: 'numeric DEFAULT 0',
  network_out: 'numeric DEFAULT 0',
  created_at: 'timestamp with time zone DEFAULT now()'
};

// Agent CRUD functions
export async function createAgent(agentData) {
  try {
    const { data, error } = await supabase
      .from(AGENTS_TABLE)
      .insert([{
        name: agentData.name,
        type: agentData.type,
        runtime: agentData.runtime || 'docker',
        status: agentData.status || 'stopped',
        version: agentData.version,
        provider: agentData.provider,
        category: agentData.category,
        description: agentData.description,
        container_id: agentData.container_id,
        container_name: agentData.container_name,
        image_name: agentData.image_name,
        port: agentData.port,
        config: JSON.stringify(agentData.config || {}),
        capabilities: JSON.stringify(agentData.capabilities || []),
        endpoints: JSON.stringify(agentData.endpoints || []),
        metadata: JSON.stringify(agentData.metadata || {})
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating agent:', error);
      throw error;
    }

    return {
      ...data,
      config: typeof data.config === 'string' ? JSON.parse(data.config) : data.config,
      capabilities: typeof data.capabilities === 'string' ? JSON.parse(data.capabilities) : data.capabilities,
      endpoints: typeof data.endpoints === 'string' ? JSON.parse(data.endpoints) : data.endpoints,
      metadata: typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata
    };
  } catch (error) {
    console.error('Failed to create agent:', error);
    throw error;
  }
}

export async function updateAgent(id, updates) {
  try {
    const updateData = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.runtime !== undefined) updateData.runtime = updates.runtime;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.version !== undefined) updateData.version = updates.version;
    if (updates.provider !== undefined) updateData.provider = updates.provider;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.container_id !== undefined) updateData.container_id = updates.container_id;
    if (updates.container_name !== undefined) updateData.container_name = updates.container_name;
    if (updates.image_name !== undefined) updateData.image_name = updates.image_name;
    if (updates.port !== undefined) updateData.port = updates.port;
    if (updates.config !== undefined) updateData.config = JSON.stringify(updates.config);
    if (updates.capabilities !== undefined) updateData.capabilities = JSON.stringify(updates.capabilities);
    if (updates.endpoints !== undefined) updateData.endpoints = JSON.stringify(updates.endpoints);
    if (updates.metadata !== undefined) updateData.metadata = JSON.stringify(updates.metadata);
    if (updates.last_health_check !== undefined) updateData.last_health_check = updates.last_health_check;

    const { data, error } = await supabase
      .from(AGENTS_TABLE)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating agent:', error);
      throw error;
    }

    return {
      ...data,
      config: typeof data.config === 'string' ? JSON.parse(data.config) : data.config,
      capabilities: typeof data.capabilities === 'string' ? JSON.parse(data.capabilities) : data.capabilities,
      endpoints: typeof data.endpoints === 'string' ? JSON.parse(data.endpoints) : data.endpoints,
      metadata: typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata
    };
  } catch (error) {
    console.error('Failed to update agent:', error);
    throw error;
  }
}

export async function getAgents() {
  try {
    const { data, error } = await supabase
      .from(AGENTS_TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching agents:', error);
      throw error;
    }

    return data.map(agent => ({
      ...agent,
      config: typeof agent.config === 'string' ? JSON.parse(agent.config) : agent.config,
      capabilities: typeof agent.capabilities === 'string' ? JSON.parse(agent.capabilities) : agent.capabilities,
      endpoints: typeof agent.endpoints === 'string' ? JSON.parse(agent.endpoints) : agent.endpoints,
      metadata: typeof agent.metadata === 'string' ? JSON.parse(agent.metadata) : agent.metadata
    }));
  } catch (error) {
    console.error('Failed to fetch agents:', error);
    return [];
  }
}

export async function deleteAgent(id) {
  try {
    const { error } = await supabase
      .from(AGENTS_TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting agent:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to delete agent:', error);
    throw error;
  }
}

export async function getAgentLogs(agentId, limit = 100) {
  try {
    const { data, error } = await supabase
      .from(AGENT_LOGS_TABLE)
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching agent logs:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch agent logs:', error);
    return [];
  }
}

export async function getAgentMetrics(agentId, limit = 50) {
  try {
    const { data, error } = await supabase
      .from(AGENT_METRICS_TABLE)
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching agent metrics:', error);
      throw error;
    }

    return data.map(metric => ({
      ...metric,
      metadata: typeof metric.metadata === 'string' ? JSON.parse(metric.metadata) : metric.metadata
    })) || [];
  } catch (error) {
    console.error('Failed to fetch agent metrics:', error);
    return [];
  }
}

// Container instance CRUD functions
export async function createContainerInstance(containerData) {
  try {
    const { data, error } = await supabase
      .from(CONTAINER_INSTANCES_TABLE)
      .insert([{
        agent_id: containerData.agent_id,
        container_id: containerData.container_id,
        container_name: containerData.container_name,
        image_name: containerData.image_name,
        status: containerData.status || 'created',
        port_mappings: JSON.stringify(containerData.port_mappings || []),
        environment_vars: JSON.stringify(containerData.environment_vars || {}),
        volumes: JSON.stringify(containerData.volumes || []),
        started_at: containerData.started_at || new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating container instance:', error);
      throw error;
    }

    return {
      ...data,
      port_mappings: typeof data.port_mappings === 'string' ? JSON.parse(data.port_mappings) : data.port_mappings,
      environment_vars: typeof data.environment_vars === 'string' ? JSON.parse(data.environment_vars) : data.environment_vars,
      volumes: typeof data.volumes === 'string' ? JSON.parse(data.volumes) : data.volumes
    };
  } catch (error) {
    console.error('Failed to create container instance:', error);
    throw error;
  }
}

// Log creation function
export async function createLog(logData) {
  try {
    const { data, error } = await supabase
      .from(AGENT_LOGS_TABLE)
      .insert([{
        agent_id: logData.agent_id,
        level: logData.level,
        message: logData.message,
        source: logData.source || 'system',
        metadata: JSON.stringify(logData.metadata || {})
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating log entry:', error);
      throw error;
    }

    return {
      ...data,
      metadata: typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata
    };
  } catch (error) {
    console.error('Failed to create log entry:', error);
    throw error;
  }
}

// Metrics creation function
export async function createMetrics(metricsData) {
  try {
    const { data, error } = await supabase
      .from(AGENT_METRICS_TABLE)
      .insert([{
        agent_id: metricsData.agent_id,
        requests_per_minute: metricsData.requests_per_minute || 0,
        average_response_time: metricsData.average_response_time || 0,
        error_rate: metricsData.error_rate || 0,
        uptime_percentage: metricsData.uptime || 100,
        memory_usage: metricsData.memory_usage || 0,
        cpu_usage: metricsData.cpu_usage || 0,
        network_in: metricsData.network_in || 0,
        network_out: metricsData.network_out || 0
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating metrics entry:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to create metrics entry:', error);
    throw error;
  }
}

// Agent health update function
export async function updateAgentHealth(agentId, healthStatus, lastHealthCheck = new Date().toISOString()) {
  try {
    const { data, error } = await supabase
      .from(AGENTS_TABLE)
      .update({
        health_status: healthStatus,
        last_health_check: lastHealthCheck
      })
      .eq('id', agentId)
      .select()
      .single();

    if (error) {
      console.error('Error updating agent health:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to update agent health:', error);
    throw error;
  }
}

// Marketplace templates functions
export async function getMarketplaceTemplates(filters = {}) {
  try {
    let query = supabase
      .from(MARKETPLACE_TEMPLATES_TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters if provided
    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,tags.cs.{${filters.search}}`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching marketplace templates:', error);
      throw error;
    }

    return data.map(template => ({
      ...template,
      tags: typeof template.tags === 'string' ? JSON.parse(template.tags) : template.tags,
      capabilities: typeof template.capabilities === 'string' ? JSON.parse(template.capabilities) : template.capabilities,
      requirements: typeof template.requirements === 'string' ? JSON.parse(template.requirements) : template.requirements,
      ports: typeof template.ports === 'string' ? JSON.parse(template.ports) : template.ports,
      pricing: typeof template.pricing === 'string' ? JSON.parse(template.pricing) : template.pricing,
      installation: typeof template.installation === 'string' ? JSON.parse(template.installation) : template.installation,
      defaultConfig: typeof template.defaultConfig === 'string' ? JSON.parse(template.defaultConfig) : template.defaultConfig,
      ideIntegration: typeof template.ideIntegration === 'string' ? JSON.parse(template.ideIntegration) : template.ideIntegration
    })) || [];
  } catch (error) {
    console.error('Failed to fetch marketplace templates:', error);
    return [];
  }
}

export async function getMarketplaceTemplate(slug) {
  try {
    const { data, error } = await supabase
      .from(MARKETPLACE_TEMPLATES_TABLE)
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      console.error('Error fetching marketplace template:', error);
      throw error;
    }

    if (!data) {
      return null;
    }

    return {
      ...data,
      tags: typeof data.tags === 'string' ? JSON.parse(data.tags) : data.tags,
      capabilities: typeof data.capabilities === 'string' ? JSON.parse(data.capabilities) : data.capabilities,
      requirements: typeof data.requirements === 'string' ? JSON.parse(data.requirements) : data.requirements,
      ports: typeof data.ports === 'string' ? JSON.parse(data.ports) : data.ports,
      pricing: typeof data.pricing === 'string' ? JSON.parse(data.pricing) : data.pricing,
      installation: typeof data.installation === 'string' ? JSON.parse(data.installation) : data.installation,
      defaultConfig: typeof data.defaultConfig === 'string' ? JSON.parse(data.defaultConfig) : data.defaultConfig,
      ideIntegration: typeof data.ideIntegration === 'string' ? JSON.parse(data.ideIntegration) : data.ideIntegration
    };
  } catch (error) {
    console.error('Failed to fetch marketplace template:', error);
    return null;
  }
}

// Container instances schema
export const CONTAINER_SCHEMA = {
  id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
  agent_id: 'uuid REFERENCES agents(id) ON DELETE CASCADE',
  container_id: 'text NOT NULL',
  container_name: 'text NOT NULL',
  image_name: 'text NOT NULL',
  status: 'text NOT NULL DEFAULT \'created\'',
  port_mappings: 'jsonb DEFAULT \'[]\'',
  environment_vars: 'jsonb DEFAULT \'{}\'',
  volumes: 'jsonb DEFAULT \'[]\'',
  created_at: 'timestamp with time zone DEFAULT now()',
  started_at: 'timestamp with time zone',
  stopped_at: 'timestamp with time zone'
};

