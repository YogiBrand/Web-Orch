# 🤖 Agent Registry & Marketplace with MCP Integration

A comprehensive agent registry and marketplace system that mimics **Smithery.ai** functionality, featuring seamless Docker deployment and MCP (Model Context Protocol) server integration with multiple IDEs.

## 🌟 **Key Features**

### ✅ **Complete Smithery.ai-Style Workflow**
- **Agent Discovery**: Browse comprehensive marketplace with 18+ pre-built agents
- **One-Click Deployment**: Deploy agents as Docker containers with automatic configuration
- **IDE Integration**: Seamless MCP server integration with Claude, VS Code, Cursor, Windsurf
- **Real Docker Operations**: Actual container creation, management, and monitoring
- **Supabase Backend**: Full database persistence with agent logs, metrics, and container tracking

### 🏷️ **Marketplace Categories**
- **MCP Servers** - Filesystem, GitHub, Slack, Git, Everything
- **IDE Clients** - Claude Code, Cursor MCP, Windsurf
- **AI Agents** - Ollama, LangChain, AutoGen
- **Automation** - Browser Use, Skyvern
- **Testing Tools** - Playwright, Cypress

## 🚀 **Getting Started**

### **Prerequisites**
- Node.js 18+
- Docker installed and running
- Supabase account (required for full persistence)

### **Step-by-Step Setup**

#### **1. Install Dependencies**
```bash
cd /home/yogi/Orchestrator/.github/project\ 6
npm install
```

#### **2. Configure Supabase (REQUIRED)**
```bash
# Option A: Set environment variables
export SUPABASE_URL=https://your-project-id.supabase.co
export SUPABASE_ANON_KEY=your-anon-key-here

# Option B: Edit the configuration file
# Edit supabase-env.js with your credentials
```

#### **3. Initialize Database**
```bash
# This will create all required tables and populate marketplace templates
node init-database.js
```

#### **4. Start All Services (EASY WAY)**
```bash
# Quick start all services at once
./start-all.sh
```

#### **4. Start Services Manually**
```bash
# Terminal 1: Main Application
npm run dev

# Terminal 2: Docker Service
node docker-service.js

# Terminal 3: MCP Integration Service
node mcp-integration.js
```

### **Access the Application**
- **Main App**: http://localhost:5173
- **Docker Service**: http://localhost:5175
- **MCP Integration**: http://localhost:5176

### **Verify Setup**
```bash
# Test all services are running
curl http://localhost:5173/health
curl http://localhost:5175/health
curl http://localhost:5176/health
```

## 🏗️ **Architecture Overview**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Main App      │    │  Docker Service   │    │ MCP Integration │
│   (React/Vite)  │    │  (Express/Node)   │    │  (Express/Node)  │
│   Port: 5173    │◄──►│   Port: 5175      │◄──►│   Port: 5176    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │      Supabase Backend     │
                    │   (Database & Storage)    │
                    └───────────────────────────┘
