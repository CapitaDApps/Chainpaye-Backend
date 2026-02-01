// @ts-nocheck
import { FilterQuery } from 'mongoose';
import { BaseRepository, RepositoryOptions } from './BaseRepository';
import AuditLog, { IAuditLog } from '../models/AuditLog';
import { PaginationParams } from '../types/common';
import { AuditLogFilter } from '../types/audit';

export class AuditLogRepository extends BaseRepository<IAuditLog> {
  constructor() {
    super(AuditLog);
  }

  /**
   * Find audit logs by entity
   */
  async findByEntity(
    entityType: string,
    entityId: string,
    pagination?: PaginationParams,
    options?: RepositoryOptions
  ) {
    const filter: FilterQuery<IAuditLog> = { entityType, entityId };
    
    if (pagination) {
      return this.findWithPagination(filter, pagination, options);
    }
    
    return this.find(filter, options);
  }

  /**
   * Find audit logs by correlation ID
   */
  async findByCorrelationId(
    correlationId: string,
    pagination?: PaginationParams,
    options?: RepositoryOptions
  ) {
    const filter: FilterQuery<IAuditLog> = { correlationId };
    
    if (pagination) {
      return this.findWithPagination(filter, pagination, options);
    }
    
    return this.find(filter, options);
  }

  /**
   * Find audit logs by action
   */
  async findByAction(
    action: string,
    pagination?: PaginationParams,
    options?: RepositoryOptions
  ) {
    const filter: FilterQuery<IAuditLog> = { action };
    
    if (pagination) {
      return this.findWithPagination(filter, pagination, options);
    }
    
    return this.find(filter, options);
  }

  /**
   * Find audit logs by user
   */
  async findByUser(
    userId: string,
    pagination?: PaginationParams,
    options?: RepositoryOptions
  ) {
    const filter: FilterQuery<IAuditLog> = { userId };
    
    if (pagination) {
      return this.findWithPagination(filter, pagination, options);
    }
    
    return this.find(filter, options);
  }

  /**
   * Find audit logs with advanced filtering
   */
  async findWithFilter(
    filter: AuditLogFilter,
    pagination?: PaginationParams,
    options?: RepositoryOptions
  ) {
    const mongoFilter: FilterQuery<IAuditLog> = {};
    
    if (filter.entityType) {
      mongoFilter.entityType = filter.entityType;
    }
    
    if (filter.entityId) {
      mongoFilter.entityId = filter.entityId;
    }
    
    if (filter.action) {
      mongoFilter.action = filter.action;
    }
    
    if (filter.userId) {
      mongoFilter.userId = filter.userId;
    }
    
    if (filter.correlationId) {
      mongoFilter.correlationId = filter.correlationId;
    }
    
    if (filter.startDate || filter.endDate) {
      mongoFilter.timestamp = {};
      if (filter.startDate) {
        mongoFilter.timestamp.$gte = filter.startDate;
      }
      if (filter.endDate) {
        mongoFilter.timestamp.$lte = filter.endDate;
      }
    }
    
    if (pagination) {
      return this.findWithPagination(mongoFilter, pagination, options);
    }
    
    return this.find(mongoFilter, options);
  }

  /**
   * Find recent audit logs
   */
  async findRecent(
    hours: number = 24,
    entityType?: string,
    options?: RepositoryOptions
  ): Promise<IAuditLog[]> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);
    
    const filter: FilterQuery<IAuditLog> = {
      timestamp: { $gte: cutoffTime }
    };
    
    if (entityType) {
      filter.entityType = entityType;
    }
    
    return this.find(filter, options);
  }

  /**
   * Get audit statistics
   */
  async getStats(filter?: AuditLogFilter, options?: RepositoryOptions) {
    try {
      const matchFilter: any = {};
      
      if (filter?.entityType) {
        matchFilter.entityType = filter.entityType;
      }
      
      if (filter?.action) {
        matchFilter.action = filter.action;
      }
      
      if (filter?.userId) {
        matchFilter.userId = filter.userId;
      }
      
      if (filter?.startDate || filter?.endDate) {
        matchFilter.timestamp = {};
        if (filter.startDate) {
          matchFilter.timestamp.$gte = filter.startDate;
        }
        if (filter.endDate) {
          matchFilter.timestamp.$lte = filter.endDate;
        }
      }

      const pipeline = [
        { $match: matchFilter },
        {
          $group: {
            _id: null,
            totalLogs: { $sum: 1 },
            uniqueEntities: { $addToSet: '$entityId' },
            uniqueUsers: { $addToSet: '$userId' },
            actionCounts: {
              $push: '$action'
            },
            entityTypeCounts: {
              $push: '$entityType'
            }
          }
        },
        {
          $project: {
            totalLogs: 1,
            uniqueEntityCount: { $size: '$uniqueEntities' },
            uniqueUserCount: { $size: '$uniqueUsers' },
            actionCounts: 1,
            entityTypeCounts: 1
          }
        }
      ];

      if (options?.session) {
        const result = await this.model.aggregate(pipeline).session(options.session);
        return result[0] || null;
      }

      const result = await this.model.aggregate(pipeline);
      return result[0] || null;
    } catch (error) {
      throw this.handleError(error, 'getStats');
    }
  }

  /**
   * Find audit trail for entity
   */
  async getEntityTrail(
    entityType: string,
    entityId: string,
    options?: RepositoryOptions
  ): Promise<IAuditLog[]> {
    return this.find(
      { entityType, entityId },
      { ...options, lean: false }
    ).then(logs => logs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()));
  }

  /**
   * Find state transitions for transaction
   */
  async findStateTransitions(
    transactionId: string,
    options?: RepositoryOptions
  ): Promise<IAuditLog[]> {
    return this.find({
      entityType: 'Transaction',
      entityId: transactionId,
      action: 'STATE_TRANSITION'
    }, options);
  }

  /**
   * Override create to prevent updates (audit logs are immutable)
   */
  async updateById(): Promise<never> {
    throw new Error('Audit logs are immutable and cannot be updated');
  }

  async updateOne(): Promise<never> {
    throw new Error('Audit logs are immutable and cannot be updated');
  }

  async deleteById(): Promise<never> {
    throw new Error('Audit logs cannot be deleted');
  }

  async deleteOne(): Promise<never> {
    throw new Error('Audit logs cannot be deleted');
  }
}