import express from 'express';
import { exec } from 'child_process';
import cors from 'cors';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const app = express();
const PORT = 5175; // Changed to avoid conflicts with main app

// Middleware
app.use(cors());
app.use(express.json());

// Docker command execution endpoint
app.post('/api/docker/execute', async (req, res) => {
  try {
    const { command, timeout = 60000 } = req.body;

    console.log('🔄 Executing Docker command:', command);

    // Validate Docker command
    if (!command || !command.startsWith('docker')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Docker command format'
      });
    }

    // Execute the actual Docker command
    const child = exec(command, { timeout }, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Docker command failed:', error.message);
        return res.status(500).json({
          success: false,
          error: error.message,
          stderr: stderr,
          stdout: stdout
        });
      }

      console.log('✅ Docker command successful');
      console.log('📝 Output:', stdout);

      // Extract container ID if it's a docker run command
      let containerId = '';
      if (command.includes('docker run') && stdout.trim()) {
        containerId = stdout.trim();
      }

      res.json({
        success: true,
        output: stdout.trim(),
        stderr: stderr,
        containerId: containerId,
        message: 'Docker command executed successfully'
      });
    });

    // Log real-time output
    child.stdout?.on('data', (data) => {
      console.log('🐳 Docker stdout:', data.toString());
    });

    child.stderr?.on('data', (data) => {
      console.log('⚠️ Docker stderr:', data.toString());
    });

  } catch (error) {
    console.error('💥 API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Check Docker status
app.get('/api/docker/status', (req, res) => {
  // Simulate Docker status check
  res.json({
    installed: true,
    running: true,
    version: 'Docker version 24.0.6, build ed223bc'
  });
});

// Get running containers
app.get('/api/docker/containers', (req, res) => {
  // Simulate container list
  const containers = [
    {
      name: 'agent-mcp-filesystem',
      image: 'mcp/filesystem-server:latest',
      status: 'Up 2 hours',
      ports: '3000->3000/tcp'
    },
    {
      name: 'agent-claude-code',
      image: 'anthropic/claude-code:latest',
      status: 'Up 1 hour',
      ports: '3003->3003/tcp'
    }
  ];

  res.json({
    success: true,
    containers
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Docker Service'
  });
});

// Simulate Docker command validation
app.post('/api/docker/validate', (req, res) => {
  const { command } = req.body;

  const isValid = command.includes('docker') &&
                 (command.includes('run') ||
                  command.includes('pull') ||
                  command.includes('ps') ||
                  command.includes('stop') ||
                  command.includes('rm'));

  res.json({
    valid: isValid,
    command: command
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Docker Service running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🐳 Ready to handle Docker operations`);
});
