/**
 * 🚀 ADVANCED FORM SUBMISSION TOOL
 * Intelligent form automation with AI agents, profiles, and advanced fallback mechanisms
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { useWebSocket } from '@/hooks/use-websocket';
// import { sessionIntegrationService, SessionData } from '@/lib/session-integration';
import {
  Bot, Globe, Play, Pause, Square, Settings, 
  CheckCircle, Clock, AlertCircle, Zap, Target,
  FileText, Database, Users, Activity, Plus, X,
  RefreshCw, Eye, Download, MonitorPlay, Terminal,
  Upload, User, FileSpreadsheet, List, Save, Edit3,
  Trash2, Copy, ChevronDown, ChevronUp, Filter
} from 'lucide-react';

// Interfaces
interface FormSubmissionJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  url: string;
  formData: Record<string, any>;
  progress: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
  sessionId?: string;
  screenshots?: string[];
  results?: any;
}

// Agent Types for Enhanced Form Submission
interface AgentType {
  id: string;
  name: string;
  type: 'mcp' | 'vision' | 'browser' | 'automation';
  description: string;
  capabilities: string[];
  icon: string;
  successRate: number;
  responseTime: string;
  cost: string;
}

interface SelectedAgent {
  primary: AgentType;
  fallbacks: AgentType[];
  enhancements: AgentType[];
}

interface SessionData {
  id: string;
  name: string;
  type: string;
  status: 'created' | 'running' | 'completed' | 'failed';
  browser?: string;
  agentType?: string;
  metadata?: {
    config?: any;
    browserSession?: any;
    liveMetrics?: any;
    streamUrl?: string;
    vncUrl?: string;
    formUrl?: string;
  };
  createdAt: string;
  endedAt?: string;
  recordingUrl?: string;
  streamUrl?: string;
}

interface FormProfile {
  id: string;
  name: string;
  description: string;
  fields: Record<string, {
    value: string;
    required: boolean;
    type: string;
    label: string;
  }>;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
}

interface CRMList {
  id: string;
  name: string;
  description: string;
  contactCount: number;
  fields: string[];
  createdAt: string;
}

interface BatchJob {
  id: string;
  name: string;
  urls: string[];
  profileId?: string;
  crmListId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  results: any[];
  createdAt: string;
  settings: {
    useAI: boolean;
    takeScreenshots: boolean;
    solveCaptcha: boolean;
    maxConcurrency: number;
    delayBetweenRequests: number;
  };
}

export default function FormSubmissionReal() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Available agents - must be declared before state that uses it
  const availableAgents: AgentType[] = [
    {
      id: 'standard-form',
      name: 'Standard Form Automation',
      type: 'automation',
      description: 'Basic form filling with validation and error handling',
      capabilities: ['form-filling', 'validation', 'error-handling'],
      icon: 'FileText',
      successRate: 85,
      responseTime: '2-5s',
      cost: 'Free'
    },
    {
      id: 'mcp-intelligence',
      name: 'MCP Intelligence Agent',
      type: 'mcp',
      description: 'AI-powered form analysis and intelligent field mapping',
      capabilities: ['ai-analysis', 'field-mapping', 'smart-filling', 'captcha-solving'],
      icon: 'Bot',
      successRate: 92,
      responseTime: '3-8s',
      cost: 'Low'
    },
    {
      id: 'vision-analyzer',
      name: 'Vision Analysis Agent',
      type: 'vision',
      description: 'Visual form detection and OCR-based field recognition',
      capabilities: ['visual-detection', 'ocr', 'image-analysis', 'complex-forms'],
      icon: 'Eye',
      successRate: 88,
      responseTime: '5-12s',
      cost: 'Medium'
    },
    {
      id: 'skyvern-automation',
      name: 'Skyvern Browser Agent',
      type: 'browser',
      description: 'Advanced browser automation with human-like interactions',
      capabilities: ['browser-automation', 'human-behavior', 'complex-navigation', 'dynamic-content'],
      icon: 'Globe',
      successRate: 95,
      responseTime: '8-15s',
      cost: 'High'
    },
    {
      id: 'browser-use-agent',
      name: 'Browser Use Agent',
      type: 'browser',
      description: 'Intelligent browser control with natural language commands',
      capabilities: ['natural-language', 'intelligent-navigation', 'adaptive-behavior', 'context-awareness'],
      icon: 'MonitorPlay',
      successRate: 90,
      responseTime: '6-12s',
      cost: 'Medium'
    },
    {
      id: 'playwright-enhanced',
      name: 'Playwright Enhanced',
      type: 'automation',
      description: 'Advanced Playwright automation with AI enhancements',
      capabilities: ['playwright-core', 'ai-enhancement', 'multi-browser', 'headless-support'],
      icon: 'Zap',
      successRate: 94,
      responseTime: '4-10s',
      cost: 'Low'
    },
    {
      id: 'selenium-grid',
      name: 'Selenium Grid Agent',
      type: 'automation',
      description: 'Distributed Selenium automation with cloud scaling',
      capabilities: ['distributed-testing', 'cross-browser', 'parallel-execution', 'cloud-scaling'],
      icon: 'Activity',
      successRate: 87,
      responseTime: '10-20s',
      cost: 'Variable'
    }
  ];

  // Core state
  const [jobs, setJobs] = useState<FormSubmissionJob[]>([]);
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
  const [sessions, setSessions] = useState<Record<string, SessionData>>({});
  const [profiles, setProfiles] = useState<FormProfile[]>([]);
  const [crmLists, setCrmLists] = useState<CRMList[]>([]);
  const [mcpHealth, setMcpHealth] = useState<any>(null);
  const [wsConnected, setWsConnected] = useState(false);

  // Form state
  const [activeTab, setActiveTab] = useState('single');
  const [newUrl, setNewUrl] = useState('');
  const [batchUrls, setBatchUrls] = useState<string[]>(['']);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('none');
  const [selectedCrmListId, setSelectedCrmListId] = useState<string>('none');
  const [customData, setCustomData] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedJobForSession, setSelectedJobForSession] = useState<string | null>(null);
  const [sessionLogs, setSessionLogs] = useState<any[]>([]);

  // Profile management state
  const [showProfileManager, setShowProfileManager] = useState(false);
  const [editingProfile, setEditingProfile] = useState<FormProfile | null>(null);
  const [newProfileData, setNewProfileData] = useState({
    name: '',
    description: '',
    fields: {} as Record<string, { value: string; required: boolean; type: string; label: string }>
  });

  // Batch processing state
  const [batchSettings, setBatchSettings] = useState({
    useAI: true,
    takeScreenshots: true,
    solveCaptcha: true,
    maxConcurrency: 5,
    delayBetweenRequests: 2000
  });

  // Agent selection state
  const [selectedAgents, setSelectedAgents] = useState<SelectedAgent>({
    primary: availableAgents.find(a => a.id === 'mcp-intelligence') || availableAgents[0],
    fallbacks: [],
    enhancements: []
  });
  const [showAgentWizard, setShowAgentWizard] = useState(false);

  // WebSocket integration for real-time updates
  const { isConnected: wsIsConnected, sendMessage: wsSendMessage, addMessageHandler, removeMessageHandler } = useWebSocket('/ws', {
    reconnect: true,
    heartbeat: true,
    messageQueue: true
  });

  useEffect(() => {
    setWsConnected(wsIsConnected);
  }, [wsIsConnected]);

  // Form submission WebSocket handlers
  useEffect(() => {
    const handleFormSubmissionEvent = (message: any) => {
      console.log('[Form Submission WS] Received message:', message);
      
      switch (message.type) {
        case 'form_submission.job_created':
        case 'form_submission.job_started':
        case 'form_submission.job_progress':
        case 'form_submission.job_completed':
        case 'form_submission.job_failed':
          // Update jobs list from server
          loadJobs();
          break;
        case 'form_submission.url_processed':
          console.log('URL processed:', message.payload);
          break;
        case 'form_submission.captcha_solved':
          console.log('Captcha solved:', message.payload);
          break;
        case 'form_submission.form_detected':
          console.log('Form detected:', message.payload);
          break;
      }
    };

    // Subscribe to form submission events
    if (wsIsConnected) {
      // Subscribe to all form submission events
      wsSendMessage({
        type: 'form_submission.subscribe',
        payload: { all: true }
      });
      
      // Add message handlers
      addMessageHandler('form_submission.job_created', handleFormSubmissionEvent);
      addMessageHandler('form_submission.job_started', handleFormSubmissionEvent);
      addMessageHandler('form_submission.job_progress', handleFormSubmissionEvent);
      addMessageHandler('form_submission.job_completed', handleFormSubmissionEvent);
      addMessageHandler('form_submission.job_failed', handleFormSubmissionEvent);
      addMessageHandler('form_submission.url_processed', handleFormSubmissionEvent);
      addMessageHandler('form_submission.captcha_solved', handleFormSubmissionEvent);
      addMessageHandler('form_submission.form_detected', handleFormSubmissionEvent);
    }

    return () => {
      removeMessageHandler('form_submission.job_created', handleFormSubmissionEvent);
      removeMessageHandler('form_submission.job_started', handleFormSubmissionEvent);
      removeMessageHandler('form_submission.job_progress', handleFormSubmissionEvent);
      removeMessageHandler('form_submission.job_completed', handleFormSubmissionEvent);
      removeMessageHandler('form_submission.job_failed', handleFormSubmissionEvent);
      removeMessageHandler('form_submission.url_processed', handleFormSubmissionEvent);
      removeMessageHandler('form_submission.captcha_solved', handleFormSubmissionEvent);
      removeMessageHandler('form_submission.form_detected', handleFormSubmissionEvent);
    };
  }, [wsIsConnected, wsSendMessage, addMessageHandler, removeMessageHandler]);

  // Load existing jobs
  const loadJobs = async () => {
    try {
      const response = await apiRequest('/api/form-submission/jobs');
      setJobs(response.data || []);
    } catch (error) {
      console.error('Failed to load jobs:', error);
      // Set empty array on error to prevent crashes
      setJobs([]);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadJobs();
    loadProfiles();
    loadCrmLists();
    loadMcpHealth();
    loadBatchJobs();
  }, []);

  // Load MCP health status
  const loadMcpHealth = async () => {
    try {
      const health = await apiRequest('/api/mcp/health');
      setMcpHealth(health.data);
    } catch (error) {
      console.error('Failed to load MCP health:', error);
      // Set default health status
      setMcpHealth({
        overall: { status: 'unknown', healthPercentage: 0 },
        services: {}
      });
    }
  };

  // Load batch jobs
  const loadBatchJobs = async () => {
    try {
      // For now, we'll store batch jobs locally
      // In production, this would come from an API
      const stored = localStorage.getItem('batchJobs');
      if (stored) {
        setBatchJobs(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load batch jobs:', error);
    }
  };

  // Load form profiles
  const loadProfiles = async () => {
    try {
      const stored = localStorage.getItem('formProfiles');
      if (stored) {
        setProfiles(JSON.parse(stored));
        } else {
        // Create default profiles
        const defaultProfiles: FormProfile[] = [
          {
            id: 'contact-basic',
            name: 'Basic Contact',
            description: 'Standard contact form fields',
            fields: {
              name: { value: 'John Doe', required: true, type: 'text', label: 'Full Name' },
              email: { value: 'john@example.com', required: true, type: 'email', label: 'Email Address' },
              phone: { value: '+1-555-0123', required: false, type: 'tel', label: 'Phone Number' },
              company: { value: 'ABC Company', required: false, type: 'text', label: 'Company' },
              message: { value: 'I am interested in your services.', required: false, type: 'textarea', label: 'Message' }
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            usageCount: 0
          },
          {
            id: 'business-lead',
            name: 'Business Lead',
            description: 'Professional business inquiry',
            fields: {
              name: { value: 'Jane Smith', required: true, type: 'text', label: 'Full Name' },
              email: { value: 'jane@company.com', required: true, type: 'email', label: 'Business Email' },
              phone: { value: '+1-555-0987', required: false, type: 'tel', label: 'Phone Number' },
              company: { value: 'Tech Solutions Inc.', required: true, type: 'text', label: 'Company Name' },
              title: { value: 'Marketing Director', required: false, type: 'text', label: 'Job Title' },
              website: { value: 'https://company.com', required: false, type: 'url', label: 'Company Website' },
              message: { value: 'We are looking for partnership opportunities.', required: false, type: 'textarea', label: 'Inquiry Details' }
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            usageCount: 0
          }
        ];
        setProfiles(defaultProfiles);
        localStorage.setItem('formProfiles', JSON.stringify(defaultProfiles));
      }
    } catch (error) {
      console.error('Failed to load profiles:', error);
    }
  };

  // Load CRM lists from API
  const loadCrmLists = async () => {
    try {
      console.log('Loading CRM lists from API...');
      const response = await apiRequest('/api/crm/lists');

      if (response.success && response.data) {
        // Transform API response to match component's CRMList interface
        const transformedLists: CRMList[] = response.data.map((list: any) => ({
          id: list.id,
          name: list.name,
          description: list.description || '',
          contactCount: list.count,
          fields: ['name', 'email', 'company', 'phone'], // Default fields
          createdAt: list.createdAt
        }));

        setCrmLists(transformedLists);
        console.log(`Loaded ${transformedLists.length} CRM lists from API`);
      } else {
        console.warn('CRM API returned no data, using empty list');
        setCrmLists([]);
      }
    } catch (error) {
      console.error('Failed to load CRM lists from API:', error);
      // Fallback to empty list instead of localStorage
      setCrmLists([]);
    }
  };

  // Auto-refresh jobs every 5 seconds
  useEffect(() => {
    const interval = setInterval(loadJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  // Single URL form submission
  const startSingleSubmission = async () => {
    if (!newUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid URL",
        variant: "destructive",
      });
      return;
    }

    if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
      toast({
        title: "Error",
        description: "Please enter a valid URL starting with http:// or https://",
        variant: "destructive",
      });
      return;
    }

    // Check if agents are selected
    if (!selectedAgents.primary) {
      toast({
        title: "Agent Required",
        description: "Please configure AI agents before starting form submission",
        variant: "destructive",
      });
      setShowAgentWizard(true);
      return;
    }

    setIsLoading(true);
    
    try {
      // Get form data from selected profile or custom data
      let formData = customData;
      if (selectedProfileId && selectedProfileId !== 'none') {
        const profile = profiles.find(p => p.id === selectedProfileId);
        if (profile) {
          formData = Object.fromEntries(
            Object.entries(profile.fields).map(([key, field]) => [key, field.value])
          );
        }
      }

      // Prepare the request data for the API
      const requestData = {
        url: newUrl,
        formData,
        settings: {
          useAI: true,
          takeScreenshots: true,
          solveCaptcha: true,
          maxConcurrency: 1,
          fallbackEnabled: selectedAgents.fallbacks.length > 0,
          enhancementEnabled: selectedAgents.enhancements.length > 0
        },
        agentId: selectedAgents.primary?.id || 'standard-form',
        priority: 5,
        useVisionModel: selectedAgents.primary?.type === 'vision',
        useAIFormDetection: selectedAgents.primary?.type === 'mcp' || selectedAgents.primary?.type === 'vision',
        solveCaptchas: true
      };

      console.log('Sending form submission request:', requestData);
      
      const response = await apiRequest('/api/form-submission/enhanced', {
        method: 'POST',
        data: requestData
      });

      if (response.success) {
        const job = response.data;
      setJobs(prev => [job, ...prev]);
      
        // Create session for this job if it has a sessionId from MCP
        if (job.results && job.results[0] && job.results[0].sessionId) {
          await createSessionForJob(job);

          // Update the job with session information
          try {
            await apiRequest(`/api/form-submission/jobs/${job.jobId}`, {
              method: 'PATCH',
              data: {
                sessionId: job.results[0].sessionId,
                status: 'running'
              }
            });

            // Update local job state
            setJobs(prev => prev.map(j =>
              j.id === job.jobId ? { ...j, sessionId: job.results[0].sessionId, status: 'running' } : j
            ));
          } catch (updateError) {
            console.warn('Failed to update job with session ID:', updateError);
          }
        }
        
        toast({
          title: "Form Submission Started",
          description: `AI-enhanced form submission started for ${newUrl} using ${selectedAgents.primary.name}`,
        });

        setNewUrl('');
        setCustomData({});
        setSelectedProfileId('');
      } else {
        throw new Error(response.message || 'Form submission failed');
      }

    } catch (error) {
      console.error('Failed to start submission:', error);
        toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start form submission",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

    // Create session for a job
  const createSessionForJob = async (job: FormSubmissionJob) => {
    try {
      const session: SessionData = {
        id: job.sessionId || `session-${job.id}`,
        name: `Form Submission: ${job.url.split('/')[2] || 'Unknown'}`,
        type: 'form-submission',
        status: 'running',
        browser: 'chrome',
        agentType: 'mcp-enhanced',
        metadata: {
          formUrl: job.url,
          vncUrl: `ws://localhost:6080/websockify?token=${job.sessionId}`,
          streamUrl: `ws://localhost:6080/websockify?token=${job.sessionId}`
        },
        createdAt: job.createdAt
      };

      setSessions(prev => ({ ...prev, [job.id]: session }));

      // Try to register session globally (optional)
      try {
        await apiRequest('/api/sessions', {
          method: 'POST',
          data: session
        });
    } catch (error) {
        console.warn('Failed to register session globally:', error);
        // Continue without global registration
      }

    } catch (error) {
      console.error('Failed to create session:', error);
      // Create a basic session even on error
      const basicSession: SessionData = {
        id: `session-${job.id}`,
        name: `Form Submission Session`,
        type: 'form-submission',
        status: 'running',
        createdAt: job.createdAt
      };
      setSessions(prev => ({ ...prev, [job.id]: basicSession }));
    }
  };

  // Batch form submission
  const startBatchSubmission = async () => {
    const validUrls = batchUrls.filter(url => url.trim() && url.startsWith('http'));
    if (validUrls.length === 0) {
      toast({
        title: "Error",
        description: "Please enter at least one valid URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Get form data from selected profile or CRM list
      let formData = customData;
      let batchName = `Batch Submission - ${validUrls.length} URLs`;

      if (selectedProfileId) {
        const profile = profiles.find(p => p.id === selectedProfileId);
        if (profile) {
          formData = Object.fromEntries(
            Object.entries(profile.fields).map(([key, field]) => [key, field.value])
          );
          batchName = `${profile.name} - ${validUrls.length} URLs`;
        }
      }

      // For batch processing, we'll use the regular form submission endpoint
      // and process each URL individually
      const batchPromises = validUrls.map(async (url) => {
        const requestData = {
          url,
          formData,
          settings: batchSettings,
          agentId: selectedAgents.primary?.id || 'standard-form',
          priority: 5,
          useVisionModel: selectedAgents.primary?.type === 'vision',
          useAIFormDetection: selectedAgents.primary?.type === 'mcp' || selectedAgents.primary?.type === 'vision',
          solveCaptchas: batchSettings.solveCaptcha
        };

        return apiRequest('/api/form-submission/enhanced', {
          method: 'POST',
          data: requestData
        });
      });

      // Wait for all submissions to complete
      const responses = await Promise.allSettled(batchPromises);
      const successfulSubmissions = responses.filter(r => r.status === 'fulfilled' && r.value.success);

      // Process successful submissions
      const batchResults = [];
      for (const result of responses) {
        if (result.status === 'fulfilled' && result.value.success) {
          const job = result.value.data;
          setJobs(prev => [job, ...prev]);
          batchResults.push(job);
        }
      }

      if (batchResults.length > 0) {
        // Create batch job record
        const batchJob: BatchJob = {
          id: `batch-${Date.now()}`,
          name: batchName,
          urls: validUrls,
          profileId: selectedProfileId,
          crmListId: selectedCrmListId,
          status: 'completed',
          progress: 100,
          results: batchResults,
          createdAt: new Date().toISOString(),
          settings: batchSettings
        };

        setBatchJobs(prev => [batchJob, ...prev]);
        localStorage.setItem('batchJobs', JSON.stringify([batchJob, ...batchJobs]));

        toast({
          title: "Batch Submission Completed",
          description: `Successfully processed ${batchResults.length}/${validUrls.length} URLs`,
        });

        // Reset form
        setBatchUrls(['']);
        setCustomData({});
        setSelectedProfileId('');
        setSelectedCrmListId('');
      } else {
        throw new Error('No submissions were successful');
      }

    } catch (error) {
      console.error('Failed to start batch submission:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start batch submission",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle CSV upload
  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const urls = lines.map(line => line.trim()).filter(url => url.startsWith('http'));

      if (urls.length === 0) {
        toast({
          title: "Error",
          description: "No valid URLs found in CSV file",
          variant: "destructive",
        });
        return;
      }

      setBatchUrls(urls);
      setActiveTab('batch');

      toast({
        title: "CSV Uploaded",
        description: `Loaded ${urls.length} URLs from CSV file`,
      });

    } catch (error) {
      console.error('Failed to parse CSV:', error);
      toast({
        title: "Error",
        description: "Failed to parse CSV file",
        variant: "destructive",
      });
    }
  };

  // Handle CRM list selection
  const handleCrmListSelection = (listId: string) => {
    if (listId === 'none') {
      setSelectedCrmListId('none');
      return;
    }

    const list = crmLists.find(l => l.id === listId);
    if (list) {
      // In a real implementation, this would load the actual CRM data
      // For now, we'll create sample data based on the list fields
      const sampleData: Record<string, string> = {};
      list.fields.forEach(field => {
        switch (field) {
          case 'name':
            sampleData[field] = 'John Doe';
            break;
          case 'email':
            sampleData[field] = 'john@example.com';
            break;
          case 'company':
            sampleData[field] = 'Sample Company';
            break;
          case 'phone':
            sampleData[field] = '+1-555-0123';
            break;
          case 'title':
            sampleData[field] = 'Manager';
            break;
          case 'message':
            sampleData[field] = 'Interested in your services';
            break;
          default:
            sampleData[field] = 'Sample data';
        }
      });

      setCustomData(sampleData);
      setSelectedCrmListId(listId);
      setSelectedProfileId('none'); // Clear profile selection

      toast({
        title: "CRM List Selected",
        description: `Loaded data from ${list.name} (${list.contactCount} contacts)`,
      });
    }
  };

  // Cancel job
  const cancelJob = async (jobId: string) => {
    try {
      await apiRequest(`/api/form-submission/jobs/${jobId}/cancel`, { method: 'POST' });
      toast({
        title: "Job Cancelled",
        description: "Form submission has been cancelled",
      });
    } catch (error) {
      console.error('Failed to cancel job:', error);
      toast({
        title: "Error",
        description: "Failed to cancel job",
        variant: "destructive",
      });
    }
  };

  // Retry job
  const retryJob = async (jobId: string) => {
    try {
      const response = await apiRequest(`/api/form-submission/jobs/${jobId}/retry`, { method: 'POST' });
      if (response.success) {
        const newJob = response.data;
      setJobs(prev => [newJob, ...prev]);
      toast({
        title: "Job Retried",
        description: "Form submission has been restarted",
      });
      }
    } catch (error) {
      console.error('Failed to retry job:', error);
      toast({
        title: "Error",
        description: "Failed to retry job",
        variant: "destructive",
      });
    }
  };

  // Profile management functions
  const saveProfile = () => {
    if (!newProfileData.name.trim()) {
      toast({
        title: "Error",
        description: "Profile name is required",
        variant: "destructive",
      });
      return;
    }

    const profile: FormProfile = {
      id: editingProfile ? editingProfile.id : `profile-${Date.now()}`,
      name: newProfileData.name,
      description: newProfileData.description,
      fields: newProfileData.fields,
      createdAt: editingProfile?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: editingProfile?.usageCount || 0
    };

    const updatedProfiles = editingProfile
      ? profiles.map(p => p.id === profile.id ? profile : p)
      : [...profiles, profile];

    setProfiles(updatedProfiles);
    localStorage.setItem('formProfiles', JSON.stringify(updatedProfiles));

    // Reset form
    setNewProfileData({
      name: '',
      description: '',
      fields: {}
    });
    setEditingProfile(null);
    setShowProfileManager(false);

    toast({
      title: editingProfile ? "Profile Updated" : "Profile Created",
      description: `Profile "${profile.name}" has been ${editingProfile ? 'updated' : 'created'}`,
    });
  };

  const deleteProfile = (profileId: string) => {
    const updatedProfiles = profiles.filter(p => p.id !== profileId);
    setProfiles(updatedProfiles);
    localStorage.setItem('formProfiles', JSON.stringify(updatedProfiles));

    toast({
      title: "Profile Deleted",
      description: "Form profile has been deleted",
    });
  };

  const editProfile = (profile: FormProfile) => {
    setEditingProfile(profile);
    setNewProfileData({
      name: profile.name,
      description: profile.description,
      fields: { ...profile.fields }
    });
    setShowProfileManager(true);
  };

  const addProfileField = () => {
    const fieldName = `field_${Date.now()}`;
    setNewProfileData(prev => ({
      ...prev,
      fields: {
        ...prev.fields,
        [fieldName]: {
          value: '',
          required: false,
          type: 'text',
          label: fieldName
        }
      }
    }));
  };

  const removeProfileField = (fieldName: string) => {
    setNewProfileData(prev => {
      const { [fieldName]: removed, ...remainingFields } = prev.fields;
      return {
        ...prev,
        fields: remainingFields
      };
    });
  };

  // Add URL to batch
  const addBatchUrl = () => {
    setBatchUrls(prev => [...prev, '']);
  };

  // Remove URL from batch
  const removeBatchUrl = (index: number) => {
    setBatchUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Update batch URL
  const updateBatchUrl = (index: number, url: string) => {
    setBatchUrls(prev => prev.map((u, i) => i === index ? url : u));
  };

  // Helper functions
  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'running': return <Activity className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Load session logs
  const loadSessionLogs = async (jobId: string) => {
    const session = sessions[jobId];
    if (!session) {
      setSessionLogs([]);
      return;
    }
    
    try {
      const response = await apiRequest(`/api/sessions/${session.id}/logs`);
      setSessionLogs(response.logs || []);
    } catch (error) {
      console.error('Failed to load session logs:', error);
      // Set mock logs for demonstration
      setSessionLogs([
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Session created successfully',
          source: 'system'
        },
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: `Processing form submission for ${session.metadata?.formUrl || 'unknown URL'}`,
          source: 'form-submission'
        }
      ]);
    }
  };

  // Load logs when job is selected for session view
  useEffect(() => {
    if (selectedJobForSession) {
      loadSessionLogs(selectedJobForSession);
    }
  }, [selectedJobForSession, sessions]);

  // Calculate stats
  const completedJobs = jobs.filter(j => j.status === 'completed').length;
  const runningJobs = jobs.filter(j => j.status === 'running').length;
  const successRate = jobs.length > 0 ? Math.round((completedJobs / jobs.length) * 100) : 0;

  // Determine which start function to use
  const startSubmission = activeTab === 'single' ? startSingleSubmission : startBatchSubmission;

  return (
    <div className="h-full bg-white">
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🚀 MCP-Enhanced Form Submission</h1>
            <p className="text-gray-600">AI-powered form automation with profiles, batch processing, and CRM integration</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-white">
              <Zap className="h-3 w-3 mr-1" />
              MCP Enhanced
            </Badge>
            {mcpHealth && mcpHealth.overall && (
              <Badge variant={mcpHealth.overall.status === 'healthy' ? 'default' : 'secondary'} className="gap-1">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  mcpHealth.overall.status === 'healthy' ? "bg-green-500" : "bg-red-500"
                )} />
                MCP: {mcpHealth.overall.healthPercentage || 0}%
              </Badge>
            )}
            <Badge variant={wsConnected ? 'default' : 'secondary'} className="gap-1">
              <div className={cn(
                "w-2 h-2 rounded-full",
                wsConnected ? "bg-green-500" : "bg-red-500"
              )} />
              WS: {wsConnected ? 'Connected' : 'Disconnected'}
            </Badge>
            <Button variant="outline" size="sm" onClick={loadJobs}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Enhanced Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Submissions</p>
                <p className="text-2xl font-bold">{jobs.length}</p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{successRate}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Jobs</p>
                <p className="text-2xl font-bold">{runningJobs}</p>
              </div>
              <Activity className="h-8 w-8 text-purple-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Profiles</p>
                <p className="text-2xl font-bold">{profiles.length}</p>
              </div>
              <User className="h-8 w-8 text-orange-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">CRM Lists</p>
                <p className="text-2xl font-bold">{crmLists.length}</p>
              </div>
              <Database className="h-8 w-8 text-indigo-500" />
            </div>
          </Card>
        </div>

        {/* Main Form Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="single">Single Submission</TabsTrigger>
            <TabsTrigger value="batch">Batch Processing</TabsTrigger>
            <TabsTrigger value="profiles">Profile Management</TabsTrigger>
          </TabsList>

          {/* Single Submission Tab */}
          <TabsContent value="single" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Single Form Submission
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Target URL *</label>
                <Input
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://example.com/contact"
                  className="w-full"
                />
              </div>

                {/* Profile Selection */}
              <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Form Profile</label>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Manage Profiles
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <DialogHeader>
                          <DialogTitle>Form Profiles</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {profiles.map(profile => (
                              <Card key={profile.id} className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-medium">{profile.name}</h4>
                                  <div className="flex gap-1">
                                    <Button size="sm" variant="outline" onClick={() => editProfile(profile)}>
                                      <Edit3 className="h-3 w-3" />
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => deleteProfile(profile.id)}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">{profile.description}</p>
                                <div className="text-xs text-muted-foreground">
                                  {Object.keys(profile.fields).length} fields • Used {profile.usageCount} times
                                </div>
                              </Card>
                            ))}
              </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a profile (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No profile (use custom data)</SelectItem>
                      {profiles.map(profile => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.name} - {profile.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
            </div>

                {/* CRM List Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">CRM List (Optional)</label>
                  <Select value={selectedCrmListId} onValueChange={handleCrmListSelection}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select CRM list" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No CRM list</SelectItem>
                      {crmLists.map(list => (
                        <SelectItem key={list.id} value={list.id}>
                          {list.name} ({list.contactCount} contacts)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Data Fields */}
                {selectedProfileId === 'none' && (
            <div className="space-y-4">
                    <h4 className="font-medium">Custom Form Data</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Full Name"
                        value={customData.name || ''}
                  onChange={(e) => setCustomData(prev => ({ ...prev, name: e.target.value }))}
                />
                <Input
                  placeholder="Email Address"
                        value={customData.email || ''}
                  onChange={(e) => setCustomData(prev => ({ ...prev, email: e.target.value }))}
                />
                <Input
                  placeholder="Phone Number"
                        value={customData.phone || ''}
                  onChange={(e) => setCustomData(prev => ({ ...prev, phone: e.target.value }))}
                />
                <Input
                  placeholder="Company Name"
                        value={customData.company || ''}
                  onChange={(e) => setCustomData(prev => ({ ...prev, company: e.target.value }))}
                />
              </div>
              <Textarea
                placeholder="Message (optional)"
                      value={customData.message || ''}
                onChange={(e) => setCustomData(prev => ({ ...prev, message: e.target.value }))}
                rows={3}
              />
            </div>
                )}

            {/* Agent Selection Wizard */}
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700">
                  <Bot className="h-5 w-5" />
                  AI Agent Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-blue-800">
                      {selectedAgents.primary ? selectedAgents.primary.name : 'No Primary Agent Selected'}
                    </h4>
                    <p className="text-sm text-blue-600">
                      {selectedAgents.fallbacks.length} fallback agents, {selectedAgents.enhancements.length} enhancements
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAgentWizard(true)}
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Agents
                  </Button>
                </div>

                {selectedAgents.primary && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-green-600" />
                      <span>Success: {selectedAgents.primary.successRate}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span>Speed: {selectedAgents.primary.responseTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-orange-600" />
                      <span>Cost: {selectedAgents.primary.cost}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button 
              onClick={startSubmission} 
              className="w-full md:w-auto"
              disabled={isLoading || !newUrl.trim()}
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
                  {isLoading ? 'Starting...' : 'Start Form Submission'}
            </Button>
          </CardContent>
        </Card>
          </TabsContent>

          {/* Batch Processing Tab */}
          <TabsContent value="batch" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Batch Form Processing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* CSV Upload */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Upload CSV File</label>
                  <div className="flex gap-2">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleCsvUpload}
                      className="flex-1"
                    />
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Upload a CSV file with URLs in the first column, or manually add URLs below
                  </p>
                </div>

                {/* Manual URL Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Target URLs</label>
                    <Button variant="outline" size="sm" onClick={addBatchUrl}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {batchUrls.map((url, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={url}
                          onChange={(e) => updateBatchUrl(index, e.target.value)}
                          placeholder={`https://example${index + 1}.com/contact`}
                          className="flex-1"
                        />
                        {batchUrls.length > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeBatchUrl(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Batch Settings */}
                <div className="space-y-4">
                  <h4 className="font-medium">Processing Settings</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="useAI"
                        checked={batchSettings.useAI}
                        onCheckedChange={(checked) =>
                          setBatchSettings(prev => ({ ...prev, useAI: !!checked }))
                        }
                      />
                      <Label htmlFor="useAI" className="text-sm">AI Analysis</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="takeScreenshots"
                        checked={batchSettings.takeScreenshots}
                        onCheckedChange={(checked) =>
                          setBatchSettings(prev => ({ ...prev, takeScreenshots: !!checked }))
                        }
                      />
                      <Label htmlFor="takeScreenshots" className="text-sm">Screenshots</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="solveCaptcha"
                        checked={batchSettings.solveCaptcha}
                        onCheckedChange={(checked) =>
                          setBatchSettings(prev => ({ ...prev, solveCaptcha: !!checked }))
                        }
                      />
                      <Label htmlFor="solveCaptcha" className="text-sm">Captcha Solver</Label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Max Concurrency</Label>
                      <Input
                        type="number"
                        value={batchSettings.maxConcurrency}
                        onChange={(e) => setBatchSettings(prev => ({
                          ...prev,
                          maxConcurrency: parseInt(e.target.value) || 1
                        }))}
                        min={1}
                        max={50}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Delay Between Requests (ms)</Label>
                      <Input
                        type="number"
                        value={batchSettings.delayBetweenRequests}
                        onChange={(e) => setBatchSettings(prev => ({
                          ...prev,
                          delayBetweenRequests: parseInt(e.target.value) || 0
                        }))}
                        min={0}
                      />
                    </div>
                  </div>
                </div>

                <Button
                  onClick={startSubmission}
                  className="w-full md:w-auto"
                  disabled={isLoading || batchUrls.filter(url => url.trim()).length === 0}
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  {isLoading ? 'Processing...' : `Start Batch Processing (${batchUrls.filter(url => url.trim()).length} URLs)`}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Management Tab */}
          <TabsContent value="profiles" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Form Profile Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Create and manage reusable form data profiles
                  </p>
                  <Button onClick={() => setShowProfileManager(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Profile
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profiles.map(profile => (
                    <Card key={profile.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{profile.name}</h4>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => editProfile(profile)}>
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => deleteProfile(profile.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{profile.description}</p>
                      <div className="text-xs text-muted-foreground">
                        {Object.keys(profile.fields).length} fields • Used {profile.usageCount} times
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Live Jobs and Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Live Form Submissions & Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {jobs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No form submissions yet. Start your first MCP-enhanced form submission above!</p>
                  </div>
                ) : (
                  jobs.map((job) => (
                    <div key={job.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3 flex-1">
                        <StatusIcon status={job.status} />
                        <div className="flex-1">
                          <p className="font-medium text-sm truncate max-w-xs">{job.url}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                            <span>Session: {job.sessionId?.slice(-8) || 'None'}</span>
                            <span>{new Date(job.createdAt).toLocaleString()}</span>
                          </div>
                          {job.error && (
                            <p className="text-xs text-red-600 mt-1">{job.error}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {job.status === 'running' && (
                          <div className="flex items-center gap-2">
                            <Progress value={job.progress || 0} className="w-24" />
                            <span className="text-sm text-gray-600 min-w-[3rem]">{job.progress || 0}%</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(job.status)}>
                            {job.status}
                          </Badge>
                          
                          <div className="flex gap-1">
                            {job.status === 'running' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => cancelJob(job.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                            
                            {job.status === 'failed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => retryJob(job.id)}
                              >
                                <RefreshCw className="h-3 w-3" />
                              </Button>
                            )}
                            
                            {/* VNC Live Monitoring */}
                            {sessions[job.id] && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const session = sessions[job.id];
                                    window.open(`http://localhost:6080/vnc.html?token=${session.id}`, '_blank', 'width=1200,height=800');
                                }}
                                title="Live VNC Monitor"
                              >
                                <MonitorPlay className="h-3 w-3" />
                              </Button>
                            )}
                            
                            {/* Session Logs */}
                            {sessions[job.id] && (
                              <Button
                                size="sm" 
                                variant="outline"
                                onClick={() => setSelectedJobForSession(job.id)}
                                title="View Session Logs"
                              >
                                <Terminal className="h-3 w-3" />
                              </Button>
                            )}
                            
                            {/* Screenshots */}
                            {job.screenshots && job.screenshots.length > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(job.screenshots![0], '_blank')}
                                title="View Screenshot"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Profile Manager Dialog */}
        <Dialog open={showProfileManager} onOpenChange={setShowProfileManager}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                {editingProfile ? 'Edit Profile' : 'Create New Profile'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Profile Name</Label>
                  <Input
                    value={newProfileData.name}
                    onChange={(e) => setNewProfileData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Business Lead"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={newProfileData.description}
                    onChange={(e) => setNewProfileData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of this profile"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Form Fields</Label>
                  <Button variant="outline" size="sm" onClick={addProfileField}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Field
                  </Button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {Object.entries(newProfileData.fields).map(([fieldName, field]) => (
                    <div key={fieldName} className="flex gap-2 items-center p-2 border rounded">
                      <Input
                        placeholder="Field name"
                        value={fieldName}
                        onChange={(e) => {
                          const newFields = { ...newProfileData.fields };
                          const newFieldName = e.target.value;
                          delete newFields[fieldName];
                          newFields[newFieldName] = field;
                          setNewProfileData(prev => ({ ...prev, fields: newFields }));
                        }}
                        className="flex-1"
                      />
                      <select
                        value={field.type}
                        onChange={(e) => setNewProfileData(prev => ({
                          ...prev,
                          fields: {
                            ...prev.fields,
                            [fieldName]: { ...field, type: e.target.value as any }
                          }
                        }))}
                        className="p-2 border rounded"
                      >
                        <option value="text">Text</option>
                        <option value="email">Email</option>
                        <option value="tel">Phone</option>
                        <option value="url">URL</option>
                        <option value="textarea">Textarea</option>
                      </select>
                      <Input
                        placeholder="Value"
                        value={field.value}
                        onChange={(e) => setNewProfileData(prev => ({
                          ...prev,
                          fields: {
                            ...prev.fields,
                            [fieldName]: { ...field, value: e.target.value }
                          }
                        }))}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Label"
                        value={field.label}
                        onChange={(e) => setNewProfileData(prev => ({
                          ...prev,
                          fields: {
                            ...prev.fields,
                            [fieldName]: { ...field, label: e.target.value }
                          }
                        }))}
                        className="flex-1"
                      />
                      <Checkbox
                        checked={field.required}
                        onCheckedChange={(checked) => setNewProfileData(prev => ({
                          ...prev,
                          fields: {
                            ...prev.fields,
                            [fieldName]: { ...field, required: !!checked }
                          }
                        }))}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeProfileField(fieldName)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowProfileManager(false)}>
                  Cancel
                </Button>
                <Button onClick={saveProfile}>
                  {editingProfile ? 'Update Profile' : 'Create Profile'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Session Logs Dialog */}
        <Dialog open={!!selectedJobForSession} onOpenChange={() => setSelectedJobForSession(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                Session Logs - {selectedJobForSession && jobs.find(j => j.id === selectedJobForSession)?.url}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Session Info */}
              {selectedJobForSession && sessions[selectedJobForSession] && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="p-3">
                    <div className="text-sm font-medium text-muted-foreground">Session ID</div>
                    <div className="text-xs font-mono">{sessions[selectedJobForSession].id}</div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-sm font-medium text-muted-foreground">Status</div>
                    <Badge className={getStatusColor(sessions[selectedJobForSession].status)}>
                      {sessions[selectedJobForSession].status}
                    </Badge>
                  </Card>
                  <Card className="p-3">
                    <div className="text-sm font-medium text-muted-foreground">Agent</div>
                    <div className="text-sm">{sessions[selectedJobForSession].agentType}</div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-sm font-medium text-muted-foreground">Browser</div>
                    <div className="text-sm capitalize">{sessions[selectedJobForSession].browser}</div>
                  </Card>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => selectedJobForSession && loadSessionLogs(selectedJobForSession)}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Logs
                </Button>
                
                {selectedJobForSession && sessions[selectedJobForSession] && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const session = sessions[selectedJobForSession];
                      window.open(`http://localhost:6080/vnc.html?token=${session.id}`, '_blank', 'width=1200,height=800');
                    }}
                  >
                    <MonitorPlay className="h-4 w-4 mr-2" />
                    Open VNC Monitor
                  </Button>
                )}
              </div>

              {/* Logs Display */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Live Session Logs</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96 w-full">
                    <div className="space-y-2 font-mono text-xs">
                      {sessionLogs.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No logs available yet. Session may still be starting...</p>
                        </div>
                      ) : (
                        sessionLogs.map((log, index) => (
                          <div key={index} className="flex gap-3 p-2 rounded bg-gray-50 hover:bg-gray-100">
                            <span className="text-muted-foreground whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                            <Badge 
                              variant="outline" 
                              className={`min-w-fit ${
                                log.level === 'error' ? 'border-red-500 text-red-700' :
                                log.level === 'warn' ? 'border-orange-500 text-orange-700' :
                                'border-blue-500 text-blue-700'
                              }`}
                            >
                              {log.level}
                            </Badge>
                            <span className="text-muted-foreground text-xs">[{log.source}]</span>
                            <span className="flex-1">{log.message}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>

        {/* Agent Selection Wizard */}
        <Dialog open={showAgentWizard} onOpenChange={setShowAgentWizard}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                AI Agent Configuration Wizard
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Primary Agent Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Primary Agent</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Choose the main agent for form submission. This agent will handle the primary task.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availableAgents.map((agent) => (
                      <Card
                        key={agent.id}
                        className={`cursor-pointer transition-all ${
                          selectedAgents.primary?.id === agent.id
                            ? 'ring-2 ring-blue-500 bg-blue-50'
                            : 'hover:shadow-md'
                        }`}
                        onClick={() => setSelectedAgents(prev => ({ ...prev, primary: agent }))}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            {agent.icon === 'FileText' && <FileText className="h-6 w-6 text-gray-600" />}
                            {agent.icon === 'Bot' && <Bot className="h-6 w-6 text-blue-600" />}
                            {agent.icon === 'Eye' && <Eye className="h-6 w-6 text-purple-600" />}
                            {agent.icon === 'Globe' && <Globe className="h-6 w-6 text-green-600" />}
                            {agent.icon === 'MonitorPlay' && <MonitorPlay className="h-6 w-6 text-orange-600" />}
                            {agent.icon === 'Zap' && <Zap className="h-6 w-6 text-yellow-600" />}
                            {agent.icon === 'Activity' && <Activity className="h-6 w-6 text-red-600" />}
                            <div>
                              <h4 className="font-semibold">{agent.name}</h4>
                              <Badge variant="outline" className="text-xs">
                                {agent.type}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{agent.description}</p>
                          <div className="flex justify-between text-xs">
                            <span className="flex items-center gap-1">
                              <Target className="h-3 w-3 text-green-600" />
                              {agent.successRate}%
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-blue-600" />
                              {agent.responseTime}
                            </span>
                            <span className="flex items-center gap-1">
                              <Zap className="h-3 w-3 text-orange-600" />
                              {agent.cost}
                            </span>
                          </div>
                          <div className="mt-2">
                            <div className="flex flex-wrap gap-1">
                              {agent.capabilities.slice(0, 3).map((cap, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {cap}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Fallback Agents */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Fallback Agents</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Select agents to use if the primary agent fails. These will be tried in order.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {availableAgents
                      .filter(agent => agent.id !== selectedAgents.primary?.id)
                      .map((agent) => {
                        const isSelected = selectedAgents.fallbacks.some(f => f.id === agent.id);
                        return (
                          <div
                            key={agent.id}
                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                              isSelected ? 'bg-green-50 border-green-300' : 'hover:bg-gray-50'
                            }`}
                            onClick={() => {
                              setSelectedAgents(prev => ({
                                ...prev,
                                fallbacks: isSelected
                                  ? prev.fallbacks.filter(f => f.id !== agent.id)
                                  : [...prev.fallbacks, agent]
                              }));
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox checked={isSelected} />
                              <div>
                                <h4 className="font-medium">{agent.name}</h4>
                                <p className="text-sm text-muted-foreground">{agent.description}</p>
                              </div>
                            </div>
                            <Badge variant="outline">{agent.successRate}% success</Badge>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>

              {/* Enhancement Agents */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Enhancement Agents</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Add additional agents to enhance the form submission process with extra capabilities.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {availableAgents.map((agent) => {
                      const isSelected = selectedAgents.enhancements.some(e => e.id === agent.id);
                      return (
                        <div
                          key={agent.id}
                          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                            isSelected ? 'bg-purple-50 border-purple-300' : 'hover:bg-gray-50'
                          }`}
                          onClick={() => {
                            setSelectedAgents(prev => ({
                              ...prev,
                              enhancements: isSelected
                                ? prev.enhancements.filter(e => e.id !== agent.id)
                                : [...prev.enhancements, agent]
                            }));
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox checked={isSelected} />
                            <div>
                              <h4 className="font-medium">{agent.name}</h4>
                              <p className="text-sm text-muted-foreground">{agent.description}</p>
                            </div>
                          </div>
                          <Badge variant="outline">{agent.responseTime}</Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Configuration Summary */}
              {selectedAgents.primary && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-blue-700">Configuration Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-blue-800">Primary Agent:</h4>
                        <p className="text-blue-700">{selectedAgents.primary.name}</p>
                      </div>

                      {selectedAgents.fallbacks.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-blue-800">Fallback Agents:</h4>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {selectedAgents.fallbacks.map((agent, idx) => (
                              <Badge key={idx} variant="outline" className="text-blue-700">
                                {agent.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedAgents.enhancements.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-blue-800">Enhancement Agents:</h4>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {selectedAgents.enhancements.map((agent, idx) => (
                              <Badge key={idx} variant="outline" className="text-purple-700">
                                {agent.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {Math.round(
                              selectedAgents.primary.successRate * 0.8 +
                              selectedAgents.fallbacks.reduce((acc, f) => acc + f.successRate * 0.1, 0) +
                              selectedAgents.enhancements.reduce((acc, e) => acc + e.successRate * 0.05, 0)
                            )}%
                          </div>
                          <div className="text-sm text-muted-foreground">Estimated Success</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {selectedAgents.primary.responseTime.split('-')[0]}s
                          </div>
                          <div className="text-sm text-muted-foreground">Avg Response Time</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">
                            {selectedAgents.primary.cost === 'Free' ? 'Free' :
                             selectedAgents.fallbacks.length + selectedAgents.enhancements.length > 0 ? 'Mixed' :
                             selectedAgents.primary.cost}
                          </div>
                          <div className="text-sm text-muted-foreground">Total Cost</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowAgentWizard(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => setShowAgentWizard(false)}
                  disabled={!selectedAgents.primary}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Apply Configuration
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}