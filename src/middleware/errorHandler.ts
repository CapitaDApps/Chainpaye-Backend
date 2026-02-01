import { Request, Response, NextFunction } from 'express';
import { ApiResponse, ErrorResponse } from '../types/common';

/**
 * Global error handler middleware
 */
export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('API Error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query
  });

  // Default error response
  let statusCode = 500;
  let errorMessage = 'Internal server error';
  let details = undefined;

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    errorMessage = 'Validation failed';
    details = error.message;
  } else if (error.name === 'CastError') {
    statusCode = 400;
    errorMessage = 'Invalid data format';
    details = error.message;
  } else if (error.code === 11000) {
    statusCode = 409;
    errorMessage = 'Duplicate resource';
    details = 'A resource with this identifier already exists';
  } else if (error.message) {
    errorMessage = error.message;
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    errorMessage = 'Internal server error';
    details = undefined;
  }

  const response: ErrorResponse = {
    success: false,
    error: errorMessage,
    message: errorMessage,
    details,
    timestamp: new Date()
  };

  res.status(statusCode).json(response);
}

/**
 * 404 handler for unmatched routes
 */
export function notFoundHandler(req: Request, res: Response) {
  const response: ApiResponse = {
    success: false,
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date()
  };
  
  res.status(404).json(response);
}

/**
 * Async error wrapper to catch async errors in route handlers
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}