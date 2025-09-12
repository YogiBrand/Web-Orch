import express from 'express';
import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5176; // MCP Integration Service Port

// Middleware
app.use(express.json());

// MCP Server configurations (similar to Smithery.ai)
const MCP_SERVERS = {
  'filesystem': {
    name: 'MCP Filesystem Server',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
    env: {},
    description: 'File system operations server'
  },
  'git': {
    name: 'MCP Git Server',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-git', '--repository', '/tmp/repo'],
    env: {},
    description: 'Git repository operations'
  },
  'github': {
    name: 'MCP GitHub Server',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    env: { GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN || '' },
    description: 'GitHub API integration'
  },
  'slack': {
    name: 'MCP Slack Server',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-slack'],
    env: { SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN || '' },
    description: 'Slack integration'
  },
  'everything': {
    name: 'MCP Everything Server',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-everything'],
    env: {},
    description: 'General purpose MCP server'
  }
};

// IDE configurations
const IDE_CONFIGS = {
  claude: {
    name: 'Claude Desktop',
    configPath: path.join(os.homedir(), '.config', 'claude', 'claude_desktop_config.json'),
    format: 'claude',
    installCommand: null
  },
  vscode: {
    name: 'Visual Studio Code',
    configPath: path.join(os.homedir(), '.vscode', 'settings.json'),
    format: 'vscode',
    installCommand: 'code --install-extension'
  },
  cursor: {
    name: 'Cursor',
    configPath: path.join(os.homedir(), '.config', 'cursor', 'settings.json'),
    format: 'cursor',
    installCommand: null
  },
  windsurf: {
    name: 'Windsurf',
    configPath: path.join(os.homedir(), '.config', 'windsurf', 'settings.json'),
    format: 'windsurf',
    installCommand: null
  }
};

// Generate MCP configuration for different IDEs
function generateMCPConfig(serverId, serverConfig, ideFormat) {
  const baseConfig = {
    mcpServers: {
      [serverId]: {
        command: serverConfig.command,
        args: serverConfig.args,
        env: serverConfig.env
      }
    }
  };

  switch (ideFormat) {
    case 'claude':
      return baseConfig;

    case 'vscode':
      return {
        'modelcontextprotocol.servers': {
          [serverId]: {
            command: serverConfig.command,
            args: serverConfig.args,
            env: serverConfig.env
          }
        }
      };

    case 'cursor':
      return {
        'mcp.servers': {
          [serverId]: {
            command: serverConfig.command,
            args: serverConfig.args,
            env: serverConfig.env
          }
        }
      };

    case 'windsurf':
      return {
        'windsurf.mcp.servers': {
          [serverId]: {
            command: serverConfig.command,
            args: serverConfig.args,
            env: serverConfig.env
          }
        }
      };

    default:
      return baseConfig;
  }
}

