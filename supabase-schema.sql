-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- ========================================
-- CORE AGENT AND PROJECT TABLES
-- ========================================

-- Agents table (aligned with Agent interface)
create table if not exists public.agents (
  id text primary key,
  name text not null,
  type text not null check (type in ('api', 'mcp', 'webhook', 'local', 'internal')),
  status text not null check (status in ('online', 'offline', 'connecting', 'error', 'active', 'inactive')),
  endpoint text,
  api_key text,
  capabilities text[] default '{}',
  description text not null,
  model text,
  provider text,
  config jsonb default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_seen timestamp with time zone,
  stats jsonb default '{"totalRequests": 0, "successfulRequests": 0, "averageResponseTime": 0}'
);

-- Projects table (aligned with Project interface)
create table if not exists public.projects (
  id text primary key,
  name text not null,
  description text not null,
  status text not null check (status in ('active', 'paused', 'completed', 'archived')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  assigned_agents text[] default '{}',
  settings jsonb default '{}'
);

-- ========================================
-- AUTOMATION AND TASK TABLES
-- ========================================

-- Form submissions table for tracking automation
create table if not exists public.form_submissions (
  id text primary key,
  url text not null,
  status text not null check (status in ('pending', 'running', 'completed', 'failed')),
  progress integer default 0,
  fields_count integer default 0,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  agent_id text references agents(id),
  results jsonb default '{}',
  custom_data text,
  error_message text
);

-- Task executions table for project tracking
create table if not exists public.task_executions (
  id text primary key,
  project_id text references projects(id) on delete cascade,
  agent_id text references agents(id),
  task_name text not null,
  status text not null check (status in ('pending', 'running', 'completed', 'failed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone,
  results jsonb default '{}',
  error_message text
);

-- ========================================
-- SESSION AND WORKFLOW TABLES
-- ========================================

-- Sessions table (from schema.ts)
create table if not exists public.sessions (
  id text primary key,
  name text not null,
  browser_type text default 'chrome',
  status text not null check (status in ('pending', 'active', 'inactive', 'completed', 'failed')),
  user_id text,
  configuration jsonb default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tasks table (from schema.ts)
create table if not exists public.tasks (
  id text primary key,
  name text,
  type text default 'automation',
  status text not null check (status in ('pending', 'running', 'completed', 'failed', 'cancelled')),
  description text,
  configuration jsonb default '{}',
  session_id text references sessions(id),
  user_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Scripts table (from schema.ts)
create table if not exists public.scripts (
  id text primary key,
  name text not null,
  content text not null,
  language text default 'javascript',
  description text,
  status text not null check (status in ('draft', 'active', 'archived')),
  user_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ========================================
-- CRM AND BUSINESS TABLES
-- ========================================

-- CRM Lists table (from schema.ts)
create table if not exists public.crm_lists (
  id text primary key,
  name text not null,
  type text not null,
  description text,
  status text not null check (status in ('active', 'inactive', 'archived')),
  contacts_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Companies table (from schema.ts)
create table if not exists public.companies (
  id text primary key,
  name text not null,
  domain text,
  industry text,
  size text,
  location text,
  description text,
  website text,
  linkedin text,
  status text not null check (status in ('active', 'inactive', 'prospect')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Contacts table (from schema.ts)
create table if not exists public.contacts (
  id text primary key,
  company_id text references companies(id),
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  title text,
  department text,
  linkedin text,
  notes text,
  status text not null check (status in ('active', 'inactive', 'prospect')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ========================================
-- EVENT AND MONITORING TABLES
-- ========================================

-- Unified Events table (from schema.ts)
create table if not exists public.unified_events (
  id text primary key,
  type text not null,
  source text not null,
  data jsonb default '{}',
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  session_id text references sessions(id),
  user_id text,
  status text not null check (status in ('pending', 'processing', 'completed', 'failed'))
);

-- Agent Connections table (from schema.ts)
create table if not exists public.agent_connections (
  id text primary key,
  name text not null,
  type text not null,
  endpoint text not null,
  configuration jsonb default '{}',
  status text not null check (status in ('active', 'inactive')),
  user_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Computer Use Tasks table (from schema.ts)
create table if not exists public.computer_use_tasks (
  id text primary key,
  type text not null,
  description text not null,
  status text not null check (status in ('pending', 'running', 'completed', 'failed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ========================================
-- USER AND METRICS TABLES
-- ========================================

-- Users table
create table if not exists public.users (
  id text primary key,
  username text not null unique,
  password text,
  api_key text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Metrics table
create table if not exists public.metrics (
  id text primary key,
  user_id text references users(id),
  sessions_created integer default 0,
  tasks_completed integer default 0,
  last_activity timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Field Mappings table
create table if not exists public.field_mappings (
  id text primary key,
  user_id text references users(id),
  source_field text not null,
  target_field text not null,
  transformation text
);

-- ========================================
-- ROW LEVEL SECURITY
-- ========================================

alter table public.agents enable row level security;
alter table public.projects enable row level security;
alter table public.form_submissions enable row level security;
alter table public.task_executions enable row level security;
alter table public.sessions enable row level security;
alter table public.tasks enable row level security;
alter table public.scripts enable row level security;
alter table public.crm_lists enable row level security;
alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.unified_events enable row level security;
alter table public.agent_connections enable row level security;
alter table public.computer_use_tasks enable row level security;
alter table public.users enable row level security;
alter table public.metrics enable row level security;
alter table public.field_mappings enable row level security;

-- ========================================
-- POLICIES (DEVELOPMENT - ALLOW ALL)
-- ========================================

create policy "Allow all operations on agents" on public.agents for all using (true);
create policy "Allow all operations on projects" on public.projects for all using (true);
create policy "Allow all operations on form_submissions" on public.form_submissions for all using (true);
create policy "Allow all operations on task_executions" on public.task_executions for all using (true);
create policy "Allow all operations on sessions" on public.sessions for all using (true);
create policy "Allow all operations on tasks" on public.tasks for all using (true);
create policy "Allow all operations on scripts" on public.scripts for all using (true);
create policy "Allow all operations on crm_lists" on public.crm_lists for all using (true);
create policy "Allow all operations on companies" on public.companies for all using (true);
create policy "Allow all operations on contacts" on public.contacts for all using (true);
create policy "Allow all operations on unified_events" on public.unified_events for all using (true);
create policy "Allow all operations on agent_connections" on public.agent_connections for all using (true);
create policy "Allow all operations on computer_use_tasks" on public.computer_use_tasks for all using (true);
create policy "Allow all operations on users" on public.users for all using (true);
create policy "Allow all operations on metrics" on public.metrics for all using (true);
create policy "Allow all operations on field_mappings" on public.field_mappings for all using (true);

-- ========================================
-- PERFORMANCE INDEXES
-- ========================================

-- Core table indexes
create index if not exists agents_type_idx on public.agents(type);
create index if not exists agents_status_idx on public.agents(status);
create index if not exists projects_status_idx on public.projects(status);
create index if not exists form_submissions_status_idx on public.form_submissions(status);
create index if not exists form_submissions_agent_idx on public.form_submissions(agent_id);
create index if not exists task_executions_project_idx on public.task_executions(project_id);
create index if not exists task_executions_agent_idx on public.task_executions(agent_id);

-- Session and task indexes
create index if not exists sessions_status_idx on public.sessions(status);
create index if not exists sessions_user_idx on public.sessions(user_id);
create index if not exists tasks_status_idx on public.tasks(status);
create index if not exists tasks_session_idx on public.tasks(session_id);
create index if not exists tasks_user_idx on public.tasks(user_id);

-- CRM indexes
create index if not exists companies_status_idx on public.companies(status);
create index if not exists contacts_company_idx on public.contacts(company_id);
create index if not exists contacts_status_idx on public.contacts(status);

-- Event and monitoring indexes
create index if not exists unified_events_type_idx on public.unified_events(type);
create index if not exists unified_events_timestamp_idx on public.unified_events(timestamp);
create index if not exists unified_events_session_idx on public.unified_events(session_id);
create index if not exists agent_connections_status_idx on public.agent_connections(status);
create index if not exists computer_use_tasks_status_idx on public.computer_use_tasks(status);

-- ========================================
-- FUNCTIONS AND TRIGGERS
-- ========================================

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at fields
create trigger handle_agents_updated_at before update on public.agents for each row execute procedure public.handle_updated_at();
create trigger handle_projects_updated_at before update on public.projects for each row execute procedure public.handle_updated_at();
create trigger handle_sessions_updated_at before update on public.sessions for each row execute procedure public.handle_updated_at();
create trigger handle_tasks_updated_at before update on public.tasks for each row execute procedure public.handle_updated_at();
create trigger handle_scripts_updated_at before update on public.scripts for each row execute procedure public.handle_updated_at();
create trigger handle_crm_lists_updated_at before update on public.crm_lists for each row execute procedure public.handle_updated_at();
create trigger handle_companies_updated_at before update on public.companies for each row execute procedure public.handle_updated_at();
create trigger handle_contacts_updated_at before update on public.contacts for each row execute procedure public.handle_updated_at();
create trigger handle_agent_connections_updated_at before update on public.agent_connections for each row execute procedure public.handle_updated_at();
create trigger handle_computer_use_tasks_updated_at before update on public.computer_use_tasks for each row execute procedure public.handle_updated_at();

-- ========================================
-- INITIAL DATA SEEDING
-- ========================================

-- Insert default agents
insert into public.agents (id, name, type, status, capabilities, description, config)
values 
  ('hybrid-ai', 'Hybrid AI Agent', 'internal', 'active', 
   array['form-automation', 'browser-automation', 'ai-vision'], 
   'Advanced hybrid AI agent for comprehensive automation tasks',
   '{"temperature": 0.7, "max_tokens": 2000}'::jsonb),
  ('ai-vision', 'AI Vision Agent', 'internal', 'active',
   array['form-automation', 'screenshot-analysis', 'ai-vision'],
   'Specialized AI agent for visual analysis and form automation',
   '{"vision_model": "gpt-4-vision", "analysis_depth": "detailed"}'::jsonb),
  ('skyvern', 'Skyvern Agent', 'internal', 'active',
   array['form-automation', 'browser-automation'],
   'High-performance browser automation agent',
   '{"browser": "chrome", "headless": true}'::jsonb),
  ('claude-code', 'Claude Code IDE', 'api', 'offline',
   array['code-generation', 'debugging', 'testing', 'documentation'],
   'Advanced AI coding assistant for development tasks',
   '{"model": "claude-3-sonnet-20240229", "temperature": 0.1, "max_tokens": 4000}'::jsonb),
  ('openai-gpt4', 'OpenAI GPT-4', 'api', 'offline',
   array['general-ai', 'reasoning', 'writing', 'analysis'],
   'Advanced general-purpose AI assistant',
   '{"model": "gpt-4", "temperature": 0.7, "max_tokens": 2000}'::jsonb)
on conflict (id) do nothing;

-- Insert sample project
insert into public.projects (id, name, description, status, assigned_agents, settings)
values 
  ('default-project', 'WebOrchestrator Demo Project', 
   'Demonstration project showcasing agent capabilities', 'active',
   array['hybrid-ai', 'ai-vision', 'skyvern'],
   '{"auto_assign": true, "priority": "high"}'::jsonb)
on conflict (id) do nothing;

-- ========================================
-- DATABASE TYPE GENERATION
-- ========================================

-- Create a comprehensive type definition view for TypeScript generation
create or replace view public.database_types as
select 
  'agents' as table_name,
  jsonb_build_object(
    'id', 'text',
    'name', 'text',
    'type', 'text',
    'status', 'text',
    'endpoint', 'text',
    'api_key', 'text',
    'capabilities', 'text[]',
    'description', 'text',
    'model', 'text',
    'provider', 'text',
    'config', 'jsonb',
    'created_at', 'timestamp with time zone',
    'updated_at', 'timestamp with time zone',
    'last_seen', 'timestamp with time zone',
    'stats', 'jsonb'
  ) as columns
union all
select 
  'projects' as table_name,
  jsonb_build_object(
    'id', 'text',
    'name', 'text', 
    'description', 'text',
    'status', 'text',
    'created_at', 'timestamp with time zone',
    'updated_at', 'timestamp with time zone',
    'assigned_agents', 'text[]',
    'settings', 'jsonb'
  ) as columns;