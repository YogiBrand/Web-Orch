# 🚀 Supabase Setup Guide for WebOrchestrator

This guide explains how to set up Supabase for the WebOrchestrator AI workspace system.

## Quick Setup

### 1. Install Supabase CLI (Optional - for local development)
```bash
npm install -g @supabase/cli
```

### 2. Initialize Local Supabase (Optional)
```bash
supabase init
supabase start
```

### 3. Database Schema Setup

Run the following SQL in your Supabase SQL Editor or via the CLI:

```sql
-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Agents table
create table if not exists public.agents (
  id text primary key,
  name text not null,
  type text not null check (type in ('api', 'mcp', 'webhook', 'local')),
  status text not null check (status in ('online', 'offline', 'connecting', 'error')),
  endpoint text,
  api_key text,
  capabilities text[] default '{}',
  description text not null,
  model text,
  provider text,
  config jsonb default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_seen timestamp with time zone,
  stats jsonb default '{"totalRequests": 0, "successfulRequests": 0, "averageResponseTime": 0}'
);

-- Projects table
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

-- Form submissions table
create table if not exists public.form_submissions (
  id text primary key,
  url text not null,
  status text not null check (status in ('pending', 'running', 'completed', 'failed')),
  progress integer default 0,
  fields_count integer default 0,
  fields_completed integer default 0,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone,
  agent_id text references agents(id),
  results jsonb default '{}',
  custom_data text,
  error_message text
);

-- Task executions table
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

-- Row Level Security
alter table public.agents enable row level security;
alter table public.projects enable row level security;
alter table public.form_submissions enable row level security;
alter table public.task_executions enable row level security;

-- Policies (allow all for development - adjust for production)
create policy "Allow all operations on agents" on public.agents for all using (true);
create policy "Allow all operations on projects" on public.projects for all using (true);
create policy "Allow all operations on form_submissions" on public.form_submissions for all using (true);
create policy "Allow all operations on task_executions" on public.task_executions for all using (true);

-- Indexes for performance
create index if not exists agents_type_idx on public.agents(type);
create index if not exists agents_status_idx on public.agents(status);
create index if not exists projects_status_idx on public.projects(status);
create index if not exists form_submissions_status_idx on public.form_submissions(status);
create index if not exists form_submissions_agent_idx on public.form_submissions(agent_id);
create index if not exists task_executions_project_idx on public.task_executions(project_id);
create index if not exists task_executions_agent_idx on public.task_executions(agent_id);

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Trigger to automatically update updated_at
create trigger handle_projects_updated_at
  before update on public.projects
  for each row execute procedure public.handle_updated_at();
```

### 4. Environment Variables

Create a `.env.local` file in your client directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

For local development, the default values are:
```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

## Features

### ✅ Real Agent Management
- Store and manage AI agents (API, MCP, webhook, local)
- Real-time agent status tracking
- Agent health monitoring
- Performance statistics

### ✅ Project Management
- Create and manage projects
- Assign agents to projects
- Track project progress
- Project settings and configuration

### ✅ Form Submission Automation
- AI-powered form submission
- Progress tracking
- Result storage
- Error handling and retry logic

### ✅ Task Execution Tracking
- Track individual task executions
- Link tasks to projects and agents
- Store execution results
- Error logging

## Fallback System

The system includes automatic fallback to localStorage if Supabase is unavailable:

1. **Development Mode**: Automatically uses localStorage if Supabase connection fails
2. **Production Mode**: Attempts Supabase first, falls back to localStorage
3. **Data Sync**: Automatically syncs localStorage data when Supabase becomes available

## Usage

The Supabase integration is automatically initialized when you import the services:

```typescript
import { supabaseAgentRegistry } from '@/lib/supabase-agent-registry';
import { supabaseFormSubmissionService } from '@/lib/supabase-form-submission';

// Agents
const agents = await supabaseAgentRegistry.getAllAgents();
const newAgent = await supabaseAgentRegistry.addAgent({
  name: 'My AI Agent',
  type: 'api',
  // ... other properties
});

// Form Submissions
const job = await supabaseFormSubmissionService.startSubmission({
  url: 'https://example.com/form',
  agentId: 'agent-id'
});
```

## Production Notes

1. **Row Level Security**: Update RLS policies for production use
2. **API Keys**: Store sensitive API keys securely
3. **Rate Limiting**: Implement rate limiting for API endpoints
4. **Monitoring**: Set up monitoring and alerting
5. **Backups**: Configure automatic backups

## Troubleshooting

### Common Issues

1. **Connection Failed**: Check your Supabase URL and keys
2. **Table Not Found**: Run the SQL schema setup script
3. **Permission Denied**: Check RLS policies
4. **Data Not Syncing**: Check network connectivity

### Support

For issues and questions:
1. Check the browser console for error messages
2. Verify Supabase dashboard for table structure
3. Test connection with simple queries
4. Review the fallback localStorage data

## Migration

To migrate from localStorage to Supabase:

1. Export existing data using the export functions
2. Set up Supabase tables
3. Import data using the import functions
4. Verify data integrity
5. Switch to Supabase configuration