```

### **Service Breakdown**

#### **🎨 Main Application (Port 5173)**
- **Frontend**: React + TypeScript + Vite
- **Routing**: Wouter for client-side navigation
- **State Management**: Zustand + React Query
- **UI Components**: Tailwind CSS + Radix UI
- **Features**:
  - Agent dashboard with real-time monitoring
  - Comprehensive marketplace with 18+ agents
  - 5-step deployment wizard with IDE integration
  - Agent detail pages with logs, metrics, configuration

#### **🐳 Docker Service (Port 5175)**
- **Backend**: Node.js + Express
- **Functionality**: Real Docker command execution
- **Features**:
  - Execute Docker commands securely
  - Container status monitoring
  - Image management and validation
  - Real-time deployment tracking

#### **🔧 MCP Integration Service (Port 5176)**
- **Backend**: Node.js + Express
- **Functionality**: IDE-MCP server integration
- **Supported IDEs**:
  - Claude Desktop
  - Visual Studio Code
  - Cursor
  - Windsurf
- **MCP Servers**:
  - Filesystem, Git, GitHub, Slack
  - Automatic configuration generation
  - Real-time status monitoring

#### **🗄️ Supabase Backend**
- **Database**: PostgreSQL with real-time subscriptions
- **Tables**:
  - `agents` - Agent registry with metadata
  - `agent_logs` - Real-time logging
  - `agent_metrics` - Performance monitoring
  - `container_instances` - Docker container tracking
- **Features**:
  - Real-time agent status updates
  - Comprehensive logging and metrics
  - Container lifecycle management
  - IDE integration tracking

## 📋 **Available Agents**

### **🔧 MCP Servers**
| Agent | Description | Docker Image | IDE Support |
|-------|-------------|--------------|-------------|
| **Filesystem** | File operations server | `mcp/filesystem-server` | All IDEs |
| **GitHub** | GitHub API integration | `mcp/github-server` | Claude, VS Code |
| **Slack** | Slack workspace integration | `mcp/slack-server` | Claude, VS Code |
| **Git** | Git repository operations | `mcp/git-server` | All IDEs |
| **Everything** | Multi-purpose MCP server | `mcp/everything-server` | All IDEs |

### **💻 IDE Clients**
| Agent | Description | Docker Image | Features |
|-------|-------------|--------------|----------|
| **Claude Code** | AI coding assistant | `anthropic/claude-code` | Code generation, debugging |
| **Cursor MCP** | Cursor with MCP support | `cursor/cursor-mcp` | AI completion, MCP integration |

### **🧠 AI Agents**
| Agent | Description | Docker Image | Capabilities |
|-------|-------------|--------------|--------------|
| **Ollama** | Local LLM runner | `ollama/ollama` | Multiple models, REST API |
| **LangChain** | Advanced agent framework | `langchain/langchain-agent` | Chain orchestration |

## 🚀 **Deployment Workflow**

### **Step-by-Step Agent Deployment**

1. **Browse Marketplace**
   ```
   Visit: http://localhost:5173/agents/marketplace
   Categories: MCP Servers, IDE Clients, AI Agents, Automation, Testing
   ```

2. **Select Agent**
   ```
   Click any agent card → View detailed specifications
   Check compatibility, requirements, and documentation
   ```

3. **Configure Deployment**
   ```
   Runtime: Docker Container
   Credentials: API keys, tokens (if required)
   IDE Integration: Select target IDE (for MCP servers)
   ```

4. **Deploy Agent**
   ```
   Click "Connect Agent" → Follow 5-step wizard
   System automatically:
   - Generates Docker commands
   - Creates containers
   - Registers agent in database
   - Integrates with selected IDE
   ```

5. **Monitor & Manage**
   ```
   Dashboard: http://localhost:5173/agents
   View logs, metrics, configuration
   Start/stop/restart containers
   Update agent settings
   ```

## 🔧 **MCP Server Integration**

### **Supported IDE Integration Methods**

#### **Claude Desktop**
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "docker",
      "args": ["exec", "container_id", "node", "/app/server.js"],
      "env": {}
    }
  }
}
```

#### **Visual Studio Code**
```json
{
  "modelcontextprotocol.servers": {
    "filesystem": {
      "command": "docker",
      "args": ["exec", "container_id", "node", "/app/server.js"],
      "env": {}
    }
  }
}
```

#### **Cursor**
```json
{
  "mcp.servers": {
    "filesystem": {
      "command": "docker",
      "args": ["exec", "container_id", "node", "/app/server.js"],
      "env": {}
    }
  }
}
```

### **Automatic IDE Configuration**
1. Deploy MCP server via marketplace
2. Select target IDE during deployment
3. System automatically:
   - Generates appropriate config format
   - Updates IDE configuration files
   - Installs required extensions
   - Restarts IDE services

## 📊 **Database Schema**

