import winston from 'winston';
import { 
  TaskRun, 
  TaskStep, 
  LogEvent, 
  FailurePattern, 
  PerformanceMetric,
  AnalyticsData,
  TaskStatus,
  EventType,
  AppError
} from '../types';
import DatabaseService from './database';
import CacheService from './cache';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'analytics.log' })
  ]
});

interface FailurePatternDetectionResult {
  new_patterns: FailurePattern[];
  updated_patterns: FailurePattern[];
  total_analyzed: number;
}

interface PerformanceTrend {
  timestamp: string;
  avg_duration: number;
  task_count: number;
  success_rate: number;
  error_rate: number;
  tool: string;
}

interface AlertCondition {
  id: string;
  name: string;
  condition: (metrics: any) => boolean;
  threshold: number;
  window_minutes: number;
  enabled: boolean;
  last_triggered?: string;
  trigger_count: number;
}

export class AnalyticsService {
  private database: DatabaseService;
  private cache: CacheService;
  private alertConditions: Map<string, AlertCondition> = new Map();
  private analysisInterval: NodeJS.Timeout | null = null;
  private readonly analysisIntervalMs = 5 * 60 * 1000; // 5 minutes

  constructor(database: DatabaseService, cache: CacheService) {
    this.database = database;
    this.cache = cache;
    this.setupDefaultAlertConditions();
  }

  async initialize(): Promise<void> {
    try {
      // Start periodic analysis
      this.analysisInterval = setInterval(async () => {
        try {
          await this.runPeriodicAnalysis();
        } catch (error) {
          logger.error('Periodic analysis failed:', error);
        }
      }, this.analysisIntervalMs);

      logger.info('Analytics service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize analytics service:', error);
      throw new AppError('Analytics service initialization failed', 500);
    }
  }

  async close(): Promise<void> {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
    logger.info('Analytics service closed');
  }

  // Overview analytics
  async getOverviewAnalytics(timeRange: {
    start: string;
    end: string;
  }): Promise<AnalyticsData> {
    const cacheKey = `overview:${timeRange.start}:${timeRange.end}`;
    
    // Try cache first
    const cached = await this.cache.getCachedAnalytics(cacheKey);
    if (cached) {
      logger.debug('Using cached overview analytics');
      return cached;
    }

    try {
      const { tasks } = await this.database.getTaskRuns({
        start_date: timeRange.start,
        end_date: timeRange.end,
        limit: 10000 // Analyze up to 10k tasks
      });

      const analytics = this.calculateOverviewAnalytics(tasks);
      
      // Cache for 5 minutes
      await this.cache.cacheAnalytics(cacheKey, analytics, 300);
      
      return analytics;
    } catch (error) {
      logger.error('Error calculating overview analytics:', error);
      throw new AppError('Failed to calculate overview analytics', 500);
    }
  }

  // Failure pattern detection
  async detectFailurePatterns(options: {
    lookback_hours?: number;
    min_occurrences?: number;
    similarity_threshold?: number;
  } = {}): Promise<FailurePatternDetectionResult> {
    const lookbackHours = options.lookback_hours || 24;
    const minOccurrences = options.min_occurrences || 3;
    const similarityThreshold = options.similarity_threshold || 0.8;

    try {
      // Get failed tasks from the specified time window
      const startTime = new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString();
      const endTime = new Date().toISOString();

      const { tasks: failedTasks } = await this.database.getTaskRuns({
        status: 'failed',
        start_date: startTime,
        end_date: endTime,
        limit: 1000
      });

      logger.info(`Analyzing ${failedTasks.length} failed tasks for patterns`);

      const newPatterns: FailurePattern[] = [];
      const updatedPatterns: FailurePattern[] = [];
      const errorGroups = this.groupErrorsByPattern(failedTasks, similarityThreshold);

      for (const [pattern, errors] of errorGroups.entries()) {
        if (errors.length >= minOccurrences) {
          const existingPatterns = await this.database.getFailurePatterns(100);
          const existingPattern = existingPatterns.find(p => 
            this.calculateSimilarity(p.pattern_signature, pattern) > similarityThreshold
          );

          if (existingPattern) {
            // Update existing pattern
            const updatedPattern = await this.database.recordFailurePattern({
              pattern_type: 'error_pattern',
              pattern_signature: pattern,
              tool: errors[0].tool,
              error_pattern: this.extractErrorPattern(errors),
              suggested_fix: await this.generateSuggestedFix(errors),
              resolution_notes: null,
              is_resolved: false
            });
            updatedPatterns.push(updatedPattern);
          } else {
            // Create new pattern
            const newPattern = await this.database.recordFailurePattern({
              pattern_type: 'error_pattern',
              pattern_signature: pattern,
              tool: errors[0].tool,
              error_pattern: this.extractErrorPattern(errors),
              suggested_fix: await this.generateSuggestedFix(errors),
              resolution_notes: null,
              is_resolved: false
            });
            newPatterns.push(newPattern);
          }
        }
      }

      logger.info('Failure pattern detection completed', {
        new_patterns: newPatterns.length,
        updated_patterns: updatedPatterns.length,
        total_analyzed: failedTasks.length
      });

      return {
        new_patterns: newPatterns,
        updated_patterns: updatedPatterns,
        total_analyzed: failedTasks.length
      };
    } catch (error) {
      logger.error('Failure pattern detection failed:', error);
      throw new AppError('Failed to detect failure patterns', 500);
    }
  }

