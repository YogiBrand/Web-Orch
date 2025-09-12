/**
 * Production Form Submission Server
 * Express.js server with real browser automation
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const FormSubmissionService = require('./form-submission-service.cjs');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws/form-submission' });

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || 'http://localhost:54321',
  process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
);

// Initialize form submission service
const formService = new FormSubmissionService(supabase);

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('New WebSocket connection for form submissions');
  formService.addWebSocketClient(ws);
});

// API Routes
app.post('/api/form-submission/start', async (req, res) => {
  try {
    const { jobId, url, customData, agentId, agent } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    let finalJobId = jobId;
    
    // If no jobId provided, create a temporary job for backward compatibility
    if (!finalJobId) {
      const { v4: uuidv4 } = require('uuid');
      finalJobId = uuidv4();
      
      // Create a temporary job response for backward compatibility
      const tempJob = {
        id: finalJobId,
        url,
        status: 'pending',
        progress: 0,
        fieldsFound: 0,
        fieldsCompleted: 0,
        customData: customData || {},
        agentId: agentId || agent || 'hybrid-ai',
        createdAt: new Date().toISOString(),
        error: null
      };
      
      // Start processing immediately
      formService.processJob(finalJobId, {
        url,
        customData: customData || {},
        agentId: agentId || agent || 'hybrid-ai'
      });

      return res.json(tempJob);
    }

    // Process the job with existing jobId
    formService.processJob(finalJobId, {
      url,
      customData: customData || {},
      agentId: agentId || 'hybrid-ai'
    });

    res.json({ success: true, message: 'Job started' });
  } catch (error) {
    console.error('Failed to start form submission:', error);
    res.status(500).json({ error: 'Failed to start form submission' });
  }
});

app.get('/api/form-submission/job/:jobId', (req, res) => {
  try {
    const job = formService.getJob(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
  } catch (error) {
    console.error('Failed to get job:', error);
    res.status(500).json({ error: 'Failed to get job' });
  }
});

app.get('/api/form-submission/jobs', (req, res) => {
  try {
    const jobs = formService.getAllJobs();
    res.json(jobs);
  } catch (error) {
    console.error('Failed to get jobs:', error);
    res.status(500).json({ error: 'Failed to get jobs' });
  }
});

app.post('/api/form-submission/job/:jobId/cancel', async (req, res) => {
  try {
    await formService.cancelJob(req.params.jobId);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to cancel job:', error);
    res.status(500).json({ error: 'Failed to cancel job' });
  }
});

app.post('/api/form-submission/job/:jobId/retry', async (req, res) => {
  try {
    const originalJob = formService.getJob(req.params.jobId);
    if (!originalJob) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const newJob = await formService.startSubmission({
      url: originalJob.url,
      customData: originalJob.customData,
      agent: originalJob.agent
    });

    res.json(newJob);
  } catch (error) {
    console.error('Failed to retry job:', error);
    res.status(500).json({ error: 'Failed to retry job' });
  }
});

app.get('/api/form-submission/templates', (req, res) => {
  // Default templates for common form types
  const templates = [
    {
      id: 'contact-basic',
      name: 'Basic Contact Form',
      description: 'Standard contact form with name, email, and message',
      fields: {
        name: 'John Doe',
        email: 'john.doe@example.com',
        message: 'Hello, I am interested in your services.'
      }
    },
    {
      id: 'business-inquiry',
      name: 'Business Inquiry',
      description: 'Professional business contact form',
      fields: {
        name: 'John Doe',
        email: 'john.doe@company.com',
        company: 'Example Corp',
        phone: '+1-555-123-4567',
        subject: 'Business Partnership Inquiry',
        message: 'We are interested in discussing potential business opportunities.'
      }
    },
    {
      id: 'job-application',
      name: 'Job Application',
      description: 'Standard job application form',
      fields: {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1-555-123-4567',
        position: 'Software Engineer',
        experience: '5 years',
        message: 'I am interested in joining your team as a Software Engineer.'
      }
    }
  ];
  
  res.json(templates);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'form-submission-server',
    timestamp: new Date().toISOString()
  });
});

// Start server
const PORT = process.env.FORM_SUBMISSION_PORT || 3004;
server.listen(PORT, () => {
  console.log(`🤖 Form Submission Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready at ws://localhost:${PORT}/ws/form-submission`);
  console.log(`🌐 API endpoints available at http://localhost:${PORT}/api/form-submission/`);
});

module.exports = { app, server, formService };