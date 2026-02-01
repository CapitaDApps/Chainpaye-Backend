import { ClientSession } from 'mongoose';
import { AuditLogRepository } from '../repositories/AuditLogRepository';
import { CreateAuditLogRequest, AuditLogEntry, StateTransitionAudit } from '../types/audit';
import { randomUUID } from 'crypto';

export interface AuditContext {
  userId?: string;
  correlationId?: string;
  session?: ClientSession;
  metadata?: Record<string, any>;
}

export class AuditService {
  private auditLogRepository: AuditLogRepository;

  constructor() {
    this.auditLogRepository = new AuditLogRepository();
  }

  /**
   * Create an audit log entry
   */
  async createAuditLog(
    request: CreateAuditLogRequest,
    context?: AuditContext
  ): Promise<AuditLogEntry> {
    try {
      const auditData = {
        entityType: request.entityType,
        entityId: request.entityId,
        action: request.action,
        userId: context?.userId || request.userId,
        changes: request.changes,
        metadata: {
          ...request.metadata,
          ...context?.metadata
        },
        timestamp: new Date(),
        correlationId: context?.correlationId || request.correlationId || this.generateCorrelationId()
      };

      const auditLog = await this.auditLogRepository.create(auditData, {
        session: context?.session
      });

      return this.mapToAuditLogEntry(auditLog);
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // Don't throw - audit logging should not break business operations
      return this.createFallbackAuditEntry(request, context);
    }
  }

  /**
   * Log entity creation
   */
  async logCreate(
    entityType: string,
    entityId: string,
    entityData: any,
    context?: AuditContext
  ): Promise<void> {
    await this.createAuditLog({
      entityType,
      entityId,
      action: 'CREATE',
      changes: { created: entityData },
      metadata: { operation: 'create' }
    }, context);
  }

  /**
   * Log entity update
   */
  async logUpdate(
    entityType: string,
    entityId: string,
    previousData: any,
    newData: any,
    context?: AuditContext
  ): Promise<void> {
    const changes = this.calculateChanges(previousData, newData);
    
    if (Object.keys(changes).length > 0) {
      await this.createAuditLog({
        entityType,
        entityId,
        action: 'UPDATE',
        changes,
        metadata: { operation: 'update' }
      }, context);
    }
  }

  /**
   * Log entity deletion
   */
  async logDelete(
    entityType: string,
    entityId: string,
    entityData: any,
    context?: AuditContext
  ): Promise<void> {
    await this.createAuditLog({
      entityType,
      entityId,
      action: 'DELETE',
      changes: { deleted: entityData },
      metadata: { operation: 'delete' }
    }, context);
  }

  /**
   * Log state transition
   */
  async logStateTransition(
    transitionData: StateTransitionAudit,
    context?: AuditContext
  ): Promise<void> {
    await this.createAuditLog({
      entityType: 'Transaction',
      entityId: transitionData.transactionId,
      action: 'STATE_TRANSITION',
      userId: transitionData.userId,
      changes: {
        previousState: transitionData.previousState,
        newState: transitionData.newState,
        reason: transitionData.reason
      },
      metadata: {
        operation: 'state_transition',
        ...transitionData.metadata
      }
    }, context);
  }

  /**
   * Log payment initialization
   */
  async logPaymentInitialization(
    transactionId: string,
    toronetReference: string,
    success: boolean,
    requestData: any,
    responseData?: any,
    error?: string,
    context?: AuditContext
  ): Promise<void> {
    await this.createAuditLog({
      entityType: 'Transaction',
      entityId: transactionId,
      action: 'PAYMENT_INITIALIZE',
      changes: {
        toronetReference,
        success,
        requestData,
        responseData,
        error
      },
      metadata: {
        operation: 'payment_initialization',
        toronetReference
      }
    }, context);
  }

  /**
   * Log payment confirmation
   */
  async logPaymentConfirmation(
    transactionId: string,
    toronetReference: string,
    amount: string,
    currency: string,
    verificationMethod: string,
    verificationData: any,
    context?: AuditContext
  ): Promise<void> {
    await this.createAuditLog({
      entityType: 'Transaction',
      entityId: transactionId,
      action: 'PAYMENT_CONFIRM',
      changes: {
        toronetReference,
        amount,
        currency,
        verificationMethod,
        verificationData
      },
      metadata: {
        operation: 'payment_confirmation',
        toronetReference,
        verificationMethod
      }
    }, context);
  }

