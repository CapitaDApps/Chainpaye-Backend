import { Document, UpdateQuery, ClientSession } from 'mongoose';
import { BaseRepository, RepositoryOptions } from './BaseRepository';
import { AuditInterceptor, AuditableOperation } from '../services/AuditInterceptor';
import { AuditService, AuditContext } from '../services/AuditService';

export interface AuditableRepositoryOptions extends RepositoryOptions {
  auditContext?: AuditContext;
  skipAudit?: boolean;
}

export abstract class AuditableRepository<T extends Document> extends BaseRepository<T> {
  protected auditInterceptor: AuditInterceptor;
  protected abstract entityType: string;

  constructor(model: any, auditService?: AuditService) {
    super(model);
    this.auditInterceptor = new AuditInterceptor(auditService);
  }

  /**
   * Create with audit logging
   */
  async create(data: Partial<T>, options?: AuditableRepositoryOptions): Promise<T> {
    if (options?.skipAudit) {
      return super.create(data, options);
    }

    return this.auditInterceptor.interceptCreate(
      () => super.create(data, options),
      this.entityType,
      data,
      options?.auditContext
    );
  }

  /**
   * Update by ID with audit logging
   */
  async updateById(
    id: string,
    update: UpdateQuery<T>,
    options?: AuditableRepositoryOptions & { returnNew?: boolean }
  ): Promise<T | null> {
    if (options?.skipAudit) {
      return super.updateById(id, update, options);
    }

    // Get old data for audit trail
    const oldData = await super.findById(id, { session: options?.session });
    
    const result = await this.auditInterceptor.interceptUpdate(
      () => super.updateById(id, update, options),
      this.entityType,
      id,
      oldData,
      update,
      options?.auditContext
    );

    return result;
  }

  /**
   * Update one with audit logging
   */
  async updateOne(
    filter: any,
    update: UpdateQuery<T>,
    options?: AuditableRepositoryOptions & { returnNew?: boolean }
  ): Promise<T | null> {
    if (options?.skipAudit) {
      return super.updateOne(filter, update, options);
    }

    // Get old data for audit trail
    const oldData = await super.findOne(filter, { session: options?.session });
    if (!oldData) {
      return super.updateOne(filter, update, options);
    }

    const entityId = this.extractEntityId(oldData);
    
    const result = await this.auditInterceptor.interceptUpdate(
      () => super.updateOne(filter, update, options),
      this.entityType,
      entityId,
      oldData,
      update,
      options?.auditContext
    );

    return result;
  }

  /**
   * Delete by ID with audit logging
   */
  async deleteById(id: string, options?: AuditableRepositoryOptions): Promise<T | null> {
    if (options?.skipAudit) {
      return super.deleteById(id, options);
    }

    // Get data before deletion for audit trail
    const entityData = await super.findById(id, { session: options?.session });
    if (!entityData) {
      return null;
    }

    return this.auditInterceptor.interceptDelete(
      () => super.deleteById(id, options),
      this.entityType,
      id,
      entityData,
      options?.auditContext
    );
  }

  /**
   * Delete one with audit logging
   */
  async deleteOne(filter: any, options?: AuditableRepositoryOptions): Promise<T | null> {
    if (options?.skipAudit) {
      return super.deleteOne(filter, options);
    }

    // Get data before deletion for audit trail
    const entityData = await super.findOne(filter, { session: options?.session });
    if (!entityData) {
      return null;
    }

    const entityId = this.extractEntityId(entityData);

    return this.auditInterceptor.interceptDelete(
      () => super.deleteOne(filter, options),
      this.entityType,
      entityId,
      entityData,
      options?.auditContext
    );
  }

  /**
   * Create audit context for operations
   */
  protected createAuditContext(
    userId?: string,
    session?: ClientSession,
    correlationId?: string,
    metadata?: Record<string, any>
  ): AuditContext {
    return this.auditInterceptor.createContext(userId, session, correlationId, metadata);
  }

  /**
   * Extract entity ID from document
   */
  protected extractEntityId(document: any): string {
    if (!document) return 'unknown';
    if (document._id) return document._id.toString();
    if (document.id) return document.id.toString();
    return 'unknown';
  }

  /**
   * Get audit service for custom logging
   */
  protected getAuditService(): AuditService {
    return this.auditInterceptor['auditService'];
  }
}