# WebOrchestrator - GitHub-Optimized Version

## 🚀 Browser Automation Platform

WebOrchestrator is a comprehensive browser automation platform with an AI-powered task orchestration system, session management, and agent marketplace.

### 🏗️ Architecture
- **Frontend**: Vite + React + TypeScript (Port 3000)
- **Backend**: Node.js + Express + TypeScript (Port 3001) 
- **Agent Marketplace**: Dedicated service (Port 3002)
- **Database**: PostgreSQL + Supabase
- **Real-time**: WebSocket connections

## ✨ Core Features

### 🎯 Session Management
- **Browser Sessions**: Chrome, Firefox, Edge, Safari support
- **Session Types**: Browser-use, Playwright, Puppeteer, Selenium, Computer-use
- **Real-time Monitoring**: Live session status and metrics
- **VNC Integration**: Remote browser viewing and control
- **Session Recording**: Capture and replay functionality

### 🤖 Task Orchestrator
- **AI-Powered Tasks**: GPT-4, Claude, Gemini integration
- **Task Templates**: Pre-built automation workflows
- **Real-time Execution**: Live task progress tracking
- **Multi-LLM Support**: OpenRouter integration
- **Custom Configurations**: Flexible task parameters

### 🏪 Agent Marketplace
- **Agent Registry**: Discover and install automation agents
- **Custom Agents**: Build and publish your own agents
- **Template System**: Quick agent creation wizards
- **Health Monitoring**: Agent status and performance tracking
- **Configuration Management**: Environment and secrets handling

### 📊 Data & Analytics
- **Comprehensive Dashboard**: System metrics and insights
- **Performance Tracking**: Session and task analytics
- **Event Streaming**: Real-time system events
- **Data Portal**: Unified data access and management
- **Export Capabilities**: Multiple format support

### 🔧 Development Tools
- **Nexus Workspace**: Integrated development environment
- **Code Editor**: Built-in Monaco editor
- **Terminal Access**: Remote terminal integration
- **Debugging Tools**: Browser debugging support
- **API Testing**: Built-in API client

## 📁 Project Structure

```
WebOrchestrator/
├── client/                     # Frontend (Vite + React)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── sessions.tsx    # Session management
│   │   │   ├── tasks.tsx       # Task orchestrator
│   │   │   ├── agents.tsx      # Agent management
│   │   │   ├── dashboard.tsx   # Main dashboard
│   │   │   └── nexus.tsx       # Development workspace
│   │   ├── components/         # React components
│   │   ├── lib/               # Utilities and API clients
│   │   └── hooks/             # Custom React hooks
│   └── vite.config.ts         # Vite configuration
├── server/                     # Backend services
│   ├── backend/
│   │   ├── src/
│   │   │   ├── routes/        # API endpoints
│   │   │   ├── services/      # Business logic
│   │   │   └── server.ts      # Main server
│   │   └── package.json
│   └── form-submission-*.cjs  # Form automation services
├── agent-marketplace/          # Agent marketplace service
│   ├── src/
│   │   ├── features/agents/   # Agent management
│   │   └── components/        # UI components
│   └── backend-server.js      # Marketplace API
├── shared/                     # Shared types and schemas
│   ├── database.types.ts      # Database schemas
│   └── schema.ts              # Shared data models
├── docker-compose.yml          # Container orchestration
└── package.json               # Root dependencies
```

## 🚀 Quick Start

### Platform Import

#### Replit
1. Import from GitHub
2. Run: `npm run dev`
3. Access at replit-url:3000

#### Bolt.new
1. Paste repository URL
2. Auto-detects Vite + React
3. Run: `npm run dev`

### Local Development

```bash
# Install dependencies
npm install

# Start development servers
npm run dev         # Frontend (port 3000)
npm run server      # Backend (port 3001)

# Or start both with Docker
docker-compose up --build
```

## 🔧 Configuration

### Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Configure required variables
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-key
OPENROUTER_API_KEY=your-openrouter-key  # Optional
```

### Database Setup
```bash
# Initialize Supabase schema
npm run db:setup

# Or use provided SQL files
psql -f supabase-schema.sql
```

## 🎮 Usage Examples

### Creating a Browser Session
```typescript
const session = await createSession({
  name: "Web Scraping Task",
  type: "playwright",
  browser: "chrome",
  config: {
    headless: false,
    viewport: { width: 1920, height: 1080 }
  }
});
```

### Running a Task
```typescript
const task = await executeTask({
  type: "web-automation",
  url: "https://example.com",
  instructions: "Extract product information",
  sessionId: session.id
});
```

### Installing an Agent
```typescript
const agent = await installAgent({
  name: "web-scraper-pro",
  version: "1.0.0",
  config: {
    apiKey: "your-key",
    retries: 3
  }
});
```

## 📡 API Endpoints

### Sessions API
- `GET /api/sessions` - List all sessions
- `POST /api/sessions` - Create new session
- `GET /api/sessions/:id` - Get session details
- `DELETE /api/sessions/:id` - Terminate session

### Tasks API  
- `GET /api/tasks` - List all tasks
- `POST /api/tasks` - Create new task
- `GET /api/tasks/:id/stream` - Stream task progress
- `POST /api/tasks/:id/cancel` - Cancel running task

### Agents API
- `GET /api/agents` - List available agents
- `POST /api/agents` - Install new agent
- `GET /api/agents/:id/health` - Check agent health
- `PUT /api/agents/:id/config` - Update agent config

## 🐳 Docker Support

### Development
```bash
docker-compose up --build
```

### Production
```bash
docker-compose -f docker-compose.yml up -d
```

### Services
- **Frontend**: React development server
- **Backend**: Node.js API server
- **Database**: PostgreSQL with Supabase
- **Redis**: Session and task caching
- **VNC**: Remote browser access

## 🔌 Integration

### Supported Browsers
- Chrome/Chromium
- Firefox
- Edge
- Safari (macOS)

### AI/LLM Providers
- OpenAI (GPT-4, GPT-4o)
- Anthropic (Claude)
- Google (Gemini)
- OpenRouter (Multiple models)

### Automation Libraries
- Playwright
- Puppeteer
- Selenium WebDriver
- Browser-use AI
- Computer Use API

## 🛠️ Development

### Frontend Development
```bash
cd client
npm install
npm run dev
```

### Backend Development  
```bash
cd server/backend
npm install
npm run dev
```

### Agent Marketplace
```bash
cd agent-marketplace
npm install
npm run dev
```

## 📝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

## 📄 License

MIT License - see LICENSE file

## 🆘 Support

- **Documentation**: See README files in each service
- **Issues**: Use GitHub Issues
- **Discord**: [Community Server](https://discord.gg/weborchestrator)

---

**Ready for GitHub!** This optimized version maintains full WebOrchestrator functionality while fitting within platform limits.