// @ts-nocheck
import { FilterQuery } from 'mongoose';
import { BaseRepository, RepositoryOptions } from './BaseRepository';
import Transaction, { ITransaction, TransactionState } from '../models/Transaction';
import { PaginationParams } from '../types/common';

export interface TransactionFilter {
  paymentLinkId?: string;
  state?: TransactionState | TransactionState[];
  currency?: 'NGN' | 'USD';
  amountMin?: string;
  amountMax?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  toronetReference?: string;
  payerEmail?: string;
}

export class TransactionRepository extends BaseRepository<ITransaction> {
  constructor() {
    super(Transaction);
  }

  /**
   * Find transactions by payment link ID
   */
  async findByPaymentLinkId(
    paymentLinkId: string,
    pagination?: PaginationParams,
    options?: RepositoryOptions
  ) {
    const filter: FilterQuery<ITransaction> = { paymentLinkId };
    
    if (pagination) {
      return this.findWithPagination(filter, pagination, options);
    }
    
    return this.find(filter, options);
  }

  /**
   * Find transaction by reference
   */
  async findByReference(reference: string, options?: RepositoryOptions): Promise<ITransaction | null> {
    return this.findOne({ reference }, options);
  }

  /**
   * Find transaction by Toronet reference
   */
  async findByToronetReference(toronetReference: string, options?: RepositoryOptions): Promise<ITransaction | null> {
    return this.findOne({ toronetReference }, options);
  }

  /**
   * Find transactions by state
   */
  async findByState(
    state: TransactionState | TransactionState[],
    pagination?: PaginationParams,
    options?: RepositoryOptions
  ) {
    const filter: FilterQuery<ITransaction> = {
      state: Array.isArray(state) ? { $in: state } : state
    };
    
    if (pagination) {
      return this.findWithPagination(filter, pagination, options);
    }
    
    return this.find(filter, options);
  }

  /**
   * Find transactions with advanced filtering
   */
  async findWithFilter(
    filter: TransactionFilter,
    pagination?: PaginationParams,
    options?: RepositoryOptions
  ) {
    const mongoFilter: FilterQuery<ITransaction> = {};
    
    if (filter.paymentLinkId) {
      mongoFilter.paymentLinkId = filter.paymentLinkId;
    }
    
    if (filter.state) {
      mongoFilter.state = Array.isArray(filter.state) ? { $in: filter.state } : filter.state;
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
    
    if (filter.toronetReference) {
      mongoFilter.toronetReference = filter.toronetReference;
    }
    
    if (filter.payerEmail) {
      mongoFilter['payerInfo.email'] = filter.payerEmail;
    }
    
    if (pagination) {
      return this.findWithPagination(mongoFilter, pagination, options);
    }
    
    return this.find(mongoFilter, options);
  }

  /**
   * Update transaction state
   */
  async updateState(
    id: string,
    newState: TransactionState,
    options?: RepositoryOptions
  ): Promise<ITransaction | null> {
    return this.updateById(id, { state: newState }, options);
  }

  /**
   * Set Toronet reference
   */
  async setToronetReference(
    id: string,
    toronetReference: string,
    options?: RepositoryOptions
  ): Promise<ITransaction | null> {
    return this.updateById(id, { toronetReference }, options);
  }

  /**
   * Find incomplete transactions (for cron jobs)
   */
  async findIncomplete(
    olderThanMinutes?: number,
    options?: RepositoryOptions
  ): Promise<ITransaction[]> {
    const filter: FilterQuery<ITransaction> = {
      state: { $in: [TransactionState.PENDING, TransactionState.INITIALIZED, TransactionState.PAYOUT_FAILED] }
    };
    
    if (olderThanMinutes) {
      const cutoffTime = new Date();
      cutoffTime.setMinutes(cutoffTime.getMinutes() - olderThanMinutes);
      filter.createdAt = { $lt: cutoffTime };
    }
    
    return this.find(filter, options);
  }

  /**
   * Find transactions ready for payout
   */
  async findReadyForPayout(options?: RepositoryOptions): Promise<ITransaction[]> {
    return this.find({ state: TransactionState.PAID }, options);
  }

  /**
   * Get transaction statistics
   */
  async getStats(filter?: TransactionFilter, options?: RepositoryOptions) {
    try {
      const matchFilter: any = {};
      
      if (filter?.paymentLinkId) {
        matchFilter.paymentLinkId = filter.paymentLinkId;
      }
      
      if (filter?.state) {
        matchFilter.state = Array.isArray(filter.state) ? { $in: filter.state } : filter.state;
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
            totalTransactions: { $sum: 1 },
            totalAmountNGN: {
              $sum: { $cond: [{ $eq: ['$currency', 'NGN'] }, '$amount', 0] }
            },
            totalAmountUSD: {
              $sum: { $cond: [{ $eq: ['$currency', 'USD'] }, '$amount', 0] }
            },
            pendingCount: {
              $sum: { $cond: [{ $eq: ['$state', 'PENDING'] }, 1, 0] }
            },
            initializedCount: {
              $sum: { $cond: [{ $eq: ['$state', 'INITIALIZED'] }, 1, 0] }
            },
            paidCount: {
              $sum: { $cond: [{ $eq: ['$state', 'PAID'] }, 1, 0] }
            },
            completedCount: {
              $sum: { $cond: [{ $eq: ['$state', 'COMPLETED'] }, 1, 0] }
            },
            failedCount: {
              $sum: { $cond: [{ $eq: ['$state', 'PAYOUT_FAILED'] }, 1, 0] }
            },
            avgAmount: { $avg: '$amount' }
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
   * Find transactions with processing delays
   */
  async findDelayed(
    state: TransactionState,
    delayMinutes: number,
    options?: RepositoryOptions
  ): Promise<ITransaction[]> {
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - delayMinutes);
    
    return this.find({
      state,
      updatedAt: { $lt: cutoffTime }
    }, options);
  }
}