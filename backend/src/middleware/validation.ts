import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import winston from 'winston';
import { ValidationError } from '../types';

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

// Generic validation middleware that handles express-validator results
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => {
      // Handle different error types
      if (error.type === 'field') {
        return `${error.path}: ${error.msg}`;
      }
      return error.msg;
    });
    
    logger.warn('Validation failed', {
      request_id: req.requestId,
      path: req.path,
      method: req.method,
      errors: errorMessages,
      user_id: req.user?.id,
      timestamp: new Date().toISOString()
    });
    
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errorMessages,
      timestamp: new Date().toISOString(),
      request_id: req.requestId
    });
  }
  
  next();
};

// Middleware factory to create validation middleware with custom error handling
export const createValidationMiddleware = (
  validations: ValidationChain[],
  customErrorHandler?: (errors: any[], req: Request, res: Response) => void
) => {
  return [
    ...validations,
    (req: Request, res: Response, next: NextFunction) => {
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        const errorArray = errors.array();
        
        if (customErrorHandler) {
          return customErrorHandler(errorArray, req, res);
        }
        
        return handleValidationErrors(req, res, next);
      }
      
      next();
    }
  ];
};

// Content type validation middleware
export const validateContentType = (expectedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentType = req.get('Content-Type');
    
    if (!contentType) {
      logger.warn('Missing Content-Type header', {
        request_id: req.requestId,
        path: req.path,
        method: req.method
      });
      
      return res.status(400).json({
        success: false,
        error: 'Content-Type header is required',
        expected_types: expectedTypes,
        timestamp: new Date().toISOString()
      });
    }
    
    const isValidType = expectedTypes.some(type => 
      contentType.toLowerCase().includes(type.toLowerCase())
    );
    
    if (!isValidType) {
      logger.warn('Invalid Content-Type', {
        request_id: req.requestId,
        path: req.path,
        method: req.method,
        provided_type: contentType,
        expected_types: expectedTypes
      });
      
      return res.status(415).json({
        success: false,
        error: 'Unsupported Content-Type',
        provided_type: contentType,
        expected_types: expectedTypes,
        timestamp: new Date().toISOString()
      });
    }
    
    next();
  };
};

// Request size validation middleware
export const validateRequestSize = (maxSizeBytes: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.get('Content-Length');
    
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      
      if (size > maxSizeBytes) {
        logger.warn('Request size exceeded', {
          request_id: req.requestId,
          path: req.path,
          method: req.method,
          size_bytes: size,
          max_size_bytes: maxSizeBytes,
          user_id: req.user?.id
        });
        
        return res.status(413).json({
          success: false,
          error: 'Request entity too large',
          size_bytes: size,
          max_size_bytes: maxSizeBytes,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    next();
  };
};

// JSON schema validation middleware
export const validateJsonSchema = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Simple schema validation (in production, you'd use a library like Ajv)
      const validateObject = (obj: any, schemaObj: any, path: string = ''): string[] => {
        const errors: string[] = [];
        
        // Check required fields
        if (schemaObj.required) {
          for (const field of schemaObj.required) {
            if (!(field in obj)) {
              errors.push(`${path}${field} is required`);
            }
          }
        }
        
        // Check field types and constraints
        if (schemaObj.properties) {
          for (const [field, fieldSchema] of Object.entries(schemaObj.properties)) {
            if (field in obj) {
              const fieldValue = obj[field];
              const fieldSchemaObj = fieldSchema as any;
              
              // Type checking
              if (fieldSchemaObj.type) {
                const actualType = Array.isArray(fieldValue) ? 'array' : typeof fieldValue;
                if (actualType !== fieldSchemaObj.type) {
                  errors.push(`${path}${field} must be of type ${fieldSchemaObj.type}`);
                }
              }
              
              // String length constraints
              if (fieldSchemaObj.type === 'string' && typeof fieldValue === 'string') {
                if (fieldSchemaObj.minLength && fieldValue.length < fieldSchemaObj.minLength) {
                  errors.push(`${path}${field} must be at least ${fieldSchemaObj.minLength} characters`);
                }
                if (fieldSchemaObj.maxLength && fieldValue.length > fieldSchemaObj.maxLength) {
                  errors.push(`${path}${field} must be at most ${fieldSchemaObj.maxLength} characters`);
                }
              }
              
              // Number constraints
              if (fieldSchemaObj.type === 'number' && typeof fieldValue === 'number') {
                if (fieldSchemaObj.minimum !== undefined && fieldValue < fieldSchemaObj.minimum) {
                  errors.push(`${path}${field} must be at least ${fieldSchemaObj.minimum}`);
                }
                if (fieldSchemaObj.maximum !== undefined && fieldValue > fieldSchemaObj.maximum) {
                  errors.push(`${path}${field} must be at most ${fieldSchemaObj.maximum}`);
                }
              }
              
              // Enum constraints
              if (fieldSchemaObj.enum && !fieldSchemaObj.enum.includes(fieldValue)) {
                errors.push(`${path}${field} must be one of: ${fieldSchemaObj.enum.join(', ')}`);
              }
            }
          }
        }
        
        return errors;
      };
      
      const errors = validateObject(req.body, schema);
      
      if (errors.length > 0) {
        logger.warn('JSON schema validation failed', {
          request_id: req.requestId,
          path: req.path,
          method: req.method,
          errors,
          user_id: req.user?.id
        });
        
        return res.status(400).json({
          success: false,
          error: 'Schema validation failed',
          details: errors,
          timestamp: new Date().toISOString()
        });
      }
      
      next();
    } catch (error) {
      logger.error('Schema validation error', {
        request_id: req.requestId,
        error: error.message,
        path: req.path
      });
      
      return res.status(500).json({
        success: false,
        error: 'Schema validation error',
        timestamp: new Date().toISOString()
      });
    }
  };
};

