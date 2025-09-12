import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import winston from 'winston';
import { UnauthorizedError } from '../types';

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

// Extend Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        role?: string;
      };
    }
  }
}

interface AuthOptions {
  jwtSecret: string;
  optional?: boolean;
  requiredRole?: string;
}

// JWT Authentication middleware
export const authenticateToken = (options: AuthOptions) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : req.query.token as string;

      if (!token) {
        if (options.optional) {
          return next();
        }
        
        logger.warn('Authentication failed: No token provided', {
          ip: req.ip,
          user_agent: req.get('User-Agent'),
          path: req.path
        });
        
        throw new UnauthorizedError('Access token required');
      }

      jwt.verify(token, options.jwtSecret, (err: any, decoded: any) => {
        if (err) {
          logger.warn('Authentication failed: Invalid token', {
            ip: req.ip,
            user_agent: req.get('User-Agent'),
            path: req.path,
            error: err.message
          });
          
          if (options.optional) {
            return next();
          }
          
          throw new UnauthorizedError('Invalid access token');
        }

        // Set user information from token
        req.user = {
          id: decoded.user_id || decoded.sub || decoded.id,
          email: decoded.email,
          role: decoded.role || 'user'
        };

        // Check role if required
        if (options.requiredRole && req.user.role !== options.requiredRole) {
          logger.warn('Authorization failed: Insufficient role', {
            user_id: req.user.id,
            user_role: req.user.role,
            required_role: options.requiredRole,
            path: req.path
          });
          
          return res.status(403).json({
            success: false,
            error: `Required role: ${options.requiredRole}`,
            timestamp: new Date().toISOString()
          });
        }

        logger.debug('Authentication successful', {
          user_id: req.user.id,
          role: req.user.role,
          path: req.path
        });

        next();
      });
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return res.status(401).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      logger.error('Authentication middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authentication error',
        timestamp: new Date().toISOString()
      });
    }
  };
};

// API Key authentication middleware (alternative to JWT)
export const authenticateApiKey = (validApiKeys: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const apiKey = req.headers['x-api-key'] as string || req.query.api_key as string;
      
      if (!apiKey) {
        logger.warn('API key authentication failed: No key provided', {
          ip: req.ip,
          user_agent: req.get('User-Agent'),
          path: req.path
        });
        
        return res.status(401).json({
          success: false,
          error: 'API key required',
          timestamp: new Date().toISOString()
        });
      }
      
      if (!validApiKeys.includes(apiKey)) {
        logger.warn('API key authentication failed: Invalid key', {
          ip: req.ip,
          user_agent: req.get('User-Agent'),
          path: req.path,
          api_key_hash: apiKey.substring(0, 8) + '...' // Log partial key for debugging
        });
        
        return res.status(401).json({
          success: false,
          error: 'Invalid API key',
          timestamp: new Date().toISOString()
        });
      }
      
      // Set a basic user object for API key auth
      req.user = {
        id: `api_key_user_${apiKey.substring(0, 8)}`,
        role: 'api'
      };
      
      logger.debug('API key authentication successful', {
        user_id: req.user.id,
        path: req.path
      });
      
      next();
    } catch (error) {
      logger.error('API key authentication error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authentication error',
        timestamp: new Date().toISOString()
      });
    }
  };
};

// Optional authentication - tries JWT first, then API key, then continues without auth
export const optionalAuth = (jwtSecret: string, validApiKeys: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Try JWT authentication first
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : req.query.token as string;
      
    if (token) {
      try {
        const decoded = jwt.verify(token, jwtSecret) as any;
        req.user = {
          id: decoded.user_id || decoded.sub || decoded.id,
          email: decoded.email,
          role: decoded.role || 'user'
        };
        return next();
      } catch (err) {
        // JWT failed, continue to try API key
      }
    }
    
    // Try API key authentication
    const apiKey = req.headers['x-api-key'] as string || req.query.api_key as string;
    if (apiKey && validApiKeys.includes(apiKey)) {
      req.user = {
        id: `api_key_user_${apiKey.substring(0, 8)}`,
        role: 'api'
      };
      return next();
    }
    
    // No authentication, continue without user
    next();
  };
};

export default {
  authenticateToken,
  authenticateApiKey,
  optionalAuth
};