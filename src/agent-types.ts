// Enhanced Agent Registry Types with intelligent deployment support

export type AgentType = 
  | 'mcp_server' 
  | 'ai_agent' 
  | 'automation_tool' 
  | 'testing_framework' 
  | 'ide_extension'
  | 'browser_automation'
  | 'claude_code';

export type AgentStatus = 
  | 'starting' 
  | 'running' 
  | 'stopped' 
  | 'error' 
  | 'deploying';

export type ContainerStatus = 
  | 'created' 
  | 'running' 
  | 'paused' 
  | 'stopped' 
  | 'destroyed'
  | 'not_applicable';

export type DeploymentType = 
  | 'docker'     // Docker container deployment
  | 'npx'        // NPX command execution (MCP servers)
  | 'extension'  // IDE extension installation
  | 'npm'        // NPM package installation
  | 'manual';    // Manual installation required

export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  type: AgentType;
  version: string;
  capabilities: string[];
  config_schema: Record<string, any>;
  default_config: Record<string, any>;
  docker_config?: DockerConfig;
  health_checks?: HealthCheck[];
  dependencies?: string[];
  tags: string[];
  deployment_type?: DeploymentType;
  install_command?: string;
  run_command?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface AgentInstance {
  id: string;
  agent_id: string;
  name: string;
  status: AgentStatus;
  config: Record<string, any>;
  container_id?: string;
  container_status: ContainerStatus;
  ports: Record<string, number>;
  endpoints: Record<string, string>;
  health_status: 'healthy' | 'unhealthy' | 'unknown';
  created_at: string;
  updated_at: string;
  started_at?: string;
  stopped_at?: string;
  last_health_check?: string;
  created_by: string;
  session_id?: string;
}

export interface AgentRegistry {
  agents: Map<string, AgentDefinition>;
  instances: Map<string, AgentInstance>;
  sessions: Map<string, string[]>;
}

export interface DockerConfig {
  image: string;
  tag: string;
  ports: Array<{
    container_port: number;
    host_port?: number;
    protocol: string;
  }>;
  volumes: Array<{
    host_path: string;
    container_path: string;
    mode: string;
  }>;
  environment: Record<string, string>;
  networks: string[];
  restart_policy: string;
  labels: Record<string, string>;
}

export interface HealthCheck {
  name: string;
  type: 'http' | 'tcp' | 'command';
  endpoint?: string;
  command?: string;
  interval_seconds: number;
  timeout_seconds: number;
  retries: number;
}

export interface RegisterAgentRequest {
  name: string;
  description: string;
  type: AgentType;
  capabilities: string[];
  config_schema: Record<string, any>;
  default_config: Record<string, any>;
  docker_config?: DockerConfig;
  health_checks?: HealthCheck[];
  dependencies?: string[];
  tags: string[];
  deployment_type?: DeploymentType;
  install_command?: string;
  run_command?: string;
}

export interface RegisterAgentResponse {
  success: boolean;
  agent_id: string;
  message: string;
  agent?: AgentDefinition;
}

export interface DeployAgentRequest {
  agent_id: string;
  name: string;
  config: Record<string, any>;
  session_id?: string;
}

export interface DeployAgentResponse {
  success: boolean;
  instance_id: string;
  container_id?: string;
  endpoints: Record<string, string>;
  message: string;
  instance?: AgentInstance;
}

export interface AgentStatusResponse {
  instance_id: string;
  status: AgentStatus;
  health_status: 'healthy' | 'unhealthy' | 'unknown';
  endpoints: Record<string, string>;
  metrics: {
    uptime_seconds: number;
    container_status: ContainerStatus;
    last_health_check?: string;
  };
  logs: string[];
}

export interface AgentListResponse {
  agents: AgentDefinition[];
  total: number;
  page: number;
  limit: number;
}

// Event system types
export interface EventMetadata {
  tenant_id: string;
  user_id: string;
  session_id?: string;
  timestamp?: string;
}

export interface Event {
  id: string;
  type: string;
  source: string;
  data: Record<string, any>;
  metadata: EventMetadata;
  timestamp: string;
}

export function createEvent(
  type: string,
  source: string,
  data: Record<string, any>,
  metadata: EventMetadata
): Event {
  return {
    id: generateId(),
    type,
    source,
    data,
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  };
}

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Agent type-specific configuration interfaces
export interface McpServerConfig {
  command: string;
  args: string[];
  env: Record<string, string>;
  capabilities?: string[];
  description?: string;
}

export interface BrowserConfig {
  browserType: 'chrome' | 'firefox' | 'safari' | 'edge';
  headless: boolean;
  viewport: { width: number; height: number };
  userAgent?: string;
  proxy?: {
    server: string;
    username?: string;
    password?: string;
  };
  performance?: {
    slowMo: number;
    timeout: number;
    navigationTimeout: number;
  };
  stealth?: {
    enabled: boolean;
    hideWebdriver: boolean;
    randomizeUserAgent: boolean;
  };
  screenshots?: {
    enabled: boolean;
    quality: number;
    fullPage: boolean;
  };
}

export interface TestFrameworkConfig {
  framework: 'jest' | 'mocha' | 'playwright' | 'cypress';
  testDir: string;
  coverage: boolean;
  parallel: boolean;
  retries: number;
}

export interface IdeExtensionConfig {
  extensionId: string;
  marketplaceUrl?: string;
  autoInstall: boolean;
  settings: Record<string, any>;
  keybindings?: Record<string, string>;
}