import { ClientSession } from 'mongoose';
import { AuditService, AuditContext } from './AuditService';

export interface AuditableOperation {
  entityType: string;
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  oldData?: any;
  newData?: any;
}

export class AuditInterceptor {
  private auditService: AuditService;

  constructor(auditService?: AuditService) {
    this.auditService = auditService || new AuditService();
  }

  /**
   * Intercept and audit a repository operation
   */
  async intercept<T>(
    operation: () => Promise<T>,
    auditableOperation: AuditableOperation,
    context?: AuditContext
  ): Promise<T> {
    try {
      // Execute the operation
      const result = await operation();

      // Log the operation after successful execution
      await this.logOperation(auditableOperation, context);

      return result;
    } catch (error) {
      // Log failed operations too
      await this.logFailedOperation(auditableOperation, error, context);
      throw error;
    }
  }

  /**
   * Intercept create operations
   */
  async interceptCreate<T>(
    operation: () => Promise<T>,
    entityType: string,
    entityData: any,
    context?: AuditContext
  ): Promise<T> {
    const result = await operation();
    
    // Extract entity ID from result
    const entityId = this.extractEntityId(result);
    
    await this.auditService.logCreate(
      entityType,
      entityId,
      entityData,
      context
    );

    return result;
  }

  /**
   * Intercept update operations
   */
  async interceptUpdate<T>(
    operation: () => Promise<T>,
    entityType: string,
    entityId: string,
    oldData: any,
    newData: any,
    context?: AuditContext
  ): Promise<T> {
    const result = await operation();
    
    await this.auditService.logUpdate(
      entityType,
      entityId,
      oldData,
      newData,
      context
    );

    return result;
  }

  /**
   * Intercept delete operations
   */
  async interceptDelete<T>(
    operation: () => Promise<T>,
    entityType: string,
    entityId: string,
    entityData: any,
    context?: AuditContext
  ): Promise<T> {
    const result = await operation();
    
    await this.auditService.logDelete(
      entityType,
      entityId,
      entityData,
      context
    );

    return result;
  }

  /**
   * Create audit context from session and user info
   */
  createContext(
    userId?: string,
    session?: ClientSession,
    correlationId?: string,
    metadata?: Record<string, any>
  ): AuditContext {
    return {
      userId,
      session,
      correlationId: correlationId || this.auditService.generateCorrelationId(),
      metadata
    };
  }

  /**
   * Log successful operation
   */
  private async logOperation(
    auditableOperation: AuditableOperation,
    context?: AuditContext
  ): Promise<void> {
    try {
      switch (auditableOperation.operation) {
        case 'create':
          await this.auditService.logCreate(
            auditableOperation.entityType,
            auditableOperation.entityId,
            auditableOperation.newData,
            context
          );
          break;
        case 'update':
          await this.auditService.logUpdate(
            auditableOperation.entityType,
            auditableOperation.entityId,
            auditableOperation.oldData,
            auditableOperation.newData,
            context
          );
          break;
        case 'delete':
          await this.auditService.logDelete(
            auditableOperation.entityType,
            auditableOperation.entityId,
            auditableOperation.oldData,
            context
          );
          break;
      }
    } catch (error) {
      console.error('Failed to log audit operation:', error);
      // Don't throw - audit logging should not break business operations
    }
  }

  /**
   * Log failed operation
   */
  private async logFailedOperation(
    auditableOperation: AuditableOperation,
    error: any,
    context?: AuditContext
  ): Promise<void> {
    try {
      await this.auditService.createAuditLog({
        entityType: auditableOperation.entityType,
        entityId: auditableOperation.entityId,
        action: `${auditableOperation.operation.toUpperCase()}_FAILED`,
        changes: {
          operation: auditableOperation.operation,
          error: error.message,
          oldData: auditableOperation.oldData,
          newData: auditableOperation.newData
        },
        metadata: {
          operation: `${auditableOperation.operation}_failed`,
          errorType: error.name,
          errorMessage: error.message
        }
      }, context);
    } catch (auditError) {
      console.error('Failed to log failed operation:', auditError);
    }
  }

  /**
   * Extract entity ID from operation result
   */
  private extractEntityId(result: any): string {
    if (!result) return 'unknown';
    
    // Try common ID fields
    if (result._id) return result._id.toString();
    if (result.id) return result.id.toString();
    
    // For arrays, try to get ID from first element
    if (Array.isArray(result) && result.length > 0) {
      return this.extractEntityId(result[0]);
    }
    
    return 'unknown';
  }
}