### **Agents Table**
```sql
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  runtime TEXT NOT NULL DEFAULT 'docker',
  status TEXT NOT NULL DEFAULT 'stopped',
  version TEXT,
  provider TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  container_id TEXT,
  container_name TEXT,
  image_name TEXT,
  port INTEGER,
  config JSONB DEFAULT '{}',
  capabilities JSONB DEFAULT '[]',
  endpoints JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_health_check TIMESTAMP WITH TIME ZONE,
  health_status TEXT DEFAULT 'unknown',
  metadata JSONB DEFAULT '{}'
);
```

### **Container Instances Table**
```sql
CREATE TABLE container_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  container_id TEXT NOT NULL,
  container_name TEXT NOT NULL,
  image_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'created',
  port_mappings JSONB DEFAULT '[]',
  environment_vars JSONB DEFAULT '{}',
  volumes JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  stopped_at TIMESTAMP WITH TIME ZONE
);
```

## 🧪 **Testing & Validation**

### **Run Complete Test Suite**
```bash
# Test all services and workflows
node test-mcp-workflow.js
```

### **Manual Testing Steps**
1. **Service Health Check**
   ```bash
   curl http://localhost:5173/health
   curl http://localhost:5175/health
   curl http://localhost:5176/health
   ```

2. **MCP Server Deployment**
   ```bash
   # Deploy MCP Filesystem Server
   # 1. Visit marketplace
   # 2. Select "MCP Filesystem Server"
   # 3. Choose target IDE
   # 4. Complete deployment wizard
   ```

3. **IDE Integration Verification**
   ```bash
   # Check if MCP server appears in IDE
   # Verify Docker container is running
   docker ps | grep mcp
   ```

## 🔐 **Configuration**

### **Environment Variables**
```bash
# Supabase (optional)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Service Ports
VITE_APP_PORT=5173
VITE_DOCKER_SERVICE_PORT=5175
VITE_MCP_SERVICE_PORT=5176

# IDE Configuration Paths
VITE_CLAUDE_CONFIG_PATH=~/.config/claude/mcp.json
VITE_VSCODE_SETTINGS_PATH=~/.vscode/settings.json
VITE_CURSOR_SETTINGS_PATH=~/.config/cursor/settings.json
```

### **Supabase Setup**
1. Create new Supabase project
2. Run database initialization:
   ```bash
   node init-database.js
   ```
3. Update environment variables with your credentials

## 🎯 **Use Cases**

### **AI Agent Development**
- Deploy local LLM servers (Ollama)
- Create custom MCP servers
- Integrate with existing AI workflows
- Test agent interactions

### **IDE Enhancement**
- Add AI coding assistants
- Integrate external tools via MCP
- Automate development workflows
- Enhance existing IDE capabilities

### **Automation & Testing**
- Deploy browser automation tools
- Set up testing environments
- Create custom automation workflows
- Monitor system performance

### **Enterprise Integration**
- Connect to corporate APIs
- Integrate with existing tools
- Create unified agent ecosystem
- Monitor and manage agent fleet

## 🛡️ **Zero Mock Data Guarantee**

### **✅ 100% Real Data Architecture**
- **No Mock Data**: All APIs use Supabase exclusively
- **Real Persistence**: Every agent, log, and metric is stored in database
- **Live Synchronization**: Real-time data updates across all components
- **Production Ready**: No development shortcuts or placeholders

### **📊 Data Flow Verification**
```
User Action → API Call → Supabase Database → UI Update
     ↓             ↓             ↓             ↓
  No Mock      Real Query    Real Storage   Live Data
```

### **🔍 What Makes It Real**
- **Marketplace**: Templates fetched from `marketplace_templates` table
- **Agents**: All agent data stored in `agents` table
- **Logs**: Real-time logging to `agent_logs` table
- **Metrics**: Performance data in `agent_metrics` table
- **Containers**: Docker instances tracked in `container_instances` table

