import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// Custom key generator that considers user authentication
const keyGenerator = (req: Request): string => {
  // Use user ID if authenticated, otherwise fall back to IP
  if (req.user?.id) {
    return `user:${req.user.id}`;
  }
  
  // Get real IP address considering proxies
  const forwarded = req.headers['x-forwarded-for'] as string;
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip;
  
  return `ip:${ip}`;
};

// Custom skip function for certain conditions
const skipSuccessfulRequests = (req: Request, res: Response): boolean => {
  // Don't count successful requests against health endpoints
  if (req.path.startsWith('/health') && res.statusCode < 400) {
    return true;
  }
  
  // Don't count if user has admin role
  if (req.user?.role === 'admin') {
    return true;
  }
  
  return false;
};

// Standard rate limiter for API endpoints
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each key to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  keyGenerator,
  skip: skipSuccessfulRequests,
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      user_id: req.user?.id,
      path: req.path,
      method: req.method,
      user_agent: req.get('User-Agent')
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later',
      retry_after: Math.ceil(15 * 60), // seconds
      timestamp: new Date().toISOString()
    });
  }
});

// Strict rate limiter for expensive operations (like AI summaries)
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each key to 20 requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: (req: Request, res: Response) => {
    logger.warn('Strict rate limit exceeded', {
      ip: req.ip,
      user_id: req.user?.id,
      path: req.path,
      method: req.method,
      user_agent: req.get('User-Agent')
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many expensive operations, please try again later',
      retry_after: Math.ceil(60 * 60), // seconds
      timestamp: new Date().toISOString()
    });
  }
});

// Lenient rate limiter for read operations
export const readLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 200, // Limit each key to 200 requests per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  skip: (req: Request, res: Response) => {
    // Always skip health checks
    if (req.path.startsWith('/health')) {
      return true;
    }
    return skipSuccessfulRequests(req, res);
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Read rate limit exceeded', {
      ip: req.ip,
      user_id: req.user?.id,
      path: req.path,
      method: req.method
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many read requests, please try again later',
      retry_after: Math.ceil(5 * 60), // seconds
      timestamp: new Date().toISOString()
    });
  }
});

// Very strict limiter for authentication attempts
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth attempts per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Always use IP for auth attempts, not user ID
    const forwarded = req.headers['x-forwarded-for'] as string;
    const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip;
    return `auth:${ip}`;
  },
  skipSuccessfulRequests: true, // Don't count successful auth attempts
  handler: (req: Request, res: Response) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      user_agent: req.get('User-Agent')
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts, please try again later',
      retry_after: Math.ceil(15 * 60), // seconds
      timestamp: new Date().toISOString()
    });
  }
});

// WebSocket connection limiter
export const websocketLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each key to 10 WebSocket connections per minute
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: (req: Request, res: Response) => {
    logger.warn('WebSocket connection rate limit exceeded', {
      ip: req.ip,
      user_id: req.user?.id,
      user_agent: req.get('User-Agent')
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many WebSocket connection attempts',
      retry_after: 60, // seconds
      timestamp: new Date().toISOString()
    });
  }
});

// Dynamic rate limiter factory
export const createDynamicLimiter = (options: {
  windowMs: number;
  max: number | ((req: Request) => number);
  message?: string;
  skipCondition?: (req: Request, res: Response) => boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    skip: options.skipCondition || skipSuccessfulRequests,
    handler: (req: Request, res: Response) => {
      logger.warn('Dynamic rate limit exceeded', {
        ip: req.ip,
        user_id: req.user?.id,
        path: req.path,
        method: req.method,
        limit_type: 'dynamic'
      });
      
      res.status(429).json({
        success: false,
        error: options.message || 'Rate limit exceeded',
        retry_after: Math.ceil(options.windowMs / 1000),
        timestamp: new Date().toISOString()
      });
    }
  });
};

export default {
  apiLimiter,
  strictLimiter,
  readLimiter,
  authLimiter,
  websocketLimiter,
  createDynamicLimiter
};