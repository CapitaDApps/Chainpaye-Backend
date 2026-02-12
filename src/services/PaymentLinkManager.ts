import { ClientSession } from 'mongoose';
import { PaymentLinkRepository } from '../repositories/PaymentLinkRepository';
import { AuditService, AuditContext } from './AuditService';
import { 
  CreatePaymentLinkRequest, 
  CreatePaymentLinkResponse, 
  PaymentLinkListResponse,
  PaymentLinkStatusResponse 
} from '../types/payment-link';
import { PaginationParams, OperationResult } from '../types/common';
import { IPaymentLink } from '../models/PaymentLink';

export interface PaymentLinkManagerOptions {
  auditContext?: AuditContext;
  session?: ClientSession;
}

export class PaymentLinkManager {
  private paymentLinkRepository: PaymentLinkRepository;
  private auditService: AuditService;

  constructor(
    paymentLinkRepository?: PaymentLinkRepository,
    auditService?: AuditService
  ) {
    this.paymentLinkRepository = paymentLinkRepository || new PaymentLinkRepository();
    this.auditService = auditService || new AuditService();
  }

  /**
   * Create a new payment link with fixed amount and currency
   * Requirements: 1.1, 1.2, 1.3, 1.4
   */
  async createPaymentLink(
    request: CreatePaymentLinkRequest,
    options?: PaymentLinkManagerOptions
  ): Promise<OperationResult<CreatePaymentLinkResponse>> {
    try {
      // Create payment link data with temporary linkUrl
      const tempLinkUrl = `https://chainpaye.com/payment/temp_${Date.now()}`;
      const paymentLinkData = {
        merchantId: request.merchantId,
        userId: request.userId,
        name: request.name,
        amount: request.amount,
        currency: request.currency,
        description: request.description,
        isActive: true,
        // address: "0x3c45e44daae997b3ac8644ff3fdd13c120634f10",
        address:request.address,
        token: request.token,
        selectedCurrency: request.selectedCurrency,
        paymentType: request.paymentType,
        successUrl: request.successUrl || "https://chainpaye.com/",
        linkUrl: tempLinkUrl, // Temporary URL to satisfy required field
        metadata: request.metadata || {}
      };

      // Create audit context
      const auditContext = options?.auditContext || this.createAuditContext(options?.session);

      // Create payment link in database
      const paymentLink = await this.paymentLinkRepository.create(paymentLinkData, {
        session: options?.session,
        auditContext
      });

      // Update the payment link with the correct linkUrl using the MongoDB ObjectId
      const correctLinkUrl = `https://chainpaye.com/payment/${paymentLink.id}`;
      const updatedPaymentLink = await this.paymentLinkRepository.updateById(
        paymentLink.id,
        { linkUrl: correctLinkUrl },
        {
          session: options?.session,
          skipAudit: true // Skip audit for this internal update
        }
      );

      // Map to response DTO using the updated payment link
      const response = this.mapToCreateResponse(updatedPaymentLink || paymentLink);

      return {
        success: true,
        data: response,
        retryable: false
      };

    } catch (error: any) {
      console.error('Failed to create payment link:', error);
      
      return {
        success: false,
        error: `Failed to create payment link: ${error.message}`,
        retryable: this.isRetryableError(error)
      };
    }
  }

  /**
   * Get payment link by ID
   * Requirements: 1.1
   */
  async getPaymentLink(
    linkId: string,
    options?: PaymentLinkManagerOptions
  ): Promise<OperationResult<CreatePaymentLinkResponse>> {
    try {
      if (!linkId || typeof linkId !== 'string') {
        return {
          success: false,
          error: 'Invalid payment link ID',
          retryable: false
        };
      }

      const paymentLink = await this.paymentLinkRepository.findById(linkId, {
        session: options?.session
      });

      if (!paymentLink) {
        return {
          success: false,
          error: 'This payment link could not be found. It may have been removed or the link might be incorrect. Please check the link and try again.',
          retryable: false
        };
      }

      const response = this.mapToCreateResponse(paymentLink);

      return {
        success: true,
        data: response,
        retryable: false
      };

    } catch (error: any) {
      console.error('Failed to get payment link:', error);
      
      return {
        success: false,
        error: `Failed to get payment link: ${error.message}`,
        retryable: this.isRetryableError(error)
      };
    }
  }

