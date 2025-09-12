import { supabase, AGENTS_TABLE, AGENT_LOGS_TABLE, AGENT_METRICS_TABLE, CONTAINER_INSTANCES_TABLE, MARKETPLACE_TEMPLATES_TABLE, MARKETPLACE_TEMPLATE_SCHEMA } from './supabase-config.js';
import { SUPABASE_CONFIG } from './supabase-env.js';

async function initializeDatabase() {
  console.log('🚀 Initializing Supabase Database...');
  console.log('🔧 Current Supabase Configuration:');
  console.log('   URL:', SUPABASE_CONFIG.url);
  console.log('   Key configured:', SUPABASE_CONFIG.anonKey !== 'your-anon-key-here');

  if (SUPABASE_CONFIG.anonKey === 'your-anon-key-here' || SUPABASE_CONFIG.url === 'https://your-project-id.supabase.co') {
    console.log('\n❌ Supabase not configured!');
    console.log('📋 Please set up your Supabase credentials:');
    console.log('   1. Go to https://supabase.com/dashboard');
    console.log('   2. Create a new project or use existing one');
    console.log('   3. Copy Project URL and anon key from Project Settings > API');
    console.log('   4. Set environment variables:');
    console.log('      export SUPABASE_URL=https://your-project-id.supabase.co');
    console.log('      export SUPABASE_ANON_KEY=your-anon-key-here');
    console.log('   5. Or edit supabase-env.js with your credentials');
    console.log('   6. Run this script again');
    process.exit(1);
  }

  console.log('✅ Supabase configuration looks good!\n');

  try {
    // Create agents table
    console.log('📋 Creating agents table...');
    const { error: agentsError } = await supabase.rpc('create_agents_table');
    if (agentsError && !agentsError.message.includes('already exists')) {
      console.error('❌ Failed to create agents table:', agentsError);
    } else {
      console.log('✅ Agents table created/verified');
    }

    // Create agent_logs table
    console.log('📝 Creating agent_logs table...');
    const { error: logsError } = await supabase.rpc('create_agent_logs_table');
    if (logsError && !logsError.message.includes('already exists')) {
      console.error('❌ Failed to create agent_logs table:', logsError);
    } else {
      console.log('✅ Agent logs table created/verified');
    }

    // Create agent_metrics table
    console.log('📊 Creating agent_metrics table...');
    const { error: metricsError } = await supabase.rpc('create_agent_metrics_table');
    if (metricsError && !metricsError.message.includes('already exists')) {
      console.error('❌ Failed to create agent_metrics table:', metricsError);
    } else {
      console.log('✅ Agent metrics table created/verified');
    }

    // Create container_instances table
    console.log('🐳 Creating container_instances table...');
    const { error: containerError } = await supabase.rpc('create_container_instances_table');
    if (containerError && !containerError.message.includes('already exists')) {
      console.error('❌ Failed to create container_instances table:', containerError);
    } else {
      console.log('✅ Container instances table created/verified');
    }

    // Create marketplace_templates table
    console.log('🏪 Creating marketplace_templates table...');
    const { error: templatesError } = await supabase.rpc('create_marketplace_templates_table');
    if (templatesError && !templatesError.message.includes('already exists')) {
      console.error('❌ Failed to create marketplace_templates table:', templatesError);
    } else {
      console.log('✅ Marketplace templates table created/verified');
    }

    // Insert marketplace templates
    console.log('📦 Inserting marketplace templates...');
    const marketplaceTemplates = [
      {
        id: 'mcp-filesystem',
        name: 'MCP Filesystem Server',
        slug: 'mcp-filesystem',
        description: 'File system operations server for MCP protocol',
        longDescription: 'A Model Context Protocol server that provides secure file system operations including read, write, list, and search capabilities for local and remote file systems.',
        provider: 'Anthropic',
        category: 'MCP Server',
        tags: ['mcp', 'filesystem', 'file-operations', 'security', 'docker'],
        logoUrl: 'https://images.pexels.com/photos/1181677/pexels-photo-1181677.jpeg?auto=compress&cs=tinysrgb&w=160&h=160&fit=crop',
        version: '1.0.0',
        rating: 4.8,
        reviews: 156,
        downloads: 12450,
        runtime: 'docker',
        capabilities: ['File Read/Write', 'Directory Operations', 'File Search', 'Permission Management'],
        requirements: ['Docker installed', 'File system access', 'Network connectivity'],
        ports: { default: 3000 },
        pricing: { free: true },
        installation: {
          steps: [
            'Pull Docker image: docker pull mcp/filesystem-server:latest',
            'Run container: docker run -d -p 3000:3000 -v /host/path:/container/path mcp/filesystem-server',
            'Configure access permissions and security policies',
            'Test file operations through MCP protocol'
          ]
        },
        documentation: 'https://docs.anthropic.com/mcp/servers/filesystem',
        defaultConfig: {
          protocol: 'http',
          port: 3000,
          timeout: 30000,
          concurrency: 10
        },
        ideIntegration: {
          supportedIdes: ['claude', 'vscode', 'cursor', 'windsurf'],
          configTemplates: {
            claude: {
              command: 'docker',
              args: ['exec', '${CONTAINER_ID}', 'node', '/app/server.js'],
              env: {}
            },
            vscode: {
              command: 'docker',
              args: ['exec', '${CONTAINER_ID}', 'node', '/app/server.js'],
              env: {}
            },
            cursor: {
              command: 'docker',
              args: ['exec', '${CONTAINER_ID}', 'node', '/app/server.js'],
              env: {}
            }
          }
        }
      },
      {
        id: 'mcp-github',
        name: 'MCP GitHub Server',
        slug: 'mcp-github',
        description: 'GitHub integration server for MCP protocol',
        longDescription: 'Access GitHub repositories, issues, pull requests, and workflows through the Model Context Protocol. Perfect for AI assistants that need to interact with GitHub.',
        provider: 'Anthropic',
        category: 'MCP Server',
        tags: ['mcp', 'github', 'git', 'collaboration', 'docker'],
        logoUrl: 'https://images.pexels.com/photos/1181263/pexels-photo-1181263.jpeg?auto=compress&cs=tinysrgb&w=160&h=160&fit=crop',
        version: '1.2.0',
        rating: 4.7,
        reviews: 203,
        downloads: 18750,
        runtime: 'docker',
        capabilities: ['Repository Access', 'Issue Management', 'PR Operations', 'Workflow Control'],
        requirements: ['Docker installed', 'GitHub API token', 'Network access'],
        ports: { default: 3001 },
        pricing: { free: true },
        installation: {
          steps: [
            'Pull Docker image: docker pull mcp/github-server:latest',
            'Run container: docker run -d -p 3001:3001 -e GITHUB_TOKEN=your_token mcp/github-server',
            'Configure repository access permissions',
            'Test GitHub API integration'
          ]
        },
        documentation: 'https://docs.anthropic.com/mcp/servers/github',
        defaultConfig: {
          protocol: 'http',
          port: 3001,
          timeout: 30000,
          concurrency: 5
        }
      },
      {
        id: 'mcp-slack',
        name: 'MCP Slack Server',
        slug: 'mcp-slack',
        description: 'Slack integration server for MCP protocol',
        longDescription: 'Connect AI assistants to Slack workspaces for real-time communication, channel management, and message processing through the Model Context Protocol.',
        provider: 'Anthropic',
        category: 'MCP Server',
        tags: ['mcp', 'slack', 'communication', 'real-time', 'docker'],
        logoUrl: 'https://images.pexels.com/photos/1181391/pexels-photo-1181391.jpeg?auto=compress&cs=tinysrgb&w=160&h=160&fit=crop',
        version: '1.1.0',
        rating: 4.6,
        reviews: 178,
        downloads: 15600,
        runtime: 'docker',
        capabilities: ['Message Processing', 'Channel Management', 'User Interactions', 'Real-time Events'],
        requirements: ['Docker installed', 'Slack API token', 'Workspace access'],
        ports: { default: 3002 },
        pricing: { free: true },
        installation: {
          steps: [
            'Pull Docker image: docker pull mcp/slack-server:latest',
            'Run container: docker run -d -p 3002:3002 -e SLACK_TOKEN=your_token mcp/slack-server',
            'Configure Slack app permissions and event subscriptions',
            'Test real-time message processing'
          ]
        },
        documentation: 'https://docs.anthropic.com/mcp/servers/slack',
        defaultConfig: {
          protocol: 'http',
          port: 3002,
          timeout: 30000,
          concurrency: 5
        }
      },
      {
        id: 'claude-code',
        name: 'Claude Code Assistant',
        slug: 'claude-code',
        description: 'AI-powered coding assistant with MCP server integration for enhanced development',
        longDescription: 'AI-powered coding assistant with MCP server integration for enhanced development workflows and intelligent code assistance.',
        provider: 'Anthropic',
        category: 'IDE Client',
        tags: ['claude', 'ai-assistant', 'coding', 'mcp-client', 'development'],
        logoUrl: 'https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg?auto=compress&cs=tinysrgb&w=160&h=160&fit=crop',
        version: '0.1.8',
        rating: 4.9,
        reviews: 2105,
        downloads: 15430,
        runtime: 'docker',
        capabilities: ['Code Generation', 'Debugging Assistance', 'Code Review', 'Documentation', 'MCP Integration'],
        requirements: ['Claude API Key', 'Docker', 'Node.js 18+'],
        ports: { default: 3006 },
        pricing: { free: true },
        installation: {
          steps: [
            'Pull Docker image: docker pull anthropic/claude-code:latest',
            'Run container: docker run -d -p 3006:3006 -e CLAUDE_API_KEY=your_key anthropic/claude-code',
            'Configure MCP server connections',
            'Test AI assistance features'
          ]
        },
        documentation: 'https://docs.anthropic.com/claude/code',
        defaultConfig: {
          protocol: 'http',
          port: 3006,
          timeout: 60000,
          concurrency: 1
        }
      },
      {
        id: 'ollama-server',
        name: 'Ollama LLM Server',
        slug: 'ollama-server',
        description: 'Run large language models locally with MCP integration',
        longDescription: 'Run large language models locally with MCP integration for enhanced AI capabilities and seamless IDE integration.',
        provider: 'Ollama Team',
        category: 'AI Agent',
        tags: ['ollama', 'llm', 'local-ai', 'mcp-compatible', 'privacy'],
        logoUrl: 'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=160&h=160&fit=crop',
        version: '0.1.17',
        rating: 4.8,
        reviews: 3241,
        downloads: 28750,
        runtime: 'docker',
        capabilities: ['Local LLM Inference', 'Multiple Model Support', 'REST API', 'Streaming Responses', 'MCP Compatible'],
        requirements: ['Docker', 'GPU Support (optional)', 'Large Storage'],
        ports: { default: 11434 },
        pricing: { free: true },
        installation: {
          steps: [
            'Pull Docker image: docker pull ollama/ollama:latest',
            'Run container: docker run -d -p 11434:11434 -v ollama:/root/.ollama ollama/ollama',
            'Pull models: docker exec -it ollama-container ollama pull llama2',
            'Test API endpoints'
          ]
        },
        documentation: 'https://github.com/jmorganca/ollama',
        defaultConfig: {
          protocol: 'http',
          port: 11434,
          timeout: 300000,
          concurrency: 1
        }
      }
    ];

    for (const template of marketplaceTemplates) {
      const { error } = await supabase.from(MARKETPLACE_TEMPLATES_TABLE).upsert([template], { onConflict: 'id' });
      if (error) {
        console.error(`❌ Failed to insert template ${template.name}:`, error);
      } else {
        console.log(`✅ Template ${template.name} inserted/updated`);
      }
    }

    console.log('✅ Marketplace templates populated successfully');

    // Insert sample agents
    console.log('🤖 Inserting sample agents...');
    const sampleAgents = [
      {
        name: 'MCP Filesystem Server',
        type: 'mcp-server',
        runtime: 'docker',
        status: 'running',
        version: '1.0.0',
        provider: 'Anthropic',
        category: 'MCP Server',
        description: 'File system operations server for MCP protocol',
        container_id: 'mcp-filesystem-001',
        container_name: 'mcp-filesystem-server',
        image_name: 'mcp/filesystem-server:latest',
        port: 3000,
        config: {
          volumes: ['/host/path:/container/path'],
          environment: {}
        },
        capabilities: ['File Read/Write', 'Directory Operations', 'File Search', 'Permission Management'],
        endpoints: ['/api/filesystem/health', '/api/filesystem/status'],
        health_status: 'healthy',
        metadata: {
          docker_image: 'mcp/filesystem-server:latest',
          ports: [3000],
          volumes: ['/host/path:/container/path']
        }
      },
      {
        name: 'Claude Code Assistant',
        type: 'ide-client',
        runtime: 'docker',
        status: 'running',
        version: '0.1.8',
        provider: 'Anthropic',
        category: 'IDE Client',
        description: 'AI-powered coding assistant for software development',
        container_id: 'claude-code-001',
        container_name: 'claude-code-assistant',
        image_name: 'anthropic/claude-code:latest',
        port: 3003,
        config: {
          volumes: ['/workspace:/workspace'],
          environment: {
            CLAUDE_API_KEY: '***'
          }
        },
        capabilities: ['Code Generation', 'Debugging Assistance', 'Code Review', 'Documentation'],
        endpoints: ['/api/claude/health', '/api/claude/status'],
        health_status: 'healthy',
        metadata: {
          docker_image: 'anthropic/claude-code:latest',
          ports: [3003],
          volumes: ['/workspace:/workspace']
        }
      },
      {
        name: 'Ollama LLM Server',
        type: 'ai-agent',
        runtime: 'docker',
        status: 'running',
        version: '0.1.17',
        provider: 'Ollama Team',
        category: 'AI Agent',
        description: 'Run large language models locally',
        container_id: 'ollama-001',
        container_name: 'ollama-server',
        image_name: 'ollama/ollama:latest',
        port: 11434,
        config: {
          volumes: ['/ollama-data:/root/.ollama'],
          environment: {}
        },
        capabilities: ['Local LLM Inference', 'Multiple Model Support', 'REST API', 'Streaming Responses'],
        endpoints: ['/api/generate', '/api/chat', '/api/embeddings'],
        health_status: 'healthy',
        metadata: {
          docker_image: 'ollama/ollama:latest',
          ports: [11434],
          volumes: ['/ollama-data:/root/.ollama']
        }
      }
    ];

    for (const agent of sampleAgents) {
      const { error } = await supabase
        .from(AGENTS_TABLE)
        .upsert([agent], { onConflict: 'name' });

      if (error) {
        console.error(`❌ Failed to insert agent ${agent.name}:`, error);
      } else {
        console.log(`✅ Agent ${agent.name} inserted/updated`);
      }
    }

    // Insert sample container instances
    console.log('🐳 Inserting sample container instances...');
    const sampleContainers = [
      {
        agent_id: 'sample-agent-1',
        container_id: 'mcp-filesystem-001',
        container_name: 'mcp-filesystem-server',
        image_name: 'mcp/filesystem-server:latest',
        status: 'running',
        port_mappings: [{ host: 3000, container: 3000 }],
        environment_vars: {},
        volumes: [{ host: '/host/path', container: '/container/path' }],
        started_at: new Date().toISOString()
      },
      {
        agent_id: 'sample-agent-2',
        container_id: 'claude-code-001',
        container_name: 'claude-code-assistant',
        image_name: 'anthropic/claude-code:latest',
        status: 'running',
        port_mappings: [{ host: 3003, container: 3003 }],
        environment_vars: { CLAUDE_API_KEY: '***' },
        volumes: [{ host: '/workspace', container: '/workspace' }],
        started_at: new Date().toISOString()
      }
    ];

    for (const container of sampleContainers) {
      const { error } = await supabase
        .from(CONTAINER_INSTANCES_TABLE)
        .upsert([container], { onConflict: 'container_id' });

      if (error) {
        console.error(`❌ Failed to insert container ${container.container_name}:`, error);
      } else {
        console.log(`✅ Container ${container.container_name} inserted/updated`);
      }
    }

    console.log('🎉 Database initialization completed successfully!');
    console.log('📊 Tables created: agents, agent_logs, agent_metrics, container_instances');
    console.log('🤖 Sample agents inserted');
    console.log('🐳 Sample containers inserted');

  } catch (error) {
    console.error('💥 Database initialization failed:', error);
    process.exit(1);
  }
}

// Run initialization
initializeDatabase().then(() => {
  console.log('🏁 Initialization script completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Initialization script failed:', error);
  process.exit(1);
});

