import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Rate limiting configuration for different endpoint types
 */

// General API rate limiter - applies to most endpoints
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests',
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes',
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId || 'rate-limit-exceeded'
    });
  }
});

// Strict rate limiter for payment link creation (more restrictive)
export const createPaymentLinkRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // Limit each IP to 20 payment link creations per 10 minutes
  message: {
    success: false,
    error: 'Payment link creation rate limit exceeded',
    message: 'Too many payment links created from this IP, please try again later.',
    retryAfter: '10 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Payment link creation rate limit exceeded',
      message: 'Too many payment links created from this IP, please try again later.',
      retryAfter: '10 minutes',
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId || 'create-rate-limit-exceeded'
    });
  }
});

// Payment access rate limiter (for when users access payment links)
export const paymentAccessRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // Limit each IP to 50 payment accesses per 5 minutes
  message: {
    success: false,
    error: 'Payment access rate limit exceeded',
    message: 'Too many payment access attempts from this IP, please try again later.',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Payment access rate limit exceeded',
      message: 'Too many payment access attempts from this IP, please try again later.',
      retryAfter: '5 minutes',
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId || 'access-rate-limit-exceeded'
    });
  }
});

// Transaction recording rate limiter (for recording completed transactions)
export const recordTransactionRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // Limit each IP to 30 transaction recordings per 5 minutes
  message: {
    success: false,
    error: 'Transaction recording rate limit exceeded',
    message: 'Too many transaction recordings from this IP, please try again later.',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Transaction recording rate limit exceeded',
      message: 'Too many transaction recordings from this IP, please try again later.',
      retryAfter: '5 minutes',
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId || 'record-rate-limit-exceeded'
    });
  }
});

// Lenient rate limiter for read operations (GET requests)
export const readOnlyRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 read requests per 15 minutes
  message: {
    success: false,
    error: 'Read operation rate limit exceeded',
    message: 'Too many read requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Read operation rate limit exceeded',
      message: 'Too many read requests from this IP, please try again later.',
      retryAfter: '15 minutes',
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId || 'read-rate-limit-exceeded'
    });
  }
});

// Very strict rate limiter for sensitive operations (disable/enable)
export const sensitiveOperationRateLimit = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 10, // Limit each IP to 10 sensitive operations per 30 minutes
  message: {
    success: false,
    error: 'Sensitive operation rate limit exceeded',
    message: 'Too many sensitive operations from this IP, please try again later.',
    retryAfter: '30 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Sensitive operation rate limit exceeded',
      message: 'Too many sensitive operations from this IP, please try again later.',
      retryAfter: '30 minutes',
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId || 'sensitive-rate-limit-exceeded'
    });
  }
});

// Health check rate limiter (very lenient)
export const healthCheckRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 health checks per minute
  message: {
    success: false,
    error: 'Health check rate limit exceeded',
    message: 'Too many health check requests from this IP, please try again later.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Health check rate limit exceeded',
      message: 'Too many health check requests from this IP, please try again later.',
      retryAfter: '1 minute',
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId || 'health-rate-limit-exceeded'
    });
  }
});

/**
 * Advanced rate limiter with custom key generator (e.g., by user ID or merchant ID)
 */
export const createCustomRateLimit = (options: {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
  message?: string;
  errorType?: string;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    // Use standard key generator to avoid IPv6 issues
    skip: options.keyGenerator ? undefined : () => false,
    message: {
      success: false,
      error: options.errorType || 'Rate limit exceeded',
      message: options.message || 'Too many requests, please try again later.',
      retryAfter: `${Math.ceil(options.windowMs / 60000)} minutes`
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: options.errorType || 'Rate limit exceeded',
        message: options.message || 'Too many requests, please try again later.',
        retryAfter: `${Math.ceil(options.windowMs / 60000)} minutes`,
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId || 'custom-rate-limit-exceeded'
      });
    }
  });
};

/**
 * Rate limiter by merchant ID for payment link operations
 * Note: For production, implement proper merchant-based rate limiting with Redis
 */
export const merchantRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 50, // 50 operations per merchant per 10 minutes
  message: {
    success: false,
    error: 'Merchant rate limit exceeded',
    message: 'Too many operations for this merchant, please try again later.',
    retryAfter: '10 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Merchant rate limit exceeded',
      message: 'Too many operations for this merchant, please try again later.',
      retryAfter: '10 minutes',
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId || 'merchant-rate-limit-exceeded'
    });
  }
});

/**
 * Rate limiter by user ID for user-specific operations
 * Note: For production, implement proper user-based rate limiting with Redis
 */
export const userRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 operations per user per 15 minutes
  message: {
    success: false,
    error: 'User rate limit exceeded',
    message: 'Too many operations for this user, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'User rate limit exceeded',
      message: 'Too many operations for this user, please try again later.',
      retryAfter: '15 minutes',
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId || 'user-rate-limit-exceeded'
    });
  }
});

/**
 * Burst protection - very short window with low limit to prevent rapid-fire requests
 */
export const burstProtectionRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // Maximum 20 requests per minute
  message: {
    success: false,
    error: 'Burst protection triggered',
    message: 'Too many requests in a short time, please slow down.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Burst protection triggered',
      message: 'Too many requests in a short time, please slow down.',
      retryAfter: '1 minute',
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId || 'burst-protection-triggered'
    });
  }
});

/**
 * Rate limiting configuration summary for documentation
 */
export const rateLimitConfig = {
  general: { windowMs: 15 * 60 * 1000, max: 100, description: 'General API operations' },
  createPaymentLink: { windowMs: 10 * 60 * 1000, max: 20, description: 'Payment link creation' },
  paymentAccess: { windowMs: 5 * 60 * 1000, max: 50, description: 'Payment link access' },
  recordTransaction: { windowMs: 5 * 60 * 1000, max: 30, description: 'Transaction recording' },
  readOnly: { windowMs: 15 * 60 * 1000, max: 200, description: 'Read operations (GET)' },
  sensitiveOperation: { windowMs: 30 * 60 * 1000, max: 10, description: 'Sensitive operations' },
  healthCheck: { windowMs: 1 * 60 * 1000, max: 60, description: 'Health checks' },
  merchant: { windowMs: 10 * 60 * 1000, max: 50, description: 'Per-merchant operations' },
  user: { windowMs: 15 * 60 * 1000, max: 100, description: 'Per-user operations' },
  burstProtection: { windowMs: 1 * 60 * 1000, max: 20, description: 'Burst protection' }
};