  /**
   * Disable payment link (prevents new transactions while preserving existing ones)
   * Requirements: 1.6
   */
  async disablePaymentLink(
    linkId: string,
    reason?: string,
    options?: PaymentLinkManagerOptions
  ): Promise<OperationResult<void>> {
    try {
      if (!linkId || typeof linkId !== 'string') {
        return {
          success: false,
          error: 'Invalid payment link ID',
          retryable: false
        };
      }

      // Check if payment link exists
      const existingLink = await this.paymentLinkRepository.findById(linkId, {
        session: options?.session
      });

      if (!existingLink) {
        return {
          success: false,
          error: 'Unable to disable payment link. The link could not be found - it may have already been removed or the link ID is incorrect.',
          retryable: false
        };
      }

      if (!existingLink.isActive) {
        return {
          success: false,
          error: 'This payment link is already disabled. No action needed.',
          retryable: false
        };
      }

      // Create audit context with reason
      const auditContext = options?.auditContext || this.createAuditContext(
        options?.session,
        { reason: reason || 'Payment link disabled by user' }
      );

      // Disable the payment link
      await this.paymentLinkRepository.disable(linkId, {
        session: options?.session,
        auditContext
      });

      return {
        success: true,
        retryable: false
      };

    } catch (error: any) {
      console.error('Failed to disable payment link:', error);
      
      return {
        success: false,
        error: `Failed to disable payment link: ${error.message}`,
        retryable: this.isRetryableError(error)
      };
    }
  }

  /**
   * Enable payment link
   */
  async enablePaymentLink(
    linkId: string,
    reason?: string,
    options?: PaymentLinkManagerOptions
  ): Promise<OperationResult<void>> {
    try {
      if (!linkId || typeof linkId !== 'string') {
        return {
          success: false,
          error: 'Invalid payment link ID',
          retryable: false
        };
      }

      // Check if payment link exists
      const existingLink = await this.paymentLinkRepository.findById(linkId, {
        session: options?.session
      });

      if (!existingLink) {
        return {
          success: false,
          error: 'Unable to enable payment link. The link could not be found - it may have been removed or the link ID is incorrect.',
          retryable: false
        };
      }

      if (existingLink.isActive) {
        return {
          success: false,
          error: 'This payment link is already enabled and ready to accept payments.',
          retryable: false
        };
      }

      // Create audit context with reason
      const auditContext = options?.auditContext || this.createAuditContext(
        options?.session,
        { reason: reason || 'Payment link enabled by user' }
      );

      // Enable the payment link
      await this.paymentLinkRepository.enable(linkId, {
        session: options?.session,
        auditContext
      });

      return {
        success: true,
        retryable: false
      };

    } catch (error: any) {
      console.error('Failed to enable payment link:', error);
      
      return {
        success: false,
        error: `Failed to enable payment link: ${error.message}`,
        retryable: this.isRetryableError(error)
      };
    }
  }

  /**
   * List payment links for a merchant
   * Requirements: 1.1, 1.5
   */
  async listPaymentLinks(
    merchantId: string,
    pagination?: PaginationParams,
    options?: PaymentLinkManagerOptions
  ): Promise<OperationResult<PaymentLinkListResponse>> {
    try {
      if (!merchantId || typeof merchantId !== 'string') {
        return {
          success: false,
          error: 'Invalid merchant ID',
          retryable: false
        };
      }

      const result = await this.paymentLinkRepository.findByMerchantId(
        merchantId,
        pagination,
        { session: options?.session }
      );

      let paymentLinks: IPaymentLink[];
      let paginationResponse;

      if ('documents' in result) {
        // Paginated result
        paymentLinks = result.documents;
        paginationResponse = result.pagination;
      } else {
        // Non-paginated result
        paymentLinks = result;
        paginationResponse = {
          total: result.length,
          page: 1,
          limit: result.length,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        };
      }

      const response: PaymentLinkListResponse = {
        paymentLinks: paymentLinks.map(link => this.mapToCreateResponse(link)),
        ...paginationResponse
      };

      return {
        success: true,
        data: response,
        retryable: false
      };

    } catch (error: any) {
      console.error('Failed to list payment links:', error);
      
      return {
        success: false,
        error: `Failed to list payment links: ${error.message}`,
        retryable: this.isRetryableError(error)
      };
    }
  }

