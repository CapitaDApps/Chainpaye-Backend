import { TransactionRepository } from '../repositories/TransactionRepository';
import { PaymentLinkRepository } from '../repositories/PaymentLinkRepository';
import { PaymentInitializationRepository } from '../repositories/PaymentInitializationRepository';
import { StateManager, StateTransitionRequest } from './StateManager';
import { AuditService } from './AuditService';
import { TransactionState, IPayerInfo } from '../models/Transaction';
import { CreateTransactionRequest, CreateTransactionResponse, TransactionStatusResponse, RecordTransactionRequest, RecordTransactionResponse } from '../types/transaction';
import { IPaymentInitialization } from '../models/PaymentInitialization';
import { randomUUID } from 'crypto';

export interface InitializePaymentRequest {
  transactionId: string;
  callbackUrl?: string;
  metadata?: Record<string, any>;
}

export interface InitializePaymentResponse {
  success: boolean;
  paymentInitialization?: IPaymentInitialization;
  error?: string;
}

/**
 * TransactionManager handles the complete transaction lifecycle from creation through settlement
 * 
 * Key responsibilities:
 * - Create transactions with unique references
 * - Ensure database persistence before external API calls
 * - Link transactions to payment links
 * - Initialize transactions in PENDING state
 * - Handle payment initialization with Toronet
 * - Process payment results and state transitions
 * - Retry incomplete transactions
 */
export class TransactionManager {
  private readonly transactionRepository: TransactionRepository;
  private readonly paymentLinkRepository: PaymentLinkRepository;
  private readonly paymentInitializationRepository: PaymentInitializationRepository;
  private readonly stateManager: StateManager;
  private readonly auditService: AuditService;

  constructor(
    transactionRepository: TransactionRepository,
    paymentLinkRepository: PaymentLinkRepository,
    paymentInitializationRepository: PaymentInitializationRepository,
    stateManager: StateManager,
    auditService: AuditService
  ) {
    this.transactionRepository = transactionRepository;
    this.paymentLinkRepository = paymentLinkRepository;
    this.paymentInitializationRepository = paymentInitializationRepository;
    this.stateManager = stateManager;
    this.auditService = auditService;
  }

