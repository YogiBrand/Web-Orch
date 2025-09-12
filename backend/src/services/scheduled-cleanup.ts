import * as cron from 'node-cron';
import { FileOffloaderService } from './file-offloader.js';
import { GoogleDriveConfig } from './google-drive.js';
import winston from 'winston';

export interface CleanupSchedule {
  cronExpression: string;
  enabled: boolean;
  basePath: string;
  maxRetries: number;
  retryDelay: number; // in minutes
}

export class ScheduledCleanupService {
  private offloaderService: FileOffloaderService | null = null;
  private schedule: CleanupSchedule;
  private cronJob: cron.ScheduledTask | null = null;
  private logger: winston.Logger;
  private isRunning: boolean = false;
  private lastRun: Date | null = null;
  private lastResult: any = null;

  constructor(
    driveConfig: GoogleDriveConfig | null,
    scheduleConfig: Partial<CleanupSchedule> = {}
  ) {
    // Setup logger
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({
          filename: '/home/yogi/Orchestrator/logs/cleanup.log',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        }),
      ],
    });

    // Initialize offloader service if config is provided
    if (driveConfig) {
      try {
        this.offloaderService = new FileOffloaderService(driveConfig);
        this.logger.info('File offloader service initialized successfully');
      } catch (error) {
        this.logger.error('Failed to initialize file offloader service:', error);
      }
    }

    // Default schedule configuration
    this.schedule = {
      cronExpression: '0 2 * * *', // Daily at 2 AM
      enabled: true,
      basePath: '/home/yogi/Orchestrator',
      maxRetries: 3,
      retryDelay: 5,
      ...scheduleConfig,
    };

    this.logger.info('Scheduled cleanup service initialized', {
      schedule: this.schedule,
      hasOffloader: !!this.offloaderService,
    });
  }

  /**
   * Start the scheduled cleanup
   */
  start(): void {
    if (this.cronJob) {
      this.logger.warn('Cleanup schedule already running');
      return;
    }

    if (!this.schedule.enabled) {
      this.logger.info('Cleanup schedule is disabled');
      return;
    }

    if (!this.offloaderService) {
      this.logger.error('Cannot start cleanup: offloader service not initialized');
      return;
    }

    try {
      this.cronJob = cron.schedule(this.schedule.cronExpression, async () => {
        await this.runCleanup();
      });

      this.logger.info('Scheduled cleanup started', {
        cronExpression: this.schedule.cronExpression,
      });
    } catch (error) {
      this.logger.error('Failed to start scheduled cleanup:', error);
    }
  }

  /**
   * Stop the scheduled cleanup
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      this.logger.info('Scheduled cleanup stopped');
    }
  }

  /**
   * Run cleanup manually
   */
  async runCleanupNow(): Promise<any> {
    if (!this.offloaderService) {
      throw new Error('Offloader service not initialized');
    }

    return await this.runCleanup();
  }

  /**
   * Internal cleanup execution
   */
  private async runCleanup(): Promise<any> {
    if (this.isRunning) {
      this.logger.warn('Cleanup already running, skipping this execution');
      return { skipped: true, reason: 'already_running' };
    }

    this.isRunning = true;
    this.lastRun = new Date();

    try {
      this.logger.info('Starting scheduled cleanup', {
        basePath: this.schedule.basePath,
        timestamp: this.lastRun.toISOString(),
      });

      // Get storage summary before cleanup
      const beforeSummary = await this.offloaderService.getStorageSummary(this.schedule.basePath);

      // Run offloading with retries
      let results = null;
      let attempt = 0;
      let lastError = null;

      while (attempt < this.schedule.maxRetries) {
        try {
          results = await this.offloaderService.runOffloading(this.schedule.basePath);
          break; // Success, exit retry loop
        } catch (error) {
          attempt++;
          lastError = error;
          this.logger.warn(`Cleanup attempt ${attempt} failed:`, error);

          if (attempt < this.schedule.maxRetries) {
            const delayMs = this.schedule.retryDelay * 60 * 1000;
            this.logger.info(`Retrying in ${this.schedule.retryDelay} minutes...`);
            await this.delay(delayMs);
          }
        }
      }

      if (!results) {
        throw lastError || new Error('All cleanup attempts failed');
      }

      // Get storage summary after cleanup
      const afterSummary = await this.offloaderService.getStorageSummary(this.schedule.basePath);

      const cleanupResult = {
        success: true,
        timestamp: new Date().toISOString(),
        duration: Date.now() - this.lastRun.getTime(),
        attempts: attempt + 1,
        storage: {
          before: beforeSummary,
          after: afterSummary,
          saved: beforeSummary ? beforeSummary.totalSize - (afterSummary?.totalSize || 0) : 0,
        },
        offloading: results,
      };

      this.lastResult = cleanupResult;

      this.logger.info('Scheduled cleanup completed successfully', {
        filesProcessed: results.filesProcessed,
        filesOffloaded: results.filesOffloaded,
        totalSizeBytes: results.totalSize,
        totalSizeMB: (results.totalSize / (1024 * 1024)).toFixed(2),
        duration: cleanupResult.duration,
      });

      return cleanupResult;

    } catch (error) {
      const errorResult = {
        success: false,
        timestamp: new Date().toISOString(),
        duration: Date.now() - this.lastRun.getTime(),
        error: error instanceof Error ? error.message : String(error),
      };

      this.lastResult = errorResult;
      this.logger.error('Scheduled cleanup failed:', error);

      return errorResult;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get cleanup status
   */
  getStatus(): any {
    return {
      isRunning: this.isRunning,
      isScheduled: !!this.cronJob,
      lastRun: this.lastRun?.toISOString(),
      lastResult: this.lastResult,
      schedule: this.schedule,
      hasOffloader: !!this.offloaderService,
    };
  }

  /**
   * Update schedule configuration
   */
  updateSchedule(newSchedule: Partial<CleanupSchedule>): void {
    const wasRunning = !!this.cronJob;

    if (wasRunning) {
      this.stop();
    }

    this.schedule = { ...this.schedule, ...newSchedule };

    this.logger.info('Cleanup schedule updated', { newSchedule });

    if (wasRunning && this.schedule.enabled) {
      this.start();
    }
  }

  /**
   * Reinitialize with new Google Drive config
   */
  reinitialize(driveConfig: GoogleDriveConfig | null): void {
    const wasRunning = !!this.cronJob;

    if (wasRunning) {
      this.stop();
    }

    try {
      if (driveConfig) {
        this.offloaderService = new FileOffloaderService(driveConfig);
        this.logger.info('Offloader service reinitialized successfully');
      } else {
        this.offloaderService = null;
        this.logger.warn('Offloader service disabled - no config provided');
      }
    } catch (error) {
      this.offloaderService = null;
      this.logger.error('Failed to reinitialize offloader service:', error);
    }

    if (wasRunning && this.schedule.enabled && this.offloaderService) {
      this.start();
    }
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean shutdown
   */
  shutdown(): void {
    this.stop();
    this.logger.info('Scheduled cleanup service shut down');
  }
}

// Global instance for easy access
let globalCleanupService: ScheduledCleanupService | null = null;

/**
 * Initialize global cleanup service
 */
export function initializeCleanupService(
  driveConfig: GoogleDriveConfig | null,
  scheduleConfig?: Partial<CleanupSchedule>
): ScheduledCleanupService {
  if (globalCleanupService) {
    globalCleanupService.shutdown();
  }

  globalCleanupService = new ScheduledCleanupService(driveConfig, scheduleConfig);

  // Auto-start if enabled
  if (globalCleanupService.getStatus().schedule.enabled && driveConfig) {
    globalCleanupService.start();
  }

  return globalCleanupService;
}

/**
 * Get global cleanup service instance
 */
export function getCleanupService(): ScheduledCleanupService | null {
  return globalCleanupService;
}

export default ScheduledCleanupService;

