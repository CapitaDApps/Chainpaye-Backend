import { Request, Response } from 'express';
import { PaymentLinkManager } from '../services/PaymentLinkManager';
import { AuditService } from '../services/AuditService';
import { ToronetService } from '../services/ToronetService';
import { TransactionManager } from '../services/TransactionManager';
import { PaymentInitializationRepository } from '../repositories/PaymentInitializationRepository';
import { 
  CreatePaymentLinkRequest, 
  DisablePaymentLinkRequest,
  PaymentLinkVerificationResponse
} from '../types/payment-link';
import { ApiResponse, PaginationParams } from '../types/common';
import { randomUUID } from 'crypto';

export class PaymentLinkController {
  private paymentLinkManager: PaymentLinkManager;
  private auditService: AuditService;
  private toronetService: ToronetService;
  private transactionManager: TransactionManager;
  private paymentInitializationRepository: PaymentInitializationRepository;

  constructor(
    paymentLinkManager?: PaymentLinkManager,
    auditService?: AuditService,
    toronetService?: ToronetService,
    transactionManager?: TransactionManager,
    paymentInitializationRepository?: PaymentInitializationRepository
  ) {
    this.auditService = auditService || new AuditService();
    this.paymentLinkManager = paymentLinkManager || new PaymentLinkManager();
    this.toronetService = toronetService || new ToronetService(this.auditService);
    this.paymentInitializationRepository = paymentInitializationRepository || new PaymentInitializationRepository();
    
    // TransactionManager requires dependencies, so we'll initialize it properly in routes
    if (transactionManager) {
      this.transactionManager = transactionManager;
    } else {
      // This will be overridden in routes with proper dependencies
      this.transactionManager = {} as TransactionManager;
    }
  }

  /**
   * Create a new payment link
   * POST /payment-links
   */
  async createPaymentLink(req: Request, res: Response): Promise<void> {
    console.log('=== CONTROLLER CALLED ===');
    console.log('Request body:', req.body);
    
    try {
      const request: CreatePaymentLinkRequest = req.body;
      
      // Create audit context
      const auditContext = {
        correlationId: req.correlationId,
        metadata: {
          endpoint: 'POST /payment-links',
          userAgent: req.get('User-Agent'),
          ip: req.ip
        }
      };

      const result = await this.paymentLinkManager.createPaymentLink(request, {
        auditContext
      });

      if (!result.success) {
        const response: ApiResponse = {
          success: false,
          error: result.error,
          message: result.error,
          timestamp: new Date(),
          correlationId: req.correlationId
        };
        res.status(400).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: result.data,
        message: 'Payment link created successfully',
        timestamp: new Date(),
        correlationId: req.correlationId
      };

      res.status(201).json(response);
    } catch (error: any) {
      console.error('Error creating payment link:', error);
      
      const response: ApiResponse = {
        success: false,
        error: 'Failed to create payment link',
        message: error.message,
        timestamp: new Date(),
        correlationId: req.correlationId
      };
      
      res.status(500).json(response);
    }
  }

