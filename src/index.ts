// Shared types and utilities for Nexus AI Workspace

// Export all agent registry types
export * from './agent-types';

// Legacy Nexus types (kept for compatibility)
export interface NexusAgent {
  id: string;
  name: string;
  type: 'llm' | 'ide' | 'browser' | 'automation' | 'specialized';
  capabilities: string[];
  status: 'idle' | 'active' | 'busy' | 'error';
}

export interface NexusWorkspace {
  id: string;
  name: string;
  description: string;
  agents: NexusAgent[];
  status: 'draft' | 'active' | 'paused' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export interface NexusTask {
  id: string;
  workspaceId: string;
  agentId?: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  priority: number;
  createdAt: Date;
}

export interface NexusMessage {
  id: string;
  type: string;
  timestamp: string;
  data: any;
  workspaceId?: string;
  agentId?: string;
}

// Utility functions
export const formatAgentStatus = (status: NexusAgent['status']): string => {
  const statusMap = {
    idle: '💤 Idle',
    active: '🟢 Active',
    busy: '🔄 Busy',
    error: '❌ Error'
  };
  return statusMap[status] || '❓ Unknown';
};

export const calculateWorkspaceProgress = (tasks: NexusTask[]): number => {
  if (tasks.length === 0) return 0;
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  return (completedTasks / tasks.length) * 100;
};