  // Performance trend analysis
  async analyzePerformanceTrends(options: {
    timeRange: { start: string; end: string };
    granularity?: 'hour' | 'day' | 'week';
    tools?: string[];
  }): Promise<PerformanceTrend[]> {
    const cacheKey = `performance:${JSON.stringify(options)}`;
    
    // Try cache first
    const cached = await this.cache.getCachedAnalytics(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const granularity = options.granularity || 'hour';
      const tools = options.tools || [];

      // Get performance metrics
      const metrics = await this.database.getPerformanceMetrics({
        start_date: options.timeRange.start,
        end_date: options.timeRange.end,
        limit: 10000
      });

      const trends = this.calculatePerformanceTrends(metrics, granularity, tools);
      
      // Cache for 10 minutes
      await this.cache.cacheAnalytics(cacheKey, trends, 600);
      
      return trends;
    } catch (error) {
      logger.error('Performance trend analysis failed:', error);
      throw new AppError('Failed to analyze performance trends', 500);
    }
  }

  // Recurring error identification
  async identifyRecurringErrors(options: {
    lookback_days?: number;
    min_frequency?: number;
    tools?: string[];
  } = {}): Promise<Array<{
    error_pattern: string;
    frequency: number;
    affected_tools: string[];
    first_seen: string;
    last_seen: string;
    sample_errors: string[];
    suggested_actions: string[];
  }>> {
    const lookbackDays = options.lookback_days || 7;
    const minFrequency = options.min_frequency || 5;
    const tools = options.tools || [];

    try {
      const startTime = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();
      const endTime = new Date().toISOString();

      const filters: any = {
        status: 'failed',
        start_date: startTime,
        end_date: endTime,
        limit: 5000
      };

      if (tools.length > 0) {
        // Note: This would need to be implemented as multiple queries or a custom SQL query
        // For now, we'll filter in memory
      }

      const { tasks: failedTasks } = await this.database.getTaskRuns(filters);
      const errorAnalysis = await this.analyzeRecurringErrors(failedTasks, minFrequency);

      logger.info('Recurring error identification completed', {
        patterns_found: errorAnalysis.length,
        tasks_analyzed: failedTasks.length
      });

      return errorAnalysis;
    } catch (error) {
      logger.error('Recurring error identification failed:', error);
      throw new AppError('Failed to identify recurring errors', 500);
    }
  }

  // Proactive alerting
  async checkAlertConditions(): Promise<Array<{
    alert_id: string;
    name: string;
    triggered: boolean;
    current_value: number;
    threshold: number;
    message: string;
  }>> {
    const alerts = [];
    
    try {
      for (const [alertId, condition] of this.alertConditions.entries()) {
        if (!condition.enabled) continue;

        const metrics = await this.getRecentMetrics(condition.window_minutes);
        const triggered = condition.condition(metrics);
        const currentValue = this.extractMetricValue(metrics, condition.name);

        alerts.push({
          alert_id: alertId,
          name: condition.name,
          triggered,
          current_value: currentValue,
          threshold: condition.threshold,
          message: this.generateAlertMessage(condition, currentValue, triggered)
        });

        if (triggered) {
          condition.trigger_count++;
          condition.last_triggered = new Date().toISOString();
          logger.warn('Alert condition triggered', {
            alert_id: alertId,
            name: condition.name,
            current_value: currentValue,
            threshold: condition.threshold
          });
        }
      }

      return alerts;
    } catch (error) {
      logger.error('Alert condition check failed:', error);
      return [];
    }
  }

