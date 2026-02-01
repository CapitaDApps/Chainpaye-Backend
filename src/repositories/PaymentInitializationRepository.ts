// @ts-nocheck
import { FilterQuery } from 'mongoose';
import { BaseRepository, RepositoryOptions } from './BaseRepository';
import PaymentInitialization, { IPaymentInitialization } from '../models/PaymentInitialization';
import { PaginationParams } from '../types/common';

export interface PaymentInitializationFilter {
  transactionId?: string;
  toronetReference?: string;
  status?: 'SUCCESS' | 'FAILED';
  createdAfter?: Date;
  createdBefore?: Date;
}

export class PaymentInitializationRepository extends BaseRepository<IPaymentInitialization> {
  constructor() {
    super(PaymentInitialization);
  }

  /**
   * Find payment initializations by transaction ID
   */
  async findByTransactionId(
    transactionId: string,
    pagination?: PaginationParams,
    options?: RepositoryOptions
  ) {
    const filter: FilterQuery<IPaymentInitialization> = { transactionId };
    
    if (pagination) {
      return this.findWithPagination(filter, pagination, options);
    }
    
    return this.find(filter, options);
  }

  /**
   * Find payment initialization by Toronet reference
   */
  async findByToronetReference(
    toronetReference: string,
    options?: RepositoryOptions
  ): Promise<IPaymentInitialization | null> {
    return this.findOne({ toronetReference }, options);
  }

  /**
   * Find latest payment initialization for transaction
   */
  async findLatestByTransactionId(
    transactionId: string,
    options?: RepositoryOptions
  ): Promise<IPaymentInitialization | null> {
    try {
      let query = this.model.findOne({ transactionId }).sort({ createdAt: -1 });
      
      if (options?.session) {
        query = query.session(options.session);
      }
      
      if (options?.lean) {
        query = query.lean();
      }
      
      if (options?.populate) {
        query = query.populate(options.populate);
      }
      
      return await query.exec();
    } catch (error) {
      throw this.handleError(error, 'findLatestByTransactionId');
    }
  }

  /**
   * Find payment initializations by status
   */
  async findByStatus(
    status: 'SUCCESS' | 'FAILED',
    pagination?: PaginationParams,
    options?: RepositoryOptions
  ) {
    const filter: FilterQuery<IPaymentInitialization> = { status };
    
    if (pagination) {
      return this.findWithPagination(filter, pagination, options);
    }
    
    return this.find(filter, options);
  }

  /**
   * Find payment initializations with advanced filtering
   */
  async findWithFilter(
    filter: PaymentInitializationFilter,
    pagination?: PaginationParams,
    options?: RepositoryOptions
  ) {
    const mongoFilter: FilterQuery<IPaymentInitialization> = {};
    
    if (filter.transactionId) {
      mongoFilter.transactionId = filter.transactionId;
    }
    
    if (filter.toronetReference) {
      mongoFilter.toronetReference = filter.toronetReference;
    }
    
    if (filter.status) {
      mongoFilter.status = filter.status;
    }
    
    if (filter.createdAfter || filter.createdBefore) {
      mongoFilter.createdAt = {};
      if (filter.createdAfter) {
        mongoFilter.createdAt.$gte = filter.createdAfter;
      }
      if (filter.createdBefore) {
        mongoFilter.createdAt.$lte = filter.createdBefore;
      }
    }
    
    if (pagination) {
      return this.findWithPagination(mongoFilter, pagination, options);
    }
    
    return this.find(mongoFilter, options);
  }

  /**
   * Find failed payment initializations for retry
   */
  async findFailedForRetry(
    olderThanMinutes: number,
    options?: RepositoryOptions
  ): Promise<IPaymentInitialization[]> {
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - olderThanMinutes);
    
    return this.find({
      status: 'FAILED',
      createdAt: { $lt: cutoffTime }
    }, options);
  }

  /**
   * Get payment initialization statistics
   */
  async getStats(filter?: PaymentInitializationFilter, options?: RepositoryOptions) {
    try {
      const matchFilter: any = {};
      
      if (filter?.transactionId) {
        matchFilter.transactionId = filter.transactionId;
      }
      
      if (filter?.status) {
        matchFilter.status = filter.status;
      }
      
      if (filter?.createdAfter || filter?.createdBefore) {
        matchFilter.createdAt = {};
        if (filter.createdAfter) {
          matchFilter.createdAt.$gte = filter.createdAfter;
        }
        if (filter.createdBefore) {
          matchFilter.createdAt.$lte = filter.createdBefore;
        }
      }

      const pipeline = [
        { $match: matchFilter },
        {
          $group: {
            _id: null,
            totalInitializations: { $sum: 1 },
            successCount: {
              $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] }
            },
            failedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] }
            },
            successRate: {
              $avg: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] }
            }
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
}