  /**
   * Get payment link by ID
   * GET /payment-links/:id
   */
  async getPaymentLink(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (Array.isArray(id)) {
        const response: ApiResponse = {
          success: false,
          error: 'Invalid payment link ID',
          message: 'Payment link ID must be a single value',
          timestamp: new Date(),
          correlationId: req.correlationId
        };
        res.status(400).json(response);
        return;
      }

      const result = await this.paymentLinkManager.getPaymentLink(id);

      if (!result.success) {
        const statusCode = result.error?.includes('not found') ? 404 : 400;
        const response: ApiResponse = {
          success: false,
          error: result.error,
          message: result.error,
          timestamp: new Date(),
          correlationId: req.correlationId
        };
        res.status(statusCode).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: result.data,
        message: 'Payment link retrieved successfully',
        timestamp: new Date(),
        correlationId: req.correlationId
      };

      res.status(200).json(response);
    } catch (error: any) {
      console.error('Error getting payment link:', error);
      
      const response: ApiResponse = {
        success: false,
        error: 'Failed to get payment link',
        message: error.message,
        timestamp: new Date(),
        correlationId: req.correlationId
      };
      
      res.status(500).json(response);
    }
  }

  /**
   * List payment links for a merchant
   * GET /payment-links?merchantId=xxx
   */
  async listPaymentLinks(req: Request, res: Response): Promise<void> {
    try {
      const { merchantId, page, limit, sortBy, sortOrder } = req.query;

      if (!merchantId || Array.isArray(merchantId)) {
        const response: ApiResponse = {
          success: false,
          error: 'Invalid merchantId parameter',
          message: 'merchantId query parameter is required and must be a single value',
          timestamp: new Date(),
          correlationId: req.correlationId
        };
        res.status(400).json(response);
        return;
      }

      const pagination: PaginationParams = {
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      };

      const result = await this.paymentLinkManager.listPaymentLinks(
        merchantId as string,
        pagination
      );

      if (!result.success) {
        const response: ApiResponse = {
          success: false,
          error: result.error,
          message: result.error,
          timestamp: new Date(),
          correlationId: req.correlationId
        };
        res.status(400).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: result.data,
        message: 'Payment links retrieved successfully',
        timestamp: new Date(),
        correlationId: req.correlationId
      };

      res.status(200).json(response);
    } catch (error: any) {
      console.error('Error listing payment links:', error);
      
      const response: ApiResponse = {
        success: false,
        error: 'Failed to list payment links',
        message: error.message,
        timestamp: new Date(),
        correlationId: req.correlationId
      };
      
      res.status(500).json(response);
    }
  }

  /**
   * Disable payment link
   * PATCH /payment-links/:id/disable
   */
  async disablePaymentLink(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (Array.isArray(id)) {
        const response: ApiResponse = {
          success: false,
          error: 'Invalid payment link ID',
          message: 'Payment link ID must be a single value',
          timestamp: new Date(),
          correlationId: req.correlationId
        };
        res.status(400).json(response);
        return;
      }
      
      const { reason }: DisablePaymentLinkRequest = req.body || {};

      // Create audit context
      const auditContext = {
        correlationId: req.correlationId,
        metadata: {
          endpoint: `PATCH /payment-links/${id}/disable`,
          reason,
          userAgent: req.get('User-Agent'),
          ip: req.ip
        }
      };

      const result = await this.paymentLinkManager.disablePaymentLink(id, reason, {
        auditContext
      });

      if (!result.success) {
        const statusCode = result.error?.includes('not found') ? 404 : 400;
        const response: ApiResponse = {
          success: false,
          error: result.error,
          message: result.error,
          timestamp: new Date(),
          correlationId: req.correlationId
        };
        res.status(statusCode).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Payment link disabled successfully',
        timestamp: new Date(),
        correlationId: req.correlationId
      };

      res.status(200).json(response);
    } catch (error: any) {
      console.error('Error disabling payment link:', error);
      
      const response: ApiResponse = {
        success: false,
        error: 'Failed to disable payment link',
        message: error.message,
        timestamp: new Date(),
        correlationId: req.correlationId
      };
      
      res.status(500).json(response);
    }
  }

  /**
   * Enable payment link
   * PATCH /payment-links/:id/enable
   */
  async enablePaymentLink(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (Array.isArray(id)) {
        const response: ApiResponse = {
          success: false,
          error: 'Invalid payment link ID',
          message: 'Payment link ID must be a single value',
          timestamp: new Date(),
          correlationId: req.correlationId
        };
        res.status(400).json(response);
        return;
      }
      
      const { reason }: DisablePaymentLinkRequest = req.body || {};

      // Create audit context
      const auditContext = {
        correlationId: req.correlationId,
        metadata: {
          endpoint: `PATCH /payment-links/${id}/enable`,
          reason,
          userAgent: req.get('User-Agent'),
          ip: req.ip
        }
      };

      const result = await this.paymentLinkManager.enablePaymentLink(id, reason, {
        auditContext
      });

      if (!result.success) {
        const statusCode = result.error?.includes('not found') ? 404 : 400;
        const response: ApiResponse = {
          success: false,
          error: result.error,
          message: result.error,
          timestamp: new Date(),
          correlationId: req.correlationId
        };
        res.status(statusCode).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Payment link enabled successfully',
        timestamp: new Date(),
        correlationId: req.correlationId
      };

      res.status(200).json(response);
    } catch (error: any) {
      console.error('Error enabling payment link:', error);
      
      const response: ApiResponse = {
        success: false,
        error: 'Failed to enable payment link',
        message: error.message,
        timestamp: new Date(),
        correlationId: req.correlationId
      };
      
      res.status(500).json(response);
    }
  }

  /**
   * Get payment link status
   * GET /payment-links/:id/status
   */
  async getPaymentLinkStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (Array.isArray(id)) {
        const response: ApiResponse = {
          success: false,
          error: 'Invalid payment link ID',
          message: 'Payment link ID must be a single value',
          timestamp: new Date(),
          correlationId: req.correlationId
        };
        res.status(400).json(response);
        return;
      }

      const result = await this.paymentLinkManager.getPaymentLinkStatus(id);

      if (!result.success) {
        const statusCode = result.error?.includes('not found') ? 404 : 400;
        const response: ApiResponse = {
          success: false,
          error: result.error,
          message: result.error,
          timestamp: new Date(),
          correlationId: req.correlationId
        };
        res.status(statusCode).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: result.data,
        message: 'Payment link status retrieved successfully',
        timestamp: new Date(),
        correlationId: req.correlationId
      };

      res.status(200).json(response);
    } catch (error: any) {
      console.error('Error getting payment link status:', error);
      
      const response: ApiResponse = {
        success: false,
        error: 'Failed to get payment link status',
        message: error.message,
        timestamp: new Date(),
        correlationId: req.correlationId
      };
      
      res.status(500).json(response);
    }
  }

  /**
   * Verify payment link and get payment details
   * GET /payment-links/:id/verify
   */
  verifyPaymentLink = async (req: Request, res: Response): Promise<void> => {
    try {
      const correlationId = req.headers['x-correlation-id'] as string || randomUUID();
      const linkId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (!linkId) {
        res.status(400).json({
          error: 'Payment link ID is required',
          correlationId
        });
        return;
      }

      const result = await this.paymentLinkManager.getPaymentLink(linkId);

      if (!result.success || !result.data) {
        res.status(404).json({
          error: 'This payment link could not be found. It may have been removed or the link might be incorrect. Please check the link and try again.',
          correlationId
        });
        return;
      }

      const paymentLink = result.data;

      // Return verification response with payment details
      const verificationResponse: PaymentLinkVerificationResponse = {
        id: paymentLink.id,
        isActive: paymentLink.isActive,
        name: paymentLink.name,
        address: paymentLink.address,
        token: paymentLink.token,
        currency: paymentLink.currency,
        selectedCurrency: paymentLink.selectedCurrency,
        paymentType: paymentLink.paymentType,
        amount: paymentLink.amount,
        description: paymentLink.description,
        successUrl: paymentLink.successUrl
      };

      res.json({
        success: true,
        data: verificationResponse,
        correlationId
      });

    } catch (error) {
      const correlationId = req.headers['x-correlation-id'] as string || randomUUID();
      
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to verify payment link',
        correlationId
      });
    }
  };

  /**
   * Handle payment link access (when user opens the link)
   * POST /payment-links/:id/access
   */
  accessPaymentLink = async (req: Request, res: Response): Promise<void> => {
    try {
      const correlationId = req.headers['x-correlation-id'] as string || randomUUID();
      const linkId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (!linkId) {
        res.status(400).json({
          error: 'Payment link ID is required',
          correlationId
        });
        return;
      }

      // Verify the payment link exists and is active
      const result = await this.paymentLinkManager.getPaymentLink(linkId);

      if (!result.success || !result.data) {
        res.status(404).json({
          error: 'This payment link is not available. It may have been removed or expired. Please contact the merchant for a new payment link.',
          correlationId
        });
        return;
      }

      if (!result.data.isActive) {
        res.status(400).json({
          error: 'This payment link has been disabled and cannot accept payments. Please contact the merchant for assistance.',
          correlationId
        });
        return;
      }

      const paymentLinkData = result.data;

      // Create verification response for Toronet
      const verificationData: PaymentLinkVerificationResponse = {
        id: paymentLinkData.id,
        isActive: paymentLinkData.isActive,
        name: paymentLinkData.name,
        address: paymentLinkData.address,
        token: paymentLinkData.token,
        currency: paymentLinkData.currency,
        selectedCurrency: paymentLinkData.selectedCurrency,
        paymentType: paymentLinkData.paymentType,
        amount: paymentLinkData.amount,
        description: paymentLinkData.description,
        successUrl: paymentLinkData.successUrl
      };

      // Extract payer information from request body (if provided)
      const payerInfo = req.body?.payerInfo || {};

      try {
        // Initialize payment with Toronet
        const toronetResult = await this.toronetService.initializePayment(verificationData, payerInfo);

        // Save the payment initialization to database
        const paymentInitialization = await this.paymentInitializationRepository.create({
          transactionId: toronetResult.transactionId,
          toronetReference: toronetResult.toronetReference,
          requestPayload: toronetResult.requestPayload,
          responsePayload: toronetResult.responsePayload,
          status: toronetResult.status,
          error: toronetResult.error
        });

        // Create a transaction record
        const transactionData = {
          paymentLinkId: linkId,
          payerInfo: payerInfo,
          metadata: {
            toronetReference: toronetResult.toronetReference,
            paymentInitializationId: paymentInitialization.id,
            correlationId
          }
        };

        const transaction = await this.transactionManager.createTransaction(transactionData);

        // Log successful payment initialization
        await this.auditService.createAuditLog({
          entityType: 'PaymentLink',
          entityId: linkId,
          action: 'PAYMENT_LINK_ACCESSED_AND_INITIALIZED',
          changes: {
            toronetReference: toronetResult.toronetReference,
            transactionId: transaction.id,
            paymentInitializationId: paymentInitialization.id,
            status: toronetResult.status
          },
          metadata: { correlationId }
        });

        // Return comprehensive response
        const accessResponse = {
          id: paymentLinkData.id,
          name: paymentLinkData.name,
          amount: paymentLinkData.amount,
          currency: paymentLinkData.currency,
          selectedCurrency: paymentLinkData.selectedCurrency,
          description: paymentLinkData.description,
          address: paymentLinkData.address,
          token: paymentLinkData.token,
          paymentType: paymentLinkData.paymentType,
          successUrl: paymentLinkData.successUrl,
          linkUrl: paymentLinkData.linkUrl,
          // Toronet integration data
          toronetReference: toronetResult.toronetReference,
          transactionId: transaction.id,
          paymentInitialization: {
            id: paymentInitialization.id,
            status: toronetResult.status,
            toronetResponse: toronetResult.responsePayload
          }
        };

        res.json({
          success: true,
          data: accessResponse,
          message: 'Payment link accessed and initialized successfully',
          correlationId
        });

      } catch (toronetError: any) {
        // Log Toronet initialization failure
        await this.auditService.createAuditLog({
          entityType: 'PaymentLink',
          entityId: linkId,
          action: 'PAYMENT_INITIALIZATION_FAILED',
          changes: {
            error: toronetError.message,
            payerInfo
          },
          metadata: { correlationId }
        });

        // Still return payment link details even if Toronet fails
        const fallbackResponse = {
          id: paymentLinkData.id,
          name: paymentLinkData.name,
          amount: paymentLinkData.amount,
          currency: paymentLinkData.currency,
          selectedCurrency: paymentLinkData.selectedCurrency,
          description: paymentLinkData.description,
          address: paymentLinkData.address,
          token: paymentLinkData.token,
          paymentType: paymentLinkData.paymentType,
          successUrl: paymentLinkData.successUrl,
          linkUrl: paymentLinkData.linkUrl,
          error: 'Payment initialization failed, please try again'
        };

        res.status(500).json({
          success: false,
          data: fallbackResponse,
          error: 'Payment initialization failed',
          message: toronetError.message,
          correlationId
        });
      }

    } catch (error) {
      const correlationId = req.headers['x-correlation-id'] as string || randomUUID();
      
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to access payment link',
        correlationId
      });
    }
  };

  /**
   * Get successful transactions for a merchant (payment link owner)
   * GET /payment-links/merchant/:merchantId/successful-transactions
   */
  getSuccessfulTransactionsByMerchant = async (req: Request, res: Response): Promise<void> => {
    try {
      const correlationId = req.headers['x-correlation-id'] as string || randomUUID();
      const merchantId = Array.isArray(req.params.merchantId) ? req.params.merchantId[0] : req.params.merchantId;

      if (!merchantId) {
        res.status(400).json({
          success: false,
          error: 'Merchant ID is required',
          message: 'Merchant ID parameter is missing',
          timestamp: new Date(),
          correlationId
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100); // Max 100 per page
      const sortBy = req.query.sortBy as string;
      const sortOrder = req.query.sortOrder as 'asc' | 'desc';

      const result = await this.transactionManager.getSuccessfulTransactionsByMerchant(
        merchantId,
        page,
        limit,
        sortBy,
        sortOrder
      );

      res.json({
        success: true,
        data: result,
        message: 'Successful transactions retrieved successfully',
        timestamp: new Date(),
        correlationId
      });

    } catch (error: any) {
      const correlationId = req.headers['x-correlation-id'] as string || randomUUID();
      
      console.error('Error getting successful transactions by merchant:', error);
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to retrieve successful transactions',
        timestamp: new Date(),
        correlationId
      });
    }
  };
}