export interface Agent {
  id: string;
  name: string;
  type: string;
  runtime: 'local' | 'hosted';
  status: 'running' | 'stopped' | 'error' | 'deploying';
  version: string;
  latency?: number;
  provider: string;
  created_at: string;
  updated_at: string;
  config: AgentConfig;
  capabilities: string[];
  endpoints?: string[];
}

export interface AgentConfig {
  base_url?: string;
  protocol?: 'http' | 'https' | 'ws' | 'wss';
  port?: number;
  ws_namespace?: string;
  timeout?: number;
  concurrency?: number;
  credentials?: Record<string, string>;
}

export interface MarketplaceTemplate {
  id: string;
  name: string;
  slug: string;
  description: string;
  longDescription: string;
  provider: string;
  category: string;
  tags: string[];
  logoUrl?: string;
  version: string;
  rating: number;
  reviews: number;
  downloads: number;
  runtime: 'local' | 'hosted';
  capabilities: string[];
  requirements: string[];
  ports?: {
    default: number;
    additional?: number[];
  };
  pricing?: {
    free: boolean;
    plans?: Array<{
      name: string;
      price: string;
      features: string[];
    }>;
  };
  installation: {
    steps: string[];
    notes?: string[];
  };
  documentation: string;
  defaultConfig: Partial<AgentConfig>;
  created_at: string;
  updated_at?: string;
}

export interface WizardData {
  template?: MarketplaceTemplate;
  runtime: 'local' | 'hosted' | 'docker';
  credentials: Record<string, string>;
  config: Partial<AgentConfig>;
  testResults?: any;
  mcpConfig?: {
    command: string;
    args: string[];
    env: Record<string, string>;
    capabilities?: string[];
    description?: string;
  };
  ideIntegration?: {
    ides?: string[];
    primary?: string | null;
    env?: Record<string, string>;
  };
  ideConfig?: {
    autoInstall: boolean;
    settings?: Record<string, any>;
    keybindings?: Record<string, string>;
  };
  browserConfig?: {
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
  };
  testConfig?: {
    framework: 'jest' | 'mocha' | 'playwright' | 'cypress';
    testDir: string;
    coverage: boolean;
    parallel: boolean;
    retries: number;
  };
  environmentConfig?: {
    nodeVersion?: string;
    pythonVersion?: string;
    dependencies?: string[];
    devDependencies?: string[];
    scripts?: Record<string, string>;
  };
  installationMethod?: {
    type: 'npm' | 'yarn' | 'pip' | 'docker' | 'extension' | 'manual';
    autoInstall: boolean;
    postInstallSteps?: string[];
  };
}

