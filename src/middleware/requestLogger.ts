import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Request logging middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const correlationId = randomUUID();
  
  // Add correlation ID to request for tracing
  req.correlationId = correlationId;
  
  // Add correlation ID to response headers
  res.setHeader('X-Correlation-ID', correlationId);
  
  // Log request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`, {
    correlationId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    body: req.method !== 'GET' ? req.body : undefined
  });
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode}`, {
      correlationId,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });
  });
  
  next();
}

// Extend Express Request interface to include correlationId
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}