  // Private helper methods
  private calculateOverviewAnalytics(tasks: TaskRun[]): AnalyticsData {
    const total = tasks.length;
    const successful = tasks.filter(t => t.status === 'completed').length;
    const failed = tasks.filter(t => t.status === 'failed').length;
    
    const durations = tasks
      .filter(t => t.total_duration_ms)
      .map(t => t.total_duration_ms!);
    
    const avgDuration = durations.length > 0 
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
      : 0;

    // Cache hit rate calculation
    const cacheHits = tasks.filter(t => t.cache_hit).length;
    const cacheHitRate = total > 0 ? cacheHits / total : 0;

    // Top errors
    const errorCounts = new Map<string, number>();
    tasks.forEach(task => {
      if (task.error_details && task.error_details.message) {
        const error = task.error_details.message.substring(0, 100);
        errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
      }
    });

    const topErrors = Array.from(errorCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([error, count]) => ({ error, count }));

    // Performance trends (simplified)
    const performanceTrends = this.calculateSimplePerformanceTrends(tasks);

    return {
      total_tasks: total,
      successful_tasks: successful,
      failed_tasks: failed,
      avg_duration_ms: Math.round(avgDuration),
      cache_hit_rate: Math.round(cacheHitRate * 100) / 100,
      top_errors: topErrors,
      performance_trends: performanceTrends
    };
  }

