import { z } from 'zod';

// Agent Connection Schema
export const insertAgentConnectionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  endpoint: z.string().url('Must be a valid URL'),
  configuration: z.record(z.any()).optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

export type AgentConnection = z.infer<typeof insertAgentConnectionSchema>;

// Computer Use Task Schema
export const computerUseTaskSchema = z.object({
  id: z.string().optional(),
  type: z.string(),
  description: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

export type ComputerUseTask = z.infer<typeof computerUseTaskSchema>;
export const insertComputerUseTaskSchema = computerUseTaskSchema;

// Session Schema
export const insertSessionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Session name is required'),
  browser_type: z.string().default('chrome'),
  status: z.enum(['pending', 'active', 'inactive', 'completed', 'failed']).default('pending'),
  user_id: z.string().optional(),
  configuration: z.record(z.any()).optional(),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

// Script Schema
export const insertScriptSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Script name is required'),
  content: z.string().min(1, 'Script content is required'),
  language: z.string().default('javascript'),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

// Task Schema
export const insertTaskSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  type: z.string().default('automation'),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']).default('pending'),
  description: z.string().optional(),
  configuration: z.record(z.any()).optional(),
  session_id: z.string().optional(),
  user_id: z.string().optional(),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
}).refine((data) => data.name || data.description, {
  message: "Either 'name' or 'description' is required",
  path: ['name'],
});

// Additional common schemas
export const sessionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Session name is required'),
  status: z.enum(['active', 'inactive', 'completed']),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

export type Session = z.infer<typeof sessionSchema>;

export const workflowSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Workflow name is required'),
  description: z.string().optional(),
  steps: z.array(z.any()),
  status: z.enum(['draft', 'active', 'archived']),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

export type Workflow = z.infer<typeof workflowSchema>;

// CRM List Schema
export const insertCrmListSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'List name is required'),
  type: z.string().min(1, 'List type is required'),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
  contacts_count: z.number().default(0),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

export type CrmList = z.infer<typeof insertCrmListSchema>;

// Company Schema
export const insertCompanySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Company name is required'),
  domain: z.string().optional(),
  industry: z.string().optional(),
  size: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  website: z.string().optional(),
  linkedin: z.string().optional(),
  status: z.enum(['active', 'inactive', 'prospect']).default('active'),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

export type Company = z.infer<typeof insertCompanySchema>;

// Contact Schema
export const insertContactSchema = z.object({
  id: z.string().optional(),
  company_id: z.string().optional(),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Must be a valid email').optional(),
  phone: z.string().optional(),
  title: z.string().optional(),
  department: z.string().optional(),
  linkedin: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive', 'prospect']).default('active'),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

export type Contact = z.infer<typeof insertContactSchema>;

// Unified Event Schema
export const unifiedEventSchema = z.object({
  id: z.string().optional(),
  type: z.string().min(1, 'Event type is required'),
  source: z.string().min(1, 'Event source is required'),
  data: z.record(z.any()).optional(),
  timestamp: z.date().optional(),
  session_id: z.string().optional(),
  user_id: z.string().optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).default('pending'),
});

export type UnifiedEvent = z.infer<typeof unifiedEventSchema>;

// Additional exports for backward compatibility
export const agentConnections = insertAgentConnectionSchema;
export const insertUnifiedEventSchema = unifiedEventSchema;
export const unifiedEvents = unifiedEventSchema;

// Additional type exports that might be missing
export type User = z.infer<typeof insertSessionSchema> & { id: string; username: string; password?: string; apiKey?: string; createdAt: Date };
export type InsertUser = Omit<User, 'createdAt'> & { id?: string; apiKey?: string };
export type Script = z.infer<typeof insertScriptSchema> & { id: string; userId: string; createdAt: Date; updatedAt: Date };
export type Task = z.infer<typeof insertTaskSchema> & { id: string; userId: string; createdAt: Date; updatedAt: Date };
export type InsertTask = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;
export type Metrics = { id: string; userId: string; sessionsCreated: number; tasksCompleted: number; lastActivity: Date };
export type FieldMapping = { id: string; userId: string; sourceField: string; targetField: string; transformation?: string };
export type InsertFieldMapping = Omit<FieldMapping, 'id'>;