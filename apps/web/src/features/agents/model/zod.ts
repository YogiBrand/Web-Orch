```typescript
import { z } from 'zod';

// Zod schema for AgentConfig
export const AgentConfigSchema = z.object({
  base_url: z.string().url().optional(),
  protocol: z.enum(['http', 'https', 'ws', 'wss']).default('http'),
  port: z.number().int().min(1).max(65535).optional(),
  ws_namespace: z.string().optional(),
  timeout: z.number().int().min(1000).default(30000),
  concurrency: z.number().int().min(1).default(1),
  credentials: z.record(z.string(), z.string()).optional(),
});

// Zod schema for Agent
export const AgentSchema = z.object({
  id: z.string().uuid().optional(), // Optional for creation
  name: z.string().min(1, 'Agent name is required'),
  type: z.string(),
  runtime: z.enum(['local', 'hosted']),
  status: z.enum(['running', 'stopped', 'error', 'deploying']).default('stopped'),
  version: z.string().default('1.0.0'),
  latency: z.number().optional(),
  provider: z.string().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  config: AgentConfigSchema.optional(),
  capabilities: z.array(z.string()).default([]),
  endpoints: z.array(z.string().url()).optional(),
  credentials: z.record(z.string(), z.string()).optional(),
});

// Zod schema for MarketplaceTemplate (read-only)
export const MarketplaceTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  longDescription: z.string(),
  provider: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
  logoUrl: z.string().url().optional(),
  version: z.string(),
  rating: z.number().min(0).max(5),
  reviews: z.number().int().min(0),
  downloads: z.number().int().min(0),
  runtime: z.enum(['local', 'hosted']),
  capabilities: z.array(z.string()),
  requirements: z.array(z.string()),
  ports: z.object({
    default: z.number().int().min(1).max(65535),
    additional: z.array(z.number().int().min(1).max(65535)).optional(),
  }).optional(),
  pricing: z.object({
    free: z.boolean(),
    plans: z.array(z.object({
      name: z.string(),
      price: z.string(),
      features: z.array(z.string()),
    })).optional(),
  }).optional(),
  installation: z.object({
    steps: z.array(z.string()),
    notes: z.array(z.string()).optional(),
  }),
  documentation: z.string().url(),
  defaultConfig: AgentConfigSchema.partial().optional(),
});

// Zod schema for API responses
export const AgentListResponseSchema = z.array(AgentSchema);
export const AgentGetResponseSchema = AgentSchema;
export const AgentCreateResponseSchema = z.object({
  success: z.boolean(),
  agentId: z.string().uuid(),
  message: z.string().optional(),
});
export const AgentUpdateResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
export const AgentDeleteResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
export const AgentActionResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  status: z.enum(['running', 'stopped', 'error', 'deploying']).optional(),
});
export const AgentTestResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  results: z.array(z.object({
    name: z.string(),
    status: z.enum(['pending', 'success', 'error']),
    message: z.string().optional(),
    latency: z.number().optional(),
  })).optional(),
});

export const MarketplaceCatalogResponseSchema = z.array(MarketplaceTemplateSchema);
export const MarketplaceTemplateGetResponseSchema = MarketplaceTemplateSchema.nullable();
export const MarketplaceInstallResponseSchema = z.object({
  success: z.boolean(),
  agentId: z.string().uuid().optional(),
  message: z.string().optional(),
});
```