// Read existing IDE configuration
async function readIDEConfig(ideId) {
  const ideConfig = IDE_CONFIGS[ideId];
  if (!ideConfig) {
    throw new Error(`Unknown IDE: ${ideId}`);
  }

  try {
    const configData = await fs.readFile(ideConfig.configPath, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    // If file doesn't exist, return empty config
    return {};
  }
}

// Write IDE configuration
async function writeIDEConfig(ideId, config) {
  const ideConfig = IDE_CONFIGS[ideId];
  if (!ideConfig) {
    throw new Error(`Unknown IDE: ${ideId}`);
  }

  // Ensure directory exists
  const configDir = path.dirname(ideConfig.configPath);
  await fs.mkdir(configDir, { recursive: true });

  // Write configuration
  await fs.writeFile(ideConfig.configPath, JSON.stringify(config, null, 2));
}

// Add MCP server to IDE
app.post('/api/mcp/add-to-ide', async (req, res) => {
  try {
    const { serverId, ideId, config = {} } = req.body;

    console.log(`🔧 Adding MCP server ${serverId} to ${ideId}...`);

    if (!MCP_SERVERS[serverId]) {
      return res.status(400).json({
        success: false,
        error: `Unknown MCP server: ${serverId}`
      });
    }

    if (!IDE_CONFIGS[ideId]) {
      return res.status(400).json({
        success: false,
        error: `Unknown IDE: ${ideId}`
      });
    }

    const serverConfig = { ...MCP_SERVERS[serverId], ...config };
    const ideConfig = IDE_CONFIGS[ideId];

    // Read existing configuration
    const existingConfig = await readIDEConfig(ideId);

    // Generate new MCP configuration
    const mcpConfig = generateMCPConfig(serverId, serverConfig, ideConfig.format);

    // Merge configurations
    const newConfig = { ...existingConfig, ...mcpConfig };

    // Write new configuration
    await writeIDEConfig(ideId, newConfig);

    // Install extensions if needed
    if (ideConfig.installCommand && serverConfig.extensions) {
      for (const extension of serverConfig.extensions) {
        try {
          await exec(`${ideConfig.installCommand} ${extension}`);
        } catch (error) {
          console.warn(`⚠️ Failed to install extension ${extension}:`, error.message);
        }
      }
    }

    console.log(`✅ Successfully added ${serverId} to ${ideId}`);

    res.json({
      success: true,
      message: `MCP server ${serverId} added to ${ideConfig.name}`,
      configPath: ideConfig.configPath,
      serverConfig: mcpConfig
    });

  } catch (error) {
    console.error('❌ Failed to add MCP server to IDE:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Remove MCP server from IDE
app.post('/api/mcp/remove-from-ide', async (req, res) => {
  try {
    const { serverId, ideId } = req.body;

    console.log(`🗑️ Removing MCP server ${serverId} from ${ideId}...`);

    if (!IDE_CONFIGS[ideId]) {
      return res.status(400).json({
        success: false,
        error: `Unknown IDE: ${ideId}`
      });
    }

    const ideConfig = IDE_CONFIGS[ideId];
    const existingConfig = await readIDEConfig(ideId);

    // Remove MCP server configuration
    const configKey = getMCPConfigKey(ideConfig.format);
    if (existingConfig[configKey] && existingConfig[configKey][serverId]) {
      delete existingConfig[configKey][serverId];
    }

    // Write updated configuration
    await writeIDEConfig(ideId, existingConfig);

    console.log(`✅ Successfully removed ${serverId} from ${ideId}`);

    res.json({
      success: true,
      message: `MCP server ${serverId} removed from ${ideConfig.name}`
    });

  } catch (error) {
    console.error('❌ Failed to remove MCP server from IDE:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get MCP server status for IDE
app.get('/api/mcp/status/:ideId/:serverId', async (req, res) => {
  try {
    const { ideId, serverId } = req.params;

    if (!IDE_CONFIGS[ideId]) {
      return res.status(400).json({
        success: false,
        error: `Unknown IDE: ${ideId}`
      });
    }

    const ideConfig = IDE_CONFIGS[ideId];
    const existingConfig = await readIDEConfig(ideId);

    const configKey = getMCPConfigKey(ideConfig.format);
    const isInstalled = existingConfig[configKey] && existingConfig[configKey][serverId];

    res.json({
      success: true,
      installed: !!isInstalled,
      serverId,
      ideId,
      configPath: ideConfig.configPath,
      serverConfig: isInstalled ? existingConfig[configKey][serverId] : null
    });

  } catch (error) {
    console.error('❌ Failed to check MCP server status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// List available MCP servers
app.get('/api/mcp/servers', (req, res) => {
  res.json({
    success: true,
    servers: Object.entries(MCP_SERVERS).map(([id, config]) => ({
      id,
      name: config.name,
      description: config.description,
      command: config.command,
      args: config.args
    }))
  });
});

// List supported IDEs
app.get('/api/mcp/ides', (req, res) => {
  res.json({
    success: true,
    ides: Object.entries(IDE_CONFIGS).map(([id, config]) => ({
      id,
      name: config.name,
      configPath: config.configPath,
      format: config.format
    }))
  });
});

// Get MCP configuration key for IDE format
function getMCPConfigKey(format) {
  switch (format) {
    case 'claude':
      return 'mcpServers';
    case 'vscode':
      return 'modelcontextprotocol.servers';
    case 'cursor':
      return 'mcp.servers';
    case 'windsurf':
      return 'windsurf.mcp.servers';
    default:
      return 'mcpServers';
  }
}

// Test MCP server connection
app.post('/api/mcp/test-connection', async (req, res) => {
  try {
    const { serverId, config = {} } = req.body;

    if (!MCP_SERVERS[serverId]) {
      return res.status(400).json({
        success: false,
        error: `Unknown MCP server: ${serverId}`
      });
    }

    const serverConfig = { ...MCP_SERVERS[serverId], ...config };
    const command = `${serverConfig.command} ${serverConfig.args.join(' ')} --help`;

    exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
      if (error) {
        return res.json({
          success: false,
          error: error.message,
          connected: false,
          details: stderr || stdout
        });
      }

      res.json({
        success: true,
        connected: true,
        message: 'MCP server is accessible',
        details: stdout
      });
    });

  } catch (error) {
    console.error('❌ Failed to test MCP server connection:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'MCP Integration Service',
    supportedServers: Object.keys(MCP_SERVERS),
    supportedIdes: Object.keys(IDE_CONFIGS)
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 MCP Integration Service running on port ${PORT}`);
  console.log(`🔧 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 Supported MCP Servers: ${Object.keys(MCP_SERVERS).join(', ')}`);
  console.log(`💻 Supported IDEs: ${Object.keys(IDE_CONFIGS).join(', ')}`);
  console.log(`🛠️ Ready for MCP-IDE integrations!`);
});

export default app;

