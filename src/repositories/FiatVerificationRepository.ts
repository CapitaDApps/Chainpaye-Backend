// @ts-nocheck
import { FilterQuery } from 'mongoose';
import { BaseRepository, RepositoryOptions } from './BaseRepository';
import FiatVerification, { IFiatVerification } from '../models/FiatVerification';
import { PaginationParams } from '../types/common';

export interface FiatVerificationFilter {
  transactionId?: string;
  toronetReference?: string;
  verificationMethod?: 'POLL' | 'WEBHOOK' | 'MANUAL';
  currency?: 'NGN' | 'USD' | 'GBP' | 'EUR';
  amountMin?: string;
  amountMax?: string;
  confirmedAfter?: Date;
  confirmedBefore?: Date;
  createdAfter?: Date;
  createdBefore?: Date;
}

export class FiatVerificationRepository extends BaseRepository<IFiatVerification> {
  constructor() {
    super(FiatVerification);
  }

  /**
   * Find fiat verification by transaction ID
   */
  async findByTransactionId(
    transactionId: string,
    options?: RepositoryOptions
  ): Promise<IFiatVerification | null> {
    return this.findOne({ transactionId }, options);
  }

  /**
   * Find fiat verification by Toronet reference
   */
  async findByToronetReference(
    toronetReference: string,
    options?: RepositoryOptions
  ): Promise<IFiatVerification | null> {
    return this.findOne({ toronetReference }, options);
  }

  /**
   * Find fiat verifications by verification method
   */
  async findByVerificationMethod(
    verificationMethod: 'POLL' | 'WEBHOOK' | 'MANUAL',
    pagination?: PaginationParams,
    options?: RepositoryOptions
  ) {
    const filter: FilterQuery<IFiatVerification> = { verificationMethod };
    
    if (pagination) {
      return this.findWithPagination(filter, pagination, options);
    }
    
    return this.find(filter, options);
  }

  /**
   * Find fiat verifications with advanced filtering
   */
  async findWithFilter(
    filter: FiatVerificationFilter,
    pagination?: PaginationParams,
    options?: RepositoryOptions
  ) {
    const mongoFilter: FilterQuery<IFiatVerification> = {};
    
    if (filter.transactionId) {
      mongoFilter.transactionId = filter.transactionId;
    }
    
    if (filter.toronetReference) {
      mongoFilter.toronetReference = filter.toronetReference;
    }
    
    if (filter.verificationMethod) {
      mongoFilter.verificationMethod = filter.verificationMethod;
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
    
    if (filter.confirmedAfter || filter.confirmedBefore) {
      mongoFilter.confirmedAt = {};
      if (filter.confirmedAfter) {
        mongoFilter.confirmedAt.$gte = filter.confirmedAfter;
      }
      if (filter.confirmedBefore) {
        mongoFilter.confirmedAt.$lte = filter.confirmedBefore;
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
    
    if (pagination) {
      return this.findWithPagination(mongoFilter, pagination, options);
    }
    
    return this.find(mongoFilter, options);
  }

  /**
   * Check if transaction has fiat verification
   */
  async hasVerification(transactionId: string, options?: RepositoryOptions): Promise<boolean> {
    return this.exists({ transactionId }, options);
  }

  /**
   * Find recent verifications
   */
  async findRecent(
    hours: number = 24,
    options?: RepositoryOptions
  ): Promise<IFiatVerification[]> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);
    
    return this.find({
      confirmedAt: { $gte: cutoffTime }
    }, options);
  }

  /**
   * Get fiat verification statistics
   */
  async getStats(filter?: FiatVerificationFilter, options?: RepositoryOptions) {
    try {
      const matchFilter: any = {};
      
      if (filter?.verificationMethod) {
        matchFilter.verificationMethod = filter.verificationMethod;
      }
      
      if (filter?.currency) {
        matchFilter.currency = filter.currency;
      }
      
      if (filter?.confirmedAfter || filter?.confirmedBefore) {
        matchFilter.confirmedAt = {};
        if (filter.confirmedAfter) {
          matchFilter.confirmedAt.$gte = filter.confirmedAfter;
        }
        if (filter.confirmedBefore) {
          matchFilter.confirmedAt.$lte = filter.confirmedBefore;
        }
      }

      const pipeline = [
        { $match: matchFilter },
        {
          $group: {
            _id: null,
            totalVerifications: { $sum: 1 },
            totalAmountNGN: {
              $sum: { $cond: [{ $eq: ['$currency', 'NGN'] }, '$amount', 0] }
            },
            totalAmountUSD: {
              $sum: { $cond: [{ $eq: ['$currency', 'USD'] }, '$amount', 0] }
            },
            pollCount: {
              $sum: { $cond: [{ $eq: ['$verificationMethod', 'POLL'] }, 1, 0] }
            },
            webhookCount: {
              $sum: { $cond: [{ $eq: ['$verificationMethod', 'WEBHOOK'] }, 1, 0] }
            },
            manualCount: {
              $sum: { $cond: [{ $eq: ['$verificationMethod', 'MANUAL'] }, 1, 0] }
            },
            avgAmount: { $avg: '$amount' },
            avgProcessingTime: {
              $avg: {
                $subtract: ['$createdAt', '$confirmedAt']
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
   * Find verifications by amount range
   */
  async findByAmountRange(
    minAmount: string,
    maxAmount: string,
    currency?: 'NGN' | 'USD' | 'GBP' | 'EUR',
    options?: RepositoryOptions
  ): Promise<IFiatVerification[]> {
    const filter: FilterQuery<IFiatVerification> = {
      amount: { $gte: minAmount, $lte: maxAmount }
    };
    
    if (currency) {
      filter.currency = currency;
    }
    
    return this.find(filter, options);
  }
}