  private calculateSimplePerformanceTrends(tasks: TaskRun[]): Array<{
    timestamp: string;
    avg_duration: number;
    task_count: number;
  }> {
    // Group tasks by hour for the last 24 hours
    const hourlyData = new Map<string, { durations: number[]; count: number }>();
    
    tasks.forEach(task => {
      const hour = new Date(task.created_at).toISOString().substring(0, 13) + ':00:00.000Z';
      if (!hourlyData.has(hour)) {
        hourlyData.set(hour, { durations: [], count: 0 });
      }
      const data = hourlyData.get(hour)!;
      data.count++;
      if (task.total_duration_ms) {
        data.durations.push(task.total_duration_ms);
      }
    });

    return Array.from(hourlyData.entries())
      .map(([timestamp, data]) => ({
        timestamp,
        avg_duration: data.durations.length > 0 
          ? Math.round(data.durations.reduce((sum, d) => sum + d, 0) / data.durations.length)
          : 0,
        task_count: data.count
      }))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  private groupErrorsByPattern(tasks: TaskRun[], similarityThreshold: number): Map<string, TaskRun[]> {
    const groups = new Map<string, TaskRun[]>();
    
    for (const task of tasks) {
      if (!task.error_details?.message) continue;
      
      const errorMessage = task.error_details.message;
      const pattern = this.extractErrorPattern([task]);
      
      // Find similar existing patterns
      let foundGroup = false;
      for (const [existingPattern, existingTasks] of groups.entries()) {
        if (this.calculateSimilarity(pattern, existingPattern) > similarityThreshold) {
          existingTasks.push(task);
          foundGroup = true;
          break;
        }
      }
      
      if (!foundGroup) {
        groups.set(pattern, [task]);
      }
    }
    
    return groups;
  }

  private extractErrorPattern(tasks: TaskRun[]): string {
    if (tasks.length === 0) return 'unknown';
    
    const firstTask = tasks[0];
    const errorMessage = firstTask.error_details?.message || 'Unknown error';
    
    // Normalize error message by removing specific values
    return errorMessage
      .replace(/\d+/g, 'N') // Replace numbers with N
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, 'UUID') // Replace UUIDs
      .replace(/https?:\/\/[^\s]+/g, 'URL') // Replace URLs
      .substring(0, 200); // Limit length
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple Levenshtein distance-based similarity
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private async generateSuggestedFix(tasks: TaskRun[]): Promise<string> {
    // Simple rule-based suggestions - in production, you might use AI/ML
    const errorMessages = tasks.map(t => t.error_details?.message || '').join(' ');
    
    if (errorMessages.includes('timeout')) {
      return 'Consider increasing timeout values or optimizing slow operations';
    }
    if (errorMessages.includes('connection')) {
      return 'Check network connectivity and retry logic';
    }
    if (errorMessages.includes('permission')) {
      return 'Verify access permissions and authentication';
    }
    if (errorMessages.includes('rate limit')) {
      return 'Implement exponential backoff and respect rate limits';
    }
    
    return 'Review error details and implement appropriate error handling';
  }

  private calculatePerformanceTrends(
    metrics: PerformanceMetric[], 
    granularity: string, 
    tools: string[]
  ): PerformanceTrend[] {
    // Implementation would depend on the specific metrics structure
    // This is a simplified version
    const trends: PerformanceTrend[] = [];
    
    // Group metrics by time windows and calculate trends
    // This is a placeholder - actual implementation would be more complex
    
    return trends;
  }

  private async analyzeRecurringErrors(tasks: TaskRun[], minFrequency: number): Promise<Array<{
    error_pattern: string;
    frequency: number;
    affected_tools: string[];
    first_seen: string;
    last_seen: string;
    sample_errors: string[];
    suggested_actions: string[];
  }>> {
    const errorGroups = this.groupErrorsByPattern(tasks, 0.8);
    const results = [];
    
    for (const [pattern, errorTasks] of errorGroups.entries()) {
      if (errorTasks.length >= minFrequency) {
        const tools = Array.from(new Set(errorTasks.map(t => t.tool)));
        const timestamps = errorTasks.map(t => new Date(t.created_at).getTime());
        const sampleErrors = errorTasks
          .slice(0, 3)
          .map(t => t.error_details?.message || 'Unknown error');
        
        results.push({
          error_pattern: pattern,
          frequency: errorTasks.length,
          affected_tools: tools,
          first_seen: new Date(Math.min(...timestamps)).toISOString(),
          last_seen: new Date(Math.max(...timestamps)).toISOString(),
          sample_errors: sampleErrors,
          suggested_actions: [await this.generateSuggestedFix(errorTasks)]
        });
      }
    }
    
    return results.sort((a, b) => b.frequency - a.frequency);
  }

  private async getRecentMetrics(windowMinutes: number): Promise<any> {
    const startTime = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
    const endTime = new Date().toISOString();
    
    const { tasks } = await this.database.getTaskRuns({
      start_date: startTime,
      end_date: endTime,
      limit: 1000
    });
    
    return {
      tasks,
      error_rate: tasks.length > 0 ? tasks.filter(t => t.status === 'failed').length / tasks.length : 0,
      avg_duration: tasks.length > 0 ? 
        tasks.reduce((sum, t) => sum + (t.total_duration_ms || 0), 0) / tasks.length : 0,
      task_count: tasks.length
    };
  }

  private extractMetricValue(metrics: any, metricName: string): number {
    switch (metricName) {
      case 'error_rate':
        return metrics.error_rate;
      case 'avg_duration':
        return metrics.avg_duration;
      case 'task_count':
        return metrics.task_count;
      default:
        return 0;
    }
  }

  private generateAlertMessage(condition: AlertCondition, currentValue: number, triggered: boolean): string {
    if (triggered) {
      return `Alert: ${condition.name} is ${currentValue.toFixed(2)}, which exceeds threshold of ${condition.threshold}`;
    } else {
      return `${condition.name} is normal: ${currentValue.toFixed(2)} (threshold: ${condition.threshold})`;
    }
  }

  private setupDefaultAlertConditions(): void {
    this.alertConditions.set('high_error_rate', {
      id: 'high_error_rate',
      name: 'error_rate',
      condition: (metrics) => metrics.error_rate > 0.1, // 10% error rate
      threshold: 0.1,
      window_minutes: 15,
      enabled: true,
      trigger_count: 0
    });

    this.alertConditions.set('slow_performance', {
      id: 'slow_performance',
      name: 'avg_duration',
      condition: (metrics) => metrics.avg_duration > 30000, // 30 seconds
      threshold: 30000,
      window_minutes: 10,
      enabled: true,
      trigger_count: 0
    });

    this.alertConditions.set('low_task_volume', {
      id: 'low_task_volume',
      name: 'task_count',
      condition: (metrics) => metrics.task_count < 5, // Less than 5 tasks in window
      threshold: 5,
      window_minutes: 30,
      enabled: true,
      trigger_count: 0
    });
  }

  private async runPeriodicAnalysis(): Promise<void> {
    logger.info('Running periodic analytics analysis');
    
    try {
      // Run failure pattern detection
      await this.detectFailurePatterns({ lookback_hours: 1 });
      
      // Check alert conditions
      const alerts = await this.checkAlertConditions();
      const triggeredAlerts = alerts.filter(a => a.triggered);
      
      if (triggeredAlerts.length > 0) {
        logger.warn('Alert conditions triggered', {
          triggered_alerts: triggeredAlerts.map(a => ({ 
            name: a.name, 
            current_value: a.current_value,
            threshold: a.threshold
          }))
        });
      }
      
      // Clear old cache entries
      await this.cache.invalidatePattern('analytics:');
      
      logger.info('Periodic analytics analysis completed', {
        triggered_alerts: triggeredAlerts.length
      });
    } catch (error) {
      logger.error('Periodic analysis failed:', error);
    }
  }

  // Public methods for managing alert conditions
  addAlertCondition(condition: Omit<AlertCondition, 'trigger_count'>): void {
    this.alertConditions.set(condition.id, {
      ...condition,
      trigger_count: 0
    });
    logger.info('Alert condition added', { id: condition.id, name: condition.name });
  }

  removeAlertCondition(conditionId: string): boolean {
    const removed = this.alertConditions.delete(conditionId);
    if (removed) {
      logger.info('Alert condition removed', { id: conditionId });
    }
    return removed;
  }

  getAlertConditions(): AlertCondition[] {
    return Array.from(this.alertConditions.values());
  }
}

export default AnalyticsService;