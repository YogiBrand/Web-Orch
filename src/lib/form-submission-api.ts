/**
 * Production Form Submission API Client
 * Handles real form submissions with AI-powered automation
 */

import { api } from './api';

export interface FormSubmissionJob {
  id: string;
  url: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  fieldsFound: number;
  fieldsCompleted: number;
  customData?: Record<string, string>;
  error?: string;
  screenshot?: string;
  createdAt: string;
  completedAt?: string;
  agent: 'ai-vision' | 'skyvern' | 'hybrid';
}

export interface FormSubmissionTemplate {
  id: string;
  name: string;
  fields: Record<string, string>;
  description: string;
}

class FormSubmissionAPI {
  private baseUrl = '/api/form-submission';
  private wsConnection?: WebSocket;
  private listeners: Set<(job: FormSubmissionJob) => void> = new Set();

  async startSubmission(params: {
    url: string;
    customData?: Record<string, string>;
    agent?: 'ai-vision' | 'skyvern' | 'hybrid';
    template?: string;
  }): Promise<FormSubmissionJob> {
    const response = await api.post(`${this.baseUrl}/start`, {
      url: params.url,
      customData: params.customData || {},
      agent: params.agent || 'hybrid',
      template: params.template
    });
    
    return response.data;
  }

  async getJob(jobId: string): Promise<FormSubmissionJob> {
    const response = await api.get(`${this.baseUrl}/job/${jobId}`);
    return response.data;
  }

  async getAllJobs(): Promise<FormSubmissionJob[]> {
    const response = await api.get(`${this.baseUrl}/jobs`);
    return response.data;
  }

  async cancelJob(jobId: string): Promise<void> {
    await api.post(`${this.baseUrl}/job/${jobId}/cancel`);
  }

  async getTemplates(): Promise<FormSubmissionTemplate[]> {
    const response = await api.get(`${this.baseUrl}/templates`);
    return response.data;
  }

  async retryJob(jobId: string): Promise<FormSubmissionJob> {
    const response = await api.post(`${this.baseUrl}/job/${jobId}/retry`);
    return response.data;
  }

  // Real-time updates via WebSocket (subscribes to form_submission events)
  connectWebSocket(onUpdate: (job: FormSubmissionJob) => void) {
    this.listeners.add(onUpdate);

    if (!this.wsConnection || this.wsConnection.readyState !== WebSocket.OPEN) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const base = (import.meta as any).env?.VITE_WS_BASE_URL as string;
      const wsUrl = base && (base.startsWith('ws://') || base.startsWith('wss://'))
        ? base
        : `${protocol}//${window.location.host}/ws`;

      this.wsConnection = new WebSocket(wsUrl);

      this.wsConnection.onopen = () => {
        // Subscribe to all form submission updates; server supports job-specific too
        try {
          this.wsConnection?.send(JSON.stringify({
            type: 'form_submission.subscribe',
            payload: {}
          }));
        } catch {}
      };

      this.wsConnection.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          // If server sends canonical events (type + payload), map to a minimal job shape
          if (msg && typeof msg === 'object' && typeof msg.type === 'string' && msg.type.startsWith('form_submission.')) {
            const p = msg.payload || {};
            const statusFromType = (t: string): FormSubmissionJob['status'] => {
              if (t.endsWith('job_started')) return 'running';
              if (t.endsWith('job_completed')) return 'completed';
              if (t.endsWith('job_failed')) return 'failed';
              return 'pending';
            };

            const progressPct = typeof p.completed === 'number' && typeof p.total === 'number' && p.total > 0
              ? Math.round((p.completed / p.total) * 100)
              : (typeof p.progress === 'number' ? p.progress : 0);

            const job: FormSubmissionJob = {
              id: p.jobId || p.id || 'unknown',
              url: p.currentUrl || p.url || '',
              status: (p.status as any) || statusFromType(msg.type),
              progress: progressPct || 0,
              fieldsFound: 0,
              fieldsCompleted: 0,
              customData: p.customData || {},
              error: p.error || p.errorMessage || undefined,
              screenshot: p.screenshotPath || undefined,
              createdAt: new Date().toISOString(),
              agent: 'hybrid',
            };
            this.listeners.forEach(listener => listener(job));
            return;
          }

          // Fallback: attempt direct job parsing
          const job: FormSubmissionJob = msg as FormSubmissionJob;
          if (job && job.id) {
            this.listeners.forEach(listener => listener(job));
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.wsConnection.onclose = () => {
        console.log('WebSocket connection closed, attempting to reconnect...');
        setTimeout(() => this.connectWebSocket(onUpdate), 3000);
      };

      this.wsConnection.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    }

    return () => {
      this.listeners.delete(onUpdate);
      if (this.listeners.size === 0 && this.wsConnection) {
        this.wsConnection.close();
        this.wsConnection = undefined;
      }
    };
  }
}

export const formSubmissionAPI = new FormSubmissionAPI();
