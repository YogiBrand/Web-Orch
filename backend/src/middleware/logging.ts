import { Request, Response, NextFunction } from 'express';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { v4 as uuidv4 } from 'uuid';

// Extend Request type to include logging fields
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

// Create logger with daily rotation
const createLogger = (logLevel: string = 'info') => {
  return winston.createLogger({
    level: logLevel,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    transports: [
      // Console transport
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }),
      
      // File transport with daily rotation
      new DailyRotateFile({
        filename: 'logs/access-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        level: 'info'
      }),
      
      // Error log file
      new DailyRotateFile({
        filename: 'logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '30d',
        level: 'error'
      })
    ]
  });
};

const logger = createLogger();

// Request ID middleware - adds unique ID to each request
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  req.requestId = uuidv4();
  req.startTime = Date.now();
  
  // Add request ID to response headers for tracing
  res.setHeader('X-Request-ID', req.requestId);
  
  next();
};

// Request logging middleware
export const requestLoggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Log request start
  logger.info('Request started', {
    request_id: req.requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    user_agent: req.get('User-Agent'),
    user_id: req.user?.id,
    content_length: req.get('Content-Length') || 0,
    timestamp: new Date().toISOString()
  });
  
  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(obj: any) {
    const duration = Date.now() - start;
    
    // Log response
    logger.info('Request completed', {
      request_id: req.requestId,
      method: req.method,
      path: req.path,
      status_code: res.statusCode,
      duration_ms: duration,
      user_id: req.user?.id,
      response_size: JSON.stringify(obj).length,
      timestamp: new Date().toISOString()
    });
    
    return originalJson.call(this, obj);
  };
  
  // Log response on finish for other response types
  res.on('finish', () => {
    if (!res.headersSent) return;
    
    const duration = Date.now() - start;
    
    // Only log if we haven't already logged via res.json override
    if (res.get('Content-Type')?.includes('application/json')) {
      return;
    }
    
    logger.info('Request completed', {
      request_id: req.requestId,
      method: req.method,
      path: req.path,
      status_code: res.statusCode,
      duration_ms: duration,
      user_id: req.user?.id,
      timestamp: new Date().toISOString()
    });
  });
  
  next();
};

// Error logging middleware
export const errorLoggingMiddleware = (error: any, req: Request, res: Response, next: NextFunction) => {
  const duration = Date.now() - (req.startTime || Date.now());
  
  // Log error details
  logger.error('Request error', {
    request_id: req.requestId,
    method: req.method,
    path: req.path,
    error_message: error.message,
    error_stack: error.stack,
    status_code: error.statusCode || 500,
    duration_ms: duration,
    user_id: req.user?.id,
    ip: req.ip,
    user_agent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  
  // Send error response if headers haven't been sent
  if (!res.headersSent) {
    const statusCode = error.statusCode || 500;
    const message = process.env.NODE_ENV === 'production' && statusCode === 500 
      ? 'Internal server error' 
      : error.message;
    
    res.status(statusCode).json({
      success: false,
      error: message,
      request_id: req.requestId,
      timestamp: new Date().toISOString()
    });
  }
  
  next(error);
};

// Performance monitoring middleware
export const performanceMonitoringMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();
  
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds
    
    // Log slow requests (over 1 second)
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        request_id: req.requestId,
        method: req.method,
        path: req.path,
        duration_ms: Math.round(duration),
        status_code: res.statusCode,
        user_id: req.user?.id,
        timestamp: new Date().toISOString()
      });
    }
    
    // Log performance metrics for analytics
    if (req.path.startsWith('/api/')) {
      logger.debug('API performance metric', {
        request_id: req.requestId,
        method: req.method,
        path: req.path,
        duration_ms: Math.round(duration),
        status_code: res.statusCode,
        user_id: req.user?.id,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  next();
};

// Security logging middleware
export const securityLoggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Log potentially suspicious activity
  const suspiciousPatterns = [
    /\.\.\//, // Path traversal attempts
    /<script/i, // XSS attempts
    /union.*select/i, // SQL injection attempts
    /eval\(/i, // Code injection attempts
    /javascript:/i // Javascript protocol
  ];
  
  const fullUrl = req.originalUrl || req.url;
  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(fullUrl) || 
    (req.body && pattern.test(JSON.stringify(req.body)))
  );
  
  if (isSuspicious) {
    logger.warn('Suspicious request detected', {
      request_id: req.requestId,
      method: req.method,
      path: req.path,
      full_url: fullUrl,
      ip: req.ip,
      user_agent: req.get('User-Agent'),
      user_id: req.user?.id,
      body: req.body ? JSON.stringify(req.body).substring(0, 500) : undefined,
      timestamp: new Date().toISOString()
    });
  }
  
  // Log failed authentication attempts
  res.on('finish', () => {
    if (res.statusCode === 401 || res.statusCode === 403) {
      logger.warn('Authentication/Authorization failure', {
        request_id: req.requestId,
        method: req.method,
        path: req.path,
        status_code: res.statusCode,
        ip: req.ip,
        user_agent: req.get('User-Agent'),
        user_id: req.user?.id,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  next();
};

// Health check logging middleware (minimal logging for health endpoints)
export const healthCheckLoggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Skip detailed logging for health check endpoints to reduce noise
  if (req.path.startsWith('/health')) {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      
      // Only log health check failures or slow responses
      if (res.statusCode >= 400 || duration > 5000) {
        logger.warn('Health check issue', {
          request_id: req.requestId,
          path: req.path,
          status_code: res.statusCode,
          duration_ms: duration,
          timestamp: new Date().toISOString()
        });
      }
    });
  }
  
  next();
};

// Create structured logger for use in services
export const createStructuredLogger = (service: string) => {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.label({ label: service })
    ),
    transports: [
      new winston.transports.Console(),
      new DailyRotateFile({
        filename: `logs/${service}-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d'
      })
    ]
  });
};

export { logger };

export default {
  requestIdMiddleware,
  requestLoggingMiddleware,
  errorLoggingMiddleware,
  performanceMonitoringMiddleware,
  securityLoggingMiddleware,
  healthCheckLoggingMiddleware,
  createStructuredLogger,
  logger
};