  /**
   * Get payment link status and statistics
   */
  async getPaymentLinkStatus(
    linkId: string,
    options?: PaymentLinkManagerOptions
  ): Promise<OperationResult<PaymentLinkStatusResponse>> {
    try {
      if (!linkId || typeof linkId !== 'string') {
        return {
          success: false,
          error: 'Invalid payment link ID',
          retryable: false
        };
      }

      const paymentLink = await this.paymentLinkRepository.findById(linkId, {
        session: options?.session
      });

      if (!paymentLink) {
        return {
          success: false,
          error: 'Unable to get payment link status. The link could not be found - it may have been removed or the link ID is incorrect.',
          retryable: false
        };
      }

      // TODO: Get transaction statistics when TransactionRepository is available
      const response: PaymentLinkStatusResponse = {
        id: paymentLink._id.toString(),
        isActive: paymentLink.isActive,
        transactionCount: 0, // Will be implemented when transaction service is ready
        totalAmount: "0", // Will be implemented when transaction service is ready
        lastTransactionAt: undefined // Will be implemented when transaction service is ready
      };

      return {
        success: true,
        data: response,
        retryable: false
      };

    } catch (error: any) {
      console.error('Failed to get payment link status:', error);
      
      return {
        success: false,
        error: `Failed to get payment link status: ${error.message}`,
        retryable: this.isRetryableError(error)
      };
    }
  }

  /**
   * Validate payment link for transaction creation
   * Requirements: 1.5, 1.6
   */
  async validateForTransaction(
    linkId: string,
    options?: PaymentLinkManagerOptions
  ): Promise<OperationResult<IPaymentLink>> {
    try {
      const paymentLink = await this.paymentLinkRepository.findById(linkId, {
        session: options?.session
      });

      if (!paymentLink) {
        return {
          success: false,
          error: 'This payment link is not available for transactions. The link could not be found - it may have been removed or expired.',
          retryable: false
        };
      }

      if (!paymentLink.isActive) {
        return {
          success: false,
          error: 'This payment link has been disabled and cannot be used for new transactions. Please contact the merchant for assistance.',
          retryable: false
        };
      }

      return {
        success: true,
        data: paymentLink,
        retryable: false
      };

    } catch (error: any) {
      console.error('Failed to validate payment link:', error);
      
      return {
        success: false,
        error: `Failed to validate payment link: ${error.message}`,
        retryable: this.isRetryableError(error)
      };
    }
  }

  /**
   * Create audit context
   */
  private createAuditContext(session?: ClientSession, metadata?: Record<string, any>): AuditContext {
    return {
      session,
      correlationId: this.auditService.generateCorrelationId(),
      metadata: {
        service: 'PaymentLinkManager',
        ...metadata
      }
    };
  }

  /**
   * Map database model to response DTO
   */
  private mapToCreateResponse(paymentLink: IPaymentLink): CreatePaymentLinkResponse {
    return {
      id: paymentLink._id.toString(),
      merchantId: paymentLink.merchantId,
      userId: paymentLink.userId,
      name: paymentLink.name,
      amount: paymentLink.amount,
      currency: paymentLink.currency,
      description: paymentLink.description,
      isActive: paymentLink.isActive,
      address: paymentLink.address,
      token: paymentLink.token,
      selectedCurrency: paymentLink.selectedCurrency,
      paymentType: paymentLink.paymentType,
      successUrl: paymentLink.successUrl,
      linkUrl: paymentLink.linkUrl,
      metadata: paymentLink.metadata,
      createdAt: paymentLink.createdAt,
      updatedAt: paymentLink.updatedAt
    };
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Network errors, timeouts, and temporary database issues are retryable
    if (error.code === 'ECONNRESET' || 
        error.code === 'ETIMEDOUT' || 
        error.code === 'ENOTFOUND' ||
        error.message?.includes('timeout') ||
        error.message?.includes('connection')) {
      return true;
    }

    // MongoDB temporary errors
    if (error.code === 11000) return false; // Duplicate key is not retryable
    if (error.name === 'ValidationError') return false; // Validation errors are not retryable
    if (error.name === 'CastError') return false; // Cast errors are not retryable

    // Default to not retryable for safety
    return false;
  }
}