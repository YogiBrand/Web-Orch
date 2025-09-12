export interface SessionData {
  id: string;
  sessionId: string;
  status: "idle" | "running" | "completed" | "failed";
  url?: string;
  userAgent?: string;
  viewport?: {
    width: number;
    height: number;
  };
  cookies: boolean;
  proxy: boolean;
  stealth: boolean;
  solveCaptcha: boolean;
  duration: number;
  creditUsed: number;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

export interface TaskData {
  id: string;
  description: string;
  llmModel: string;
  parallelSessions: number;
  targetUrls: string[];
  status: "pending" | "running" | "completed" | "failed";
  results?: any;
  createdAt: Date;
  completedAt?: Date;
}

export interface MetricsData {
  creditUsage: number;
  activeSessions: number;
  pagesScraped: number;
  browserMinutes: number;
  proxyDataMB: number;
}

export interface ScriptData {
  id: string;
  name: string;
  language: "javascript" | "python";
  code: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserData {
  id: string;
  username: string;
  apiKey: string;
}

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}