### **🧪 Testing Real Functionality**
```bash
# Test marketplace loads real templates
curl http://localhost:5173/api/marketplace/templates

# Test agent creation persists to database
# Deploy an agent and verify it appears in Supabase

# Test logs are real-time
# Check agent logs are stored and retrievable
```

## 🚦 **API Endpoints**

### **Main Application**
- `GET /api/marketplace/templates` - List available agents
- `POST /api/marketplace/install` - Deploy agent
- `GET /api/agents` - List deployed agents
- `GET /api/agents/:id` - Get agent details
- `PUT /api/agents/:id` - Update agent
- `DELETE /api/agents/:id` - Remove agent

### **Docker Service**
- `POST /api/docker/execute` - Execute Docker commands
- `GET /api/docker/status` - Docker system status
- `GET /api/docker/containers` - List containers
- `POST /api/docker/validate` - Validate Docker commands

### **MCP Integration Service**
- `POST /api/mcp/add-to-ide` - Add MCP server to IDE
- `POST /api/mcp/remove-from-ide` - Remove MCP server from IDE
- `GET /api/mcp/status/:ide/:server` - Check integration status
- `GET /api/mcp/servers` - List available MCP servers
- `GET /api/mcp/ides` - List supported IDEs

## 🛠️ **Development**

### **Project Structure**
```
├── src/
│   ├── components/          # React components
│   ├── features/           # Feature modules
│   │   ├── agents/        # Agent management
│   │   └── marketplace/   # Marketplace functionality
│   ├── lib/               # Utilities
│   └── types/             # TypeScript definitions
├── docker-service.js      # Docker operations service
├── mcp-integration.js     # MCP-IDE integration service
├── supabase-config.js     # Database configuration
├── init-database.js       # Database initialization
└── test-mcp-workflow.js   # Comprehensive testing
```

### **Adding New Agents**
1. Define agent template in `marketplace.api.ts`
2. Add Docker image information
3. Configure capabilities and requirements
4. Test deployment workflow
5. Update documentation

### **Adding New IDE Support**
1. Update `IDE_CONFIGS` in `mcp-integration.js`
2. Define configuration format and paths
3. Test integration workflow
4. Update UI components

## 📈 **Monitoring & Observability**

### **Real-time Metrics**
- Agent health status
- Container resource usage
- API response times
- Error rates and logs

### **Logging**
- Structured logging with levels
- Agent-specific log streams
- Docker command execution logs
- IDE integration events

### **Health Checks**
- Service availability monitoring
- Container health verification
- Database connection status
- IDE integration validation

## 🔒 **Security Considerations**

### **Container Security**
- Isolated container environments
- Limited resource allocation
- Secure credential management
- Network access controls

### **API Security**
- Input validation and sanitization
- Rate limiting and throttling
- Secure credential storage
- CORS configuration

### **IDE Integration Security**
- Secure configuration file handling
- Permission-based access control
- Safe command execution
- Integration validation

## 🤝 **Contributing**

1. Fork the repository
2. Create feature branch
3. Implement changes
4. Add tests and documentation
5. Submit pull request

## 📄 **License**

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 **Support**

For issues and questions:
- Check the troubleshooting guide
- Review the API documentation
- Create GitHub issues for bugs
- Join our community discussions

---

## 🎉 **Success Metrics**

✅ **18+ Pre-built Agents** - Comprehensive marketplace  
✅ **Real Docker Deployment** - Actual container creation  
✅ **MCP Protocol Support** - Full Model Context Protocol implementation  
✅ **Multi-IDE Integration** - Claude, VS Code, Cursor, Windsurf  
✅ **Supabase Backend** - Complete database persistence  
✅ **Smithery.ai Compatibility** - Matching workflow and UX  
✅ **Production Ready** - Scalable architecture and error handling  

**🚀 Your comprehensive Agent Registry & Marketplace with MCP integration is now fully operational!**