// Custom validation for log events
export const validateLogEvent = (req: Request, res: Response, next: NextFunction) => {
  const logEvent = req.body;
  
  // Required fields for log events
  const requiredFields = ['ts', 'tool', 'run_id', 'event_type', 'status', 'schema_version'];
  const missingFields = requiredFields.filter(field => !(field in logEvent));
  
  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Missing required log event fields',
      missing_fields: missingFields,
      timestamp: new Date().toISOString()
    });
  }
  
  // Validate timestamp format
  const timestamp = new Date(logEvent.ts);
  if (isNaN(timestamp.getTime())) {
    return res.status(400).json({
      success: false,
      error: 'Invalid timestamp format',
      provided_ts: logEvent.ts,
      timestamp: new Date().toISOString()
    });
  }
  
  // Validate enum values
  const validEventTypes = ['task_start', 'task_end', 'action_start', 'action_end', 'error', 'info', 'debug', 'warning', 'metric'];
  if (!validEventTypes.includes(logEvent.event_type)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid event_type',
      provided_event_type: logEvent.event_type,
      valid_event_types: validEventTypes,
      timestamp: new Date().toISOString()
    });
  }
  
  const validStatuses = ['pending', 'running', 'completed', 'failed', 'cancelled', 'timeout'];
  if (!validStatuses.includes(logEvent.status)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid status',
      provided_status: logEvent.status,
      valid_statuses: validStatuses,
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

// Query parameter sanitization middleware
export const sanitizeQueryParams = (req: Request, res: Response, next: NextFunction) => {
  // Remove potentially dangerous characters from query parameters
  const dangerousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<[^>]+>/g, // Remove HTML tags
    /javascript:/gi,
    /vbscript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi
  ];
  
  const sanitizeString = (str: string): string => {
    let sanitized = str;
    dangerousPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });
    return sanitized.trim();
  };
  
  // Sanitize query parameters
  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === 'string') {
      req.query[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      req.query[key] = value.map(v => typeof v === 'string' ? sanitizeString(v) : v);
    }
  }
  
  next();
};

export default {
  handleValidationErrors,
  createValidationMiddleware,
  validateContentType,
  validateRequestSize,
  validateJsonSchema,
  validateLogEvent,
  sanitizeQueryParams
};