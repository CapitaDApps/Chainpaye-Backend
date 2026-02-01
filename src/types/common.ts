// Common types and DTOs used across the application

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
  correlationId?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  details?: any;
  timestamp: Date;
  correlationId?: string;
}

export interface IdempotencyResult<T = any> {
  isNew: boolean;
  result: T;
  cached: boolean;
}

export interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  retryable?: boolean;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  services: {
    database: 'healthy' | 'unhealthy';
    toronet: 'healthy' | 'unhealthy' | 'degraded';
    cache?: 'healthy' | 'unhealthy';
  };
  version: string;
  uptime: number;
}

export interface SystemMetrics {
  totalTransactions: number;
  pendingTransactions: number;
  completedTransactions: number;
  failedPayouts: number;
  totalVolume: {
    NGN: number;
    USD: number;
  };
  averageProcessingTime: number;
  errorRate: number;
  timestamp: Date;
}