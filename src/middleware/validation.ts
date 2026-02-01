import { Request, Response, NextFunction } from 'express';
import { Validator, ValidationSchema } from '../types/validation';
import { ApiResponse } from '../types/common';

export interface ValidationMiddlewareOptions {
  body?: ValidationSchema<any>;
  params?: ValidationSchema<any>;
  query?: ValidationSchema<any>;
}

/**
 * Middleware to validate request data
 */
export function validateRequest(options: ValidationMiddlewareOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log('=== VALIDATION MIDDLEWARE CALLED ===');
    console.log('Request body:', req.body);
    console.log('Validation options:', options);
    
    const errors: string[] = [];

    // Validate request body
    if (options.body && req.body) {
      const bodyValidation = Validator.validate(req.body, options.body);
      console.log('Validation result:', bodyValidation);
      if (!bodyValidation.isValid) {
        errors.push(...bodyValidation.errors.map(e => `Body: ${e.message}`));
      }
    }

    // Validate request parameters
    if (options.params && req.params) {
      const paramsValidation = Validator.validate(req.params, options.params);
      if (!paramsValidation.isValid) {
        errors.push(...paramsValidation.errors.map(e => `Params: ${e.message}`));
      }
    }

    // Validate query parameters
    if (options.query && req.query) {
      const queryValidation = Validator.validate(req.query, options.query);
      if (!queryValidation.isValid) {
        errors.push(...queryValidation.errors.map(e => `Query: ${e.message}`));
      }
    }

    if (errors.length > 0) {
      const response: ApiResponse = {
        success: false,
        error: 'Validation failed',
        message: errors.join(', '),
        timestamp: new Date()
      };
      return res.status(400).json(response);
    }

    next();
  };
}

/**
 * Middleware to validate pagination parameters
 */
export function validatePagination() {
  return (req: Request, res: Response, next: NextFunction) => {
    const { page, limit, sortBy, sortOrder } = req.query;

    // Validate page
    if (page !== undefined) {
      const pageNum = parseInt(page as string, 10);
      if (isNaN(pageNum) || pageNum < 1) {
        const response: ApiResponse = {
          success: false,
          error: 'Invalid page parameter',
          message: 'Page must be a positive integer',
          timestamp: new Date()
        };
        return res.status(400).json(response);
      }
      req.query.page = pageNum.toString();
    }

    // Validate limit
    if (limit !== undefined) {
      const limitNum = parseInt(limit as string, 10);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        const response: ApiResponse = {
          success: false,
          error: 'Invalid limit parameter',
          message: 'Limit must be between 1 and 100',
          timestamp: new Date()
        };
        return res.status(400).json(response);
      }
      req.query.limit = limitNum.toString();
    }

    // Validate sortOrder
    if (sortOrder !== undefined && !['asc', 'desc'].includes(sortOrder as string)) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid sortOrder parameter',
        message: 'Sort order must be "asc" or "desc"',
        timestamp: new Date()
      };
      return res.status(400).json(response);
    }

    next();
  };
}