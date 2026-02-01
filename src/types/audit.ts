// Audit and logging related types and DTOs

export interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  userId?: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  timestamp: Date;
  correlationId?: string;
}

export interface CreateAuditLogRequest {
  entityType: string;
  entityId: string;
  action: string;
  userId?: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  correlationId?: string;
}

export interface AuditLogListResponse {
  auditLogs: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface AuditLogFilter {
  entityType?: string;
  entityId?: string;
  action?: string;
  userId?: string;
  correlationId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface StateTransitionAudit {
  transactionId: string;
  previousState: string;
  newState: string;
  reason: string;
  userId?: string;
  metadata?: Record<string, any>;
}