import mongoose from 'mongoose';
import { AuditableRepository, AuditableRepositoryOptions } from './AuditableRepository';
import PaymentLink, { IPaymentLink } from '../models/PaymentLink';
import { PaginationParams } from '../types/common';
import { AuditService } from '../services/AuditService';

export interface PaymentLinkFilter {
  merchantId?: string;
  isActive?: boolean;
  currency?: 'NGN' | 'USD';
  amountMin?: string;
  amountMax?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

export class PaymentLinkRepository extends AuditableRepository<IPaymentLink> {
  protected entityType = 'PaymentLink';

  constructor(auditService?: AuditService) {
    super(PaymentLink, auditService);
  }

  /**
   * Find payment links by merchant ID
   */
  async findByMerchantId(
    merchantId: string,
    pagination?: PaginationParams,
    options?: AuditableRepositoryOptions
  ) {
    const filter: any = { merchantId };
    
    if (pagination) {
      return this.findWithPagination(filter, pagination, options);
    }
    
    return this.find(filter, options);
  }

  /**
   * Find active payment links
   */
  async findActive(options?: AuditableRepositoryOptions): Promise<IPaymentLink[]> {
    return this.find({ isActive: true }, options);
  }

  /**
   * Find payment links with advanced filtering
   */
  async findWithFilter(
    filter: PaymentLinkFilter,
    pagination?: PaginationParams,
    options?: AuditableRepositoryOptions
  ) {
    const mongoFilter: any = {};
    
    if (filter.merchantId) {
      mongoFilter.merchantId = filter.merchantId;
    }
    
    if (filter.isActive !== undefined) {
      mongoFilter.isActive = filter.isActive;
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
    
    if (pagination) {
      return this.findWithPagination(mongoFilter, pagination, options);
    }
    
    return this.find(mongoFilter, options);
  }

  /**
   * Disable a payment link
   */
  async disable(id: string, options?: AuditableRepositoryOptions): Promise<IPaymentLink | null> {
    const result = await this.updateById(id, { isActive: false }, options);
    
    // Log the disable action
    if (result && !options?.skipAudit) {
      await this.getAuditService().logPaymentLinkStatusChange(
        id,
        false,
        'Payment link disabled',
        options?.auditContext
      );
    }
    
    return result;
  }

  /**
   * Enable a payment link
   */
  async enable(id: string, options?: AuditableRepositoryOptions): Promise<IPaymentLink | null> {
    const result = await this.updateById(id, { isActive: true }, options);
    
    // Log the enable action
    if (result && !options?.skipAudit) {
      await this.getAuditService().logPaymentLinkStatusChange(
        id,
        true,
        'Payment link enabled',
        options?.auditContext
      );
    }
    
    return result;
  }

  /**
   * Get payment link statistics for a merchant
   */
  async getMerchantStats(merchantId: string, options?: AuditableRepositoryOptions) {
    try {
      const pipeline = [
        { $match: { merchantId } },
        {
          $group: {
            _id: null,
            totalLinks: { $sum: 1 },
            activeLinks: {
              $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
            },
            totalAmountNGN: {
              $sum: { $cond: [{ $eq: ['$currency', 'NGN'] }, '$amount', 0] }
            },
            totalAmountUSD: {
              $sum: { $cond: [{ $eq: ['$currency', 'USD'] }, '$amount', 0] }
            },
            avgAmount: { $avg: '$amount' },
            minAmount: { $min: '$amount' },
            maxAmount: { $max: '$amount' }
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
      throw this.handleError(error, 'getMerchantStats');
    }
  }

  /**
   * Find payment links that haven't been used recently
   */
  async findStale(daysSinceLastUse: number, options?: AuditableRepositoryOptions): Promise<IPaymentLink[]> {
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - daysSinceLastUse);
    
    return this.find({
      isActive: true,
      updatedAt: { $lt: staleDate }
    }, options);
  }
}