  /**
   * Log payout initiation
   */
  async logPayoutInitiation(
    transactionId: string,
    payoutId: string,
    merchantId: string,
    amount: string,
    currency: string,
    idempotencyKey: string,
    context?: AuditContext
  ): Promise<void> {
    await this.createAuditLog({
      entityType: 'Payout',
      entityId: payoutId,
      action: 'PAYOUT_INITIATE',
      changes: {
        transactionId,
        merchantId,
        amount,
        currency,
        idempotencyKey
      },
      metadata: {
        operation: 'payout_initiation',
        transactionId,
        merchantId
      }
    }, context);
  }

  /**
   * Log payout completion
   */
  async logPayoutCompletion(
    payoutId: string,
    transactionId: string,
    success: boolean,
    payoutReference?: string,
    error?: string,
    context?: AuditContext
  ): Promise<void> {
    const action = success ? 'PAYOUT_COMPLETE' : 'PAYOUT_FAIL';
    
    await this.createAuditLog({
      entityType: 'Payout',
      entityId: payoutId,
      action,
      changes: {
        transactionId,
        success,
        payoutReference,
        error
      },
      metadata: {
        operation: success ? 'payout_completion' : 'payout_failure',
        transactionId
      }
    }, context);
  }

  /**
   * Log payment link disable/enable
   */
  async logPaymentLinkStatusChange(
    paymentLinkId: string,
    isActive: boolean,
    reason?: string,
    context?: AuditContext
  ): Promise<void> {
    const action = isActive ? 'ENABLE' : 'DISABLE';
    
    await this.createAuditLog({
      entityType: 'PaymentLink',
      entityId: paymentLinkId,
      action,
      changes: {
        isActive,
        reason
      },
      metadata: {
        operation: isActive ? 'enable' : 'disable',
        reason
      }
    }, context);
  }

  /**
   * Get audit trail for entity
   */
  async getEntityAuditTrail(
    entityType: string,
    entityId: string,
    context?: AuditContext
  ): Promise<AuditLogEntry[]> {
    const auditLogs = await this.auditLogRepository.getEntityTrail(
      entityType,
      entityId,
      { session: context?.session }
    );

    return auditLogs.map(log => this.mapToAuditLogEntry(log));
  }

  /**
   * Get state transition history for transaction
   */
  async getTransactionStateHistory(
    transactionId: string,
    context?: AuditContext
  ): Promise<AuditLogEntry[]> {
    const auditLogs = await this.auditLogRepository.findStateTransitions(
      transactionId,
      { session: context?.session }
    );

    return auditLogs.map(log => this.mapToAuditLogEntry(log));
  }

  /**
   * Generate correlation ID for tracking related operations
   */
  generateCorrelationId(): string {
    return `audit_${randomUUID()}`;
  }

  /**
   * Calculate changes between old and new data
   */
  private calculateChanges(oldData: any, newData: any): Record<string, any> {
    const changes: Record<string, any> = {};
    
    // Handle null/undefined cases
    if (!oldData && !newData) return changes;
    if (!oldData) return { added: newData };
    if (!newData) return { removed: oldData };
    
    // Compare primitive values
    if (typeof oldData !== 'object' || typeof newData !== 'object') {
      if (oldData !== newData) {
        changes.from = oldData;
        changes.to = newData;
      }
      return changes;
    }
    
    // Compare object properties
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
    
    for (const key of allKeys) {
      const oldValue = oldData[key];
      const newValue = newData[key];
      
      if (oldValue !== newValue) {
        if (oldValue === undefined) {
          changes[`added_${key}`] = newValue;
        } else if (newValue === undefined) {
          changes[`removed_${key}`] = oldValue;
        } else {
          changes[`changed_${key}`] = { from: oldValue, to: newValue };
        }
      }
    }
    
    return changes;
  }

  /**
   * Map database audit log to DTO
   */
  private mapToAuditLogEntry(auditLog: any): AuditLogEntry {
    return {
      id: auditLog._id.toString(),
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      action: auditLog.action,
      userId: auditLog.userId,
      changes: auditLog.changes,
      metadata: auditLog.metadata,
      timestamp: auditLog.timestamp,
      correlationId: auditLog.correlationId
    };
  }

  /**
   * Create fallback audit entry when database logging fails
   */
  private createFallbackAuditEntry(
    request: CreateAuditLogRequest,
    context?: AuditContext
  ): AuditLogEntry {
    return {
      id: 'fallback_' + Date.now(),
      entityType: request.entityType,
      entityId: request.entityId,
      action: request.action,
      userId: context?.userId || request.userId,
      changes: request.changes,
      metadata: {
        ...request.metadata,
        ...context?.metadata,
        fallback: true,
        error: 'Failed to persist to database'
      },
      timestamp: new Date(),
      correlationId: context?.correlationId || request.correlationId || this.generateCorrelationId()
    };
  }
}