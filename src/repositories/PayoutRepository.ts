// @ts-nocheck
import { FilterQuery } from 'mongoose';
import { BaseRepository, RepositoryOptions } from './BaseRepository';
import Payout, { IPayout } from '../models/Payout';
import { PaginationParams } from '../types/common';

export interface PayoutFilter {
  transactionId?: string;
  merchantId?: string;
  status?: 'PENDING' | 'SUCCESS' | 'FAILED';
  currency?: 'NGN' | 'USD' | 'GBP' | 'EUR';
  amountMin?: string;
  amountMax?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  completedAfter?: Date;
  completedBefore?: Date;
}

export class PayoutRepository extends BaseRepository<IPayout> {
  constructor() {
    super(Payout);
  }

  /**
   * Find payout by transaction ID
   */
  async findByTransactionId(
    transactionId: string,
    options?: RepositoryOptions
  ): Promise<IPayout | null> {
    return this.findOne({ transactionId }, options);
  }

  /**
   * Find payout by idempotency key
   */
  async findByIdempotencyKey(
    idempotencyKey: string,
    options?: RepositoryOptions
  ): Promise<IPayout | null> {
    return this.findOne({ idempotencyKey }, options);
  }

  /**
   * Find payouts by merchant ID
   */
  async findByMerchantId(
    merchantId: string,
    pagination?: PaginationParams,
    options?: RepositoryOptions
  ) {
    const filter: FilterQuery<IPayout> = { merchantId };
    
    if (pagination) {
      return this.findWithPagination(filter, pagination, options);
    }
    
    return this.find(filter, options);
  }

  /**
   * Find payouts by status
   */
  async findByStatus(
    status: 'PENDING' | 'SUCCESS' | 'FAILED',
    pagination?: PaginationParams,
    options?: RepositoryOptions
  ) {
    const filter: FilterQuery<IPayout> = { status };
    
    if (pagination) {
      return this.findWithPagination(filter, pagination, options);
    }
    
    return this.find(filter, options);
  }

  /**
   * Find payouts with advanced filtering
   */
  async findWithFilter(
    filter: PayoutFilter,
    pagination?: PaginationParams,
    options?: RepositoryOptions
  ) {
    const mongoFilter: FilterQuery<IPayout> = {};
    
    if (filter.transactionId) {
      mongoFilter.transactionId = filter.transactionId;
    }
    
    if (filter.merchantId) {
      mongoFilter.merchantId = filter.merchantId;
    }
    
    if (filter.status) {
      mongoFilter.status = filter.status;
    }
    
    if (filter.currency) {
      mongoFilter.currency = filter.currency;
    }
    
    if (filter.amountMin !== undefined || filter.amountMax !== undefined) {
      mongoFilter.amount = {};
      if (filter.amountMin !== undefined) {
        mongoFilter.amount.$gte = filter.amountMin;
      }
      if (filter.amountMax !== undefined) {
        mongoFilter.amount.$lte = filter.amountMax;
      }
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
    
    if (filter.completedAfter || filter.completedBefore) {
      mongoFilter.completedAt = {};
      if (filter.completedAfter) {
        mongoFilter.completedAt.$gte = filter.completedAfter;
      }
      if (filter.completedBefore) {
        mongoFilter.completedAt.$lte = filter.completedBefore;
      }
    }
    
    if (pagination) {
      return this.findWithPagination(mongoFilter, pagination, options);
    }
    
    return this.find(mongoFilter, options);
  }

  /**
   * Update payout status
   */
  async updateStatus(
    id: string,
    status: 'PENDING' | 'SUCCESS' | 'FAILED',
    payoutReference?: string,
    error?: string,
    options?: RepositoryOptions
  ): Promise<IPayout | null> {
    const update: any = { status };
    
    if (payoutReference) {
      update.payoutReference = payoutReference;
    }
    
    if (error) {
      update.error = error;
    }
    
    return this.updateById(id, update, options);
  }

  /**
   * Find pending payouts
   */
  async findPending(options?: RepositoryOptions): Promise<IPayout[]> {
    return this.find({ status: 'PENDING' }, options);
  }

  /**
   * Find failed payouts for retry
   */
  async findFailedForRetry(
    olderThanMinutes: number,
    options?: RepositoryOptions
  ): Promise<IPayout[]> {
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - olderThanMinutes);
    
    return this.find({
      status: 'FAILED',
      createdAt: { $lt: cutoffTime }
    }, options);
  }

  /**
   * Check if payout exists for transaction
   */
  async existsForTransaction(transactionId: string, options?: RepositoryOptions): Promise<boolean> {
    return this.exists({ transactionId }, options);
  }

  /**
   * Get payout statistics
   */
  async getStats(filter?: PayoutFilter, options?: RepositoryOptions) {
    try {
      const matchFilter: any = {};
      
      if (filter?.merchantId) {
        matchFilter.merchantId = filter.merchantId;
      }
      
      if (filter?.status) {
        matchFilter.status = filter.status;
      }
      
      if (filter?.currency) {
        matchFilter.currency = filter.currency;
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
            totalPayouts: { $sum: 1 },
            totalAmountNGN: {
              $sum: { $cond: [{ $eq: ['$currency', 'NGN'] }, '$amount', 0] }
            },
            totalAmountUSD: {
              $sum: { $cond: [{ $eq: ['$currency', 'USD'] }, '$amount', 0] }
            },
            pendingCount: {
              $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] }
            },
            successCount: {
              $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] }
            },
            failedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] }
            },
            successRate: {
              $avg: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] }
            },
            avgAmount: { $avg: '$amount' },
            avgProcessingTime: {
              $avg: {
                $cond: [
                  { $ne: ['$completedAt', null] },
                  { $subtract: ['$completedAt', '$createdAt'] },
                  null
                ]
              }
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

  /**
   * Find merchant payout summary
   */
  async getMerchantSummary(
    merchantId: string,
    startDate?: Date,
    endDate?: Date,
    options?: RepositoryOptions
  ) {
    try {
      const matchFilter: any = { merchantId };
      
      if (startDate || endDate) {
        matchFilter.createdAt = {};
        if (startDate) {
          matchFilter.createdAt.$gte = startDate;
        }
        if (endDate) {
          matchFilter.createdAt.$lte = endDate;
        }
      }

      const pipeline = [
        { $match: matchFilter },
        {
          $group: {
            _id: '$currency',
            totalAmount: { $sum: '$amount' },
            successfulAmount: {
              $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, '$amount', 0] }
            },
            pendingAmount: {
              $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, '$amount', 0] }
            },
            count: { $sum: 1 },
            successCount: {
              $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] }
            }
          }
        }
      ];

      if (options?.session) {
        return await this.model.aggregate(pipeline).session(options.session);
      }

      return await this.model.aggregate(pipeline);
    } catch (error) {
      throw this.handleError(error, 'getMerchantSummary');
    }
  }
}