  /**
   * Create a new transaction for a payment link
   * Ensures database persistence before any external API calls
   */
  async createTransaction(request: CreateTransactionRequest): Promise<CreateTransactionResponse> {
    const { paymentLinkId, payerInfo, metadata } = request;

    // Validate payment link exists and is active
    const paymentLink = await this.paymentLinkRepository.findById(paymentLinkId);
    if (!paymentLink) {
      throw new Error(`This payment link is not available for transactions. The link could not be found or may have been removed: ${paymentLinkId}`);
    }

    if (!paymentLink.isActive) {
      throw new Error(`This payment link has been disabled and cannot accept new transactions: ${paymentLinkId}`);
    }

    // Generate unique transaction reference
    const reference = this.generateTransactionReference();

    // Create transaction data
    const transactionData = {
      paymentLinkId,
      reference,
      state: TransactionState.PENDING,
      amount: paymentLink.amount,
      currency: paymentLink.currency,
      payerInfo: payerInfo || {},
      metadata: metadata || {}
    };

    try {
      // Persist transaction to database BEFORE any external calls
      const transaction = await this.transactionRepository.create(transactionData);

      // Audit transaction creation
      await this.auditService.createAuditLog({
        entityType: 'Transaction',
        entityId: transaction.id,
        action: 'TRANSACTION_CREATED',
        changes: {
          paymentLinkId,
          reference,
          amount: transaction.amount,
          currency: transaction.currency,
          state: TransactionState.PENDING
        },
        metadata: {
          payerInfo,
          ...metadata
        }
      });

      return {
        id: transaction.id,
        paymentLinkId: transaction.paymentLinkId,
        reference: transaction.reference,
        state: transaction.state,
        amount: transaction.amount,
        currency: transaction.currency,
        payerInfo: transaction.payerInfo,
        metadata: transaction.metadata,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt
      };

    } catch (error) {
      // Audit failed transaction creation
      await this.auditService.createAuditLog({
        entityType: 'Transaction',
        entityId: 'unknown',
        action: 'TRANSACTION_CREATION_FAILED',
        changes: {
          paymentLinkId,
          reference,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        metadata
      });

      throw error;
    }
  }

  /**
   * Get transaction by ID with full details
   */
  async getTransaction(transactionId: string): Promise<TransactionStatusResponse | null> {
    const transaction = await this.transactionRepository.findById(transactionId);
    if (!transaction) {
      return null;
    }

    // Get related records
    const paymentInitialization = await this.paymentInitializationRepository.findLatestByTransactionId(transactionId);
    
    // TODO: Get fiat verification and payout records when those repositories are implemented
    // const fiatVerification = await this.fiatVerificationRepository.findByTransactionId(transactionId);
    // const payout = await this.payoutRepository.findByTransactionId(transactionId);

    return {
      id: transaction.id,
      paymentLinkId: transaction.paymentLinkId,
      reference: transaction.reference,
      state: transaction.state,
      amount: transaction.amount,
      currency: transaction.currency,
      payerInfo: transaction.payerInfo,
      toronetReference: transaction.toronetReference,
      metadata: transaction.metadata,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      paymentInitialization: paymentInitialization ? {
        id: paymentInitialization.id,
        toronetReference: paymentInitialization.toronetReference,
        status: paymentInitialization.status,
        error: paymentInitialization.error,
        createdAt: paymentInitialization.createdAt
      } : undefined
      // TODO: Add fiat verification and payout info when available
    };
  }

  /**
   * Initialize payment with external payment processor (Toronet)
   * This is a placeholder - actual Toronet integration will be implemented later
   */
  async initializePayment(request: InitializePaymentRequest): Promise<InitializePaymentResponse> {
    const { transactionId, callbackUrl, metadata } = request;

    // Get transaction
    const transaction = await this.transactionRepository.findById(transactionId);
    if (!transaction) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    // Validate transaction is in PENDING state
    if (transaction.state !== TransactionState.PENDING) {
      throw new Error(`Transaction must be in PENDING state for initialization. Current state: ${transaction.state}`);
    }

    try {
      // TODO: Implement actual Toronet API integration
      // For now, create a mock payment initialization record
      const toronetReference = this.generateToronetReference();
      
      const initializationData = {
        transactionId,
        toronetReference,
        requestPayload: {
          amount: transaction.amount,
          currency: transaction.currency,
          reference: transaction.reference,
          callbackUrl,
          metadata
        },
        responsePayload: {
          // Mock successful response
          status: 'SUCCESS',
          paymentUrl: `https://toronet.example.com/pay/${toronetReference}`,
          reference: toronetReference
        },
        status: 'SUCCESS' as const
      };

      // Create payment initialization record
      const paymentInitialization = await this.paymentInitializationRepository.create(initializationData);

      // Update transaction with Toronet reference
      await this.transactionRepository.updateById(transactionId, {
        toronetReference
      });

      // Transition state to INITIALIZED
      await this.stateManager.transitionState({
        transactionId,
        newState: TransactionState.INITIALIZED,
        reason: 'Payment initialization successful with Toronet',
        metadata: { toronetReference }
      });

      return {
        success: true,
        paymentInitialization
      };

    } catch (error) {
      // Create failed initialization record
      const initializationData = {
        transactionId,
        toronetReference: '',
        requestPayload: {
          amount: transaction.amount,
          currency: transaction.currency,
          reference: transaction.reference,
          callbackUrl,
          metadata
        },
        responsePayload: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        status: 'FAILED' as const,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      await this.paymentInitializationRepository.create(initializationData);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process payment result from external processor
   * This will be called by webhook handlers or polling services
   */
  async processPaymentResult(transactionId: string, result: any): Promise<void> {
    // TODO: Implement payment result processing
    // This will handle fiat verification and state transitions to PAID
    throw new Error('Payment result processing not yet implemented');
  }

  /**
   * Retry incomplete transactions
   * Used by cron jobs to ensure eventual consistency
   */
  async retryIncompleteTransactions(): Promise<void> {
    // Find transactions in PENDING state that are older than 5 minutes
    const result = await this.transactionRepository.findWithFilter({
      state: TransactionState.PENDING,
      createdBefore: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
    });

    const staleTransactions = Array.isArray(result) ? result : result.documents || [];

    for (const transaction of staleTransactions) {
      try {
        await this.initializePayment({
          transactionId: transaction.id,
          metadata: { retryAttempt: true }
        });
      } catch (error) {
        // Log error but continue processing other transactions
        await this.auditService.createAuditLog({
          entityType: 'Transaction',
          entityId: transaction.id,
          action: 'RETRY_INITIALIZATION_FAILED',
          changes: {
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }
    }
  }

  /**
   * Get transactions by filter with pagination and sorting
   */
  async getTransactionsByFilter(options: {
    state?: string;
    currency?: string;
    paymentLinkId?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    transactions: TransactionStatusResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      state,
      currency,
      paymentLinkId,
      page = 1,
      limit = 20,
      sortBy,
      sortOrder
    } = options;

    // Build filter object
    const filter: any = {};
    
    // Add state filter if provided and valid
    if (state && Object.values(TransactionState).includes(state as TransactionState)) {
      filter.state = state as TransactionState;
    }

    // Add currency filter if provided
    if (currency && ['NGN', 'USD', 'GBP', 'EUR'].includes(currency)) {
      filter.currency = currency;
    }

    // Add payment link filter if provided
    if (paymentLinkId) {
      filter.paymentLinkId = paymentLinkId;
    }

    // Build sort options
    const sortOptions: any = {};
    if (sortBy) {
      // Default to descending order for timestamps, ascending for others
      const defaultOrder = ['createdAt', 'updatedAt', 'paidAt'].includes(sortBy) ? 'desc' : 'asc';
      sortOptions[sortBy] = sortOrder || defaultOrder;
    } else {
      // Default sort by creation date, newest first
      sortOptions.createdAt = 'desc';
    }

    const result = await this.transactionRepository.findWithFilter(
      filter,
      { 
        page, 
        limit, 
        sortBy: Object.keys(sortOptions)[0], 
        sortOrder: Object.values(sortOptions)[0] as 'asc' | 'desc' 
      }
    );

    const transactions = Array.isArray(result) ? result : result.documents || [];
    const total = Array.isArray(result) ? result.length : result.pagination?.total || 0;

    const transactionResponses = await Promise.all(
      transactions.map(async (transaction: any) => {
        const fullTransaction = await this.getTransaction(transaction.id);
        return fullTransaction!;
      })
    );

    return {
      transactions: transactionResponses,
      total,
      page,
      limit
    };
  }

  /**
   * Get transactions for a payment link
   */
  async getTransactionsByPaymentLink(
    paymentLinkId: string, 
    page: number = 1, 
    limit: number = 20,
    status?: string,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc'
  ): Promise<{
    transactions: TransactionStatusResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Build filter object
    const filter: any = { paymentLinkId };
    
    // Add status filter if provided
    if (status && Object.values(TransactionState).includes(status as TransactionState)) {
      filter.state = status as TransactionState;
    }

    // Build sort options
    const sortOptions: any = {};
    if (sortBy) {
      // Default to descending order for timestamps, ascending for others
      const defaultOrder = ['createdAt', 'updatedAt', 'paidAt'].includes(sortBy) ? 'desc' : 'asc';
      sortOptions[sortBy] = sortOrder || defaultOrder;
    } else {
      // Default sort by creation date, newest first
      sortOptions.createdAt = 'desc';
    }

    const result = await this.transactionRepository.findWithFilter(
      filter,
      { page, limit, sortBy: Object.keys(sortOptions)[0], sortOrder: Object.values(sortOptions)[0] as 'asc' | 'desc' }
    );

    const transactions = Array.isArray(result) ? result : result.documents || [];
    const total = Array.isArray(result) ? result.length : result.pagination?.total || 0;

    const transactionResponses = await Promise.all(
      transactions.map(async (transaction: any) => {
        const fullTransaction = await this.getTransaction(transaction.id);
        return fullTransaction!;
      })
    );

    return {
      transactions: transactionResponses,
      total,
      page,
      limit
    };
  }

  /**
   * Generate unique transaction reference
   */
  private generateTransactionReference(): string {
    const timestamp = Date.now().toString(36);
    const randomId = randomUUID().replace(/-/g, '').substring(0, 8);
    return `TXN_${timestamp}_${randomId}`.toUpperCase();
  }

  /**
   * Generate mock Toronet reference
   * TODO: Replace with actual Toronet reference from API response
   */
  private generateToronetReference(): string {
    const timestamp = Date.now().toString(36);
    const randomId = randomUUID().replace(/-/g, '').substring(0, 8);
    return `TORO_${timestamp}_${randomId}`.toUpperCase();
  }

  /**
   * Record transaction as successful with payment details
   */
  async recordTransaction(
    transactionId: string, 
    request: RecordTransactionRequest
  ): Promise<RecordTransactionResponse> {
    const { amount, currency, senderName, senderPhone, senderEmail, paidAt } = request;

    // Find the transaction
    const transaction = await this.transactionRepository.findById(transactionId);
    if (!transaction) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    // Validate transaction can be recorded
    if (transaction.state === TransactionState.COMPLETED) {
      throw new Error(`Transaction is already completed: ${transactionId}`);
    }

    if (transaction.state === TransactionState.PAID) {
      throw new Error(`Transaction is already recorded as paid: ${transactionId}`);
    }

    // Parse the paid date
    const paidDate = new Date(paidAt);
    if (isNaN(paidDate.getTime())) {
      throw new Error('Invalid paidAt date format. Please use ISO date string.');
    }

    // Validate currency matches
    if (currency !== transaction.currency) {
      throw new Error(`Currency mismatch. Expected: ${transaction.currency}, Received: ${currency}`);
    }

    try {
      // Prepare update data
      const updateData: any = {
        actualAmountPaid: amount,
        senderName: senderName,
        senderPhone: senderPhone,
        paidAt: paidDate,
        recordedAt: new Date(),
        state: TransactionState.PAID
      };

      // Update payerInfo with email if provided
      if (senderEmail) {
        updateData['payerInfo.email'] = senderEmail;
        updateData['payerInfo.name'] = senderName;
        updateData['payerInfo.phone'] = senderPhone;
      }

      // Update transaction with payment details
      const updatedTransaction = await this.transactionRepository.updateById(transactionId, updateData);

      if (!updatedTransaction) {
        throw new Error('Failed to update transaction');
      }

      // Create audit log for payment recording
      await this.auditService.createAuditLog({
        entityType: 'Transaction',
        entityId: transactionId,
        action: 'PAYMENT_RECORDED',
        changes: {
          actualAmountPaid: amount,
          senderName: senderName,
          senderPhone: senderPhone,
          senderEmail: senderEmail,
          paidAt: paidDate,
          recordedAt: new Date(),
          previousState: transaction.state,
          newState: TransactionState.PAID
        },
        metadata: {
          originalAmount: transaction.amount,
          currency: currency
        }
      });

      // Transition to COMPLETED state
      await this.stateManager.transitionState({
        transactionId: transactionId,
        newState: TransactionState.COMPLETED,
        reason: 'Payment successfully recorded and verified',
        metadata: {
          actualAmountPaid: amount,
          senderName: senderName,
          senderPhone: senderPhone,
          senderEmail: senderEmail,
          recordedAt: new Date()
        }
      });

      // Get the final updated transaction
      const finalTransaction = await this.transactionRepository.findById(transactionId);
      if (!finalTransaction) {
        throw new Error('Failed to retrieve updated transaction');
      }

      // Return the response
      return {
        id: finalTransaction._id.toString(),
        paymentLinkId: finalTransaction.paymentLinkId,
        reference: finalTransaction.reference,
        state: finalTransaction.state,
        amount: finalTransaction.amount,
        currency: finalTransaction.currency,
        actualAmountPaid: finalTransaction.actualAmountPaid || amount,
        senderName: finalTransaction.senderName || senderName,
        senderPhone: finalTransaction.senderPhone || senderPhone,
        paidAt: finalTransaction.paidAt || paidDate,
        recordedAt: finalTransaction.recordedAt || new Date(),
        createdAt: finalTransaction.createdAt,
        updatedAt: finalTransaction.updatedAt
      };

    } catch (error) {
      // Create audit log for failed recording
      await this.auditService.createAuditLog({
        entityType: 'Transaction',
        entityId: transactionId,
        action: 'PAYMENT_RECORDING_FAILED',
        changes: {
          error: error instanceof Error ? error.message : 'Unknown error',
          attemptedAmount: amount,
          attemptedSender: senderName,
          attemptedEmail: senderEmail
        }
      });

      throw error;
    }
  }
}