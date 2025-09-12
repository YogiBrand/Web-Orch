// Environment Configuration
export const config = {
  // Supabase Configuration
  supabase: {
    url: process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co',
    anonKey: process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key-here'
  },

  // Docker Service Configuration
  dockerService: {
    url: process.env.VITE_DOCKER_SERVICE_URL || 'http://localhost:5175',
    port: process.env.VITE_DOCKER_SERVICE_PORT || 5175
  },

  // Main App Configuration
  app: {
    port: process.env.VITE_APP_PORT || 5174
  },

  // MCP Server Integration Paths
  mcp: {
    claudeConfig: '~/.config/claude/mcp.json',
    vscodeSettings: '~/.vscode/settings.json',
    cursorSettings: '~/.config/cursor/settings.json',
    windsurfSettings: '~/.config/windsurf/settings.json',
    clineSettings: '~/.config/cline/settings.json'
  },

  // IDE Integration Commands
  ideCommands: {
    vscode: 'code',
    cursor: 'cursor',
    windsurf: 'windsurf',
    cline: 'cline'
  },

  // Default Docker Images for MCP Servers
  defaultImages: {
    'mcp-filesystem': 'mcp/filesystem-server:latest',
    'mcp-git': 'mcp/git-server:latest',
    'mcp-slack': 'mcp/slack-server:latest',
    'mcp-github': 'mcp/github-server:latest',
    'mcp-weather': 'mcp/weather-server:latest',
    'mcp-database': 'mcp/database-server:latest'
  }
};

export default config;

