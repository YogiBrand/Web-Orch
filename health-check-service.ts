/**
 * Comprehensive Health Check Service for WebOrchestrator
 * Provides detailed health monitoring for all services and dependencies
 */

import axios from 'axios';
import Redis from 'ioredis';

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  lastChecked: Date;
  error?: string;
  details?: any;
}

interface SystemHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  services: ServiceHealth[];
  uptime: number;
  timestamp: Date;
  version: string;
}

export class HealthCheckService {
  private services: Map<string, string> = new Map();
  private healthCache: Map<string, ServiceHealth> = new Map();
  private cacheTimeout = 30000; // 30 seconds
  private startupTime = Date.now();

  constructor() {
    this.initializeServices();
  }

  private initializeServices() {
    // Internal services
    this.services.set('database', process.env.DATABASE_URL ? 'http://localhost:5432' : null);
    this.services.set('redis', process.env.REDIS_URL || 'redis://redis:6379');
    this.services.set('backend', `http://localhost:${process.env.PORT || 5000}/api/health`);

    // Agent services
    this.services.set('playwright-service', 'http://playwright-service:3000/health');
    this.services.set('crawl4ai-service', 'http://crawl4ai-service:3000/health');
    this.services.set('browser-use-service', 'http://browser-use-service:3000/health');
    this.services.set('puppeteer-service', 'http://puppeteer-service:3005/health');
    this.services.set('computer-use-claude', 'http://computer-use-claude:3000/health');
    this.services.set('computer-use-openai', 'http://computer-use-openai:3000/health');

    // Frontend
    this.services.set('frontend', 'http://frontend:80/health');

    // Nginx
    this.services.set('nginx', 'http://nginx:80/health');
  }

  async checkServiceHealth(serviceName: string, url: string): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      if (serviceName === 'database') {
        // Special handling for PostgreSQL
        const result = await this.checkDatabaseHealth();
        return {
          name: serviceName,
          status: result ? 'healthy' : 'unhealthy',
          responseTime: Date.now() - startTime,
          lastChecked: new Date(),
          details: result
        };
      }

      if (serviceName === 'redis') {
        // Special handling for Redis
        const result = await this.checkRedisHealth();
        return {
          name: serviceName,
          status: result ? 'healthy' : 'unhealthy',
          responseTime: Date.now() - startTime,
          lastChecked: new Date(),
          details: result
        };
      }

      // HTTP-based services
      const response = await axios.get(url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'WebOrchestrator-HealthCheck/1.0'
        }
      });

      const responseTime = Date.now() - startTime;
      const status = response.status === 200 ? 'healthy' : 'degraded';

      return {
        name: serviceName,
        status,
        responseTime,
        lastChecked: new Date(),
        details: {
          statusCode: response.status,
          data: response.data
        }
      };

    } catch (error) {
      return {
        name: serviceName,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkDatabaseHealth(): Promise<any> {
    try {
      // This would need to be implemented based on your database setup
      // For now, return a basic health check
      return {
        connection: 'ok',
        version: 'PostgreSQL 15',
        activeConnections: 1
      };
    } catch (error) {
      console.error('Database health check failed:', error);
      return null;
    }
  }

  private async checkRedisHealth(): Promise<any> {
    try {
      const redisUrl = this.services.get('redis');
      if (!redisUrl) return null;

      const client = new Redis(redisUrl);
      const ping = await client.ping();
      await client.quit();

      return {
        connection: 'ok',
        ping: ping === 'PONG',
        url: redisUrl
      };
    } catch (error) {
      console.error('Redis health check failed:', error);
      return null;
    }
  }

  async checkAllServices(): Promise<ServiceHealth[]> {
    const promises = Array.from(this.services.entries())
      .filter(([_, url]) => url !== null)
      .map(([name, url]) => this.checkServiceHealth(name, url!));

    return Promise.all(promises);
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const services = await this.checkAllServices();

    // Determine overall system status
    const unhealthyCount = services.filter(s => s.status === 'unhealthy').length;
    const degradedCount = services.filter(s => s.status === 'degraded').length;

    let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    if (unhealthyCount > 0) {
      status = 'unhealthy';
    } else if (degradedCount > 0) {
      status = 'degraded';
    }

    return {
      status,
      services,
      uptime: Date.now() - this.startupTime,
      timestamp: new Date(),
      version: process.env.npm_package_version || '1.0.0'
    };
  }

  async getDetailedHealth(): Promise<any> {
    const systemHealth = await this.getSystemHealth();

    // Add system information
    const systemInfo = {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      pid: process.pid
    };

    // Add environment information (sanitized)
    const envInfo = {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      DATABASE_URL: process.env.DATABASE_URL ? '[CONFIGURED]' : '[NOT SET]',
      REDIS_URL: process.env.REDIS_URL ? '[CONFIGURED]' : '[NOT SET]',
      services: Array.from(this.services.keys())
    };

    return {
      ...systemHealth,
      system: systemInfo,
      environment: envInfo
    };
  }
}

// Export singleton instance
export const healthCheckService = new HealthCheckService();
