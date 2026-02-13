import { Request, Response } from 'express';
import { TransactionManager } from '../services/TransactionManager';
import { StateManager } from '../services/StateManager';
import { CreateTransactionRequest, StateTransitionRequest, RecordTransactionRequest, RecordTransactionResponse } from '../types/transaction';
import { Validator } from '../types/validation';
import { createTransactionSchema, stateTransitionSchema, RecordTransactionSchema } from '../types/schemas';
import { ApiResponse } from '../types/common';
import { randomUUID } from 'crypto';

export class TransactionController {
  private readonly transactionManager: TransactionManager;
  private readonly stateManager: StateManager;

  constructor(transactionManager: TransactionManager, stateManager: StateManager) {
    this.transactionManager = transactionManager;
    this.stateManager = stateManager;
  }

  /**
   * Create a new transaction
   * POST /transactions
   */
  createTransaction = async (req: Request, res: Response): Promise<void> => {
    try {
      const correlationId = req.headers['x-correlation-id'] as string || crypto.randomUUID();
      
      // Validate request body
      const validationResult = Validator.validate(req.body, createTransactionSchema);
      if (!validationResult.isValid) {
        res.status(400).json({
          error: 'Validation failed',
          details: validationResult.errors,
          correlationId
        });
        return;
      }

      const request: CreateTransactionRequest = req.body;
      const transaction = await this.transactionManager.createTransaction(request);

      res.status(201).json({
        success: true,
        data: transaction,
        correlationId
      });

    } catch (error) {
      const correlationId = req.headers['x-correlation-id'] as string || crypto.randomUUID();
      
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(404).json({
            error: 'This payment link is not available for transactions. It may have been removed or expired.',
            message: error.message,
            correlationId
          });
          return;
        }
        
        if (error.message.includes('disabled')) {
          res.status(400).json({
            error: 'This payment link has been disabled and cannot accept new transactions.',
            message: error.message,
            correlationId
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create transaction',
        correlationId
      });
    }
  };

  /**
   * Get transaction by ID
   * GET /transactions/:id
   */
  getTransaction = async (req: Request, res: Response): Promise<void> => {
    try {
      const correlationId = req.headers['x-correlation-id'] as string || crypto.randomUUID();
      const transactionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (!transactionId) {
        res.status(400).json({
          error: 'Transaction ID is required',
          correlationId
        });
        return;
      }

      const transaction = await this.transactionManager.getTransaction(transactionId);

      if (!transaction) {
        res.status(404).json({
          error: 'Transaction not found',
          correlationId
        });
        return;
      }

      res.json({
        success: true,
        data: transaction,
        correlationId
      });

    } catch (error) {
      const correlationId = req.headers['x-correlation-id'] as string || crypto.randomUUID();
      
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve transaction',
        correlationId
      });
    }
  };

  /**
   * Initialize payment for a transaction
   * POST /transactions/:id/initialize
   */
  initializePayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const correlationId = req.headers['x-correlation-id'] as string || crypto.randomUUID();
      const transactionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (!transactionId) {
        res.status(400).json({
          error: 'Transaction ID is required',
          correlationId
        });
        return;
      }

      const { callbackUrl, metadata } = req.body;

      const result = await this.transactionManager.initializePayment({
        transactionId,
        callbackUrl,
        metadata
      });

      if (!result.success) {
        res.status(400).json({
          error: 'Payment initialization failed',
          message: result.error,
          correlationId
        });
        return;
      }

      res.json({
        success: true,
        data: {
          paymentInitialization: result.paymentInitialization
        },
        correlationId
      });

    } catch (error) {
      const correlationId = req.headers['x-correlation-id'] as string || crypto.randomUUID();
      
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(404).json({
            error: 'Transaction not found',
            message: error.message,
            correlationId
          });
          return;
        }
        
        if (error.message.includes('state')) {
          res.status(400).json({
            error: 'Invalid transaction state',
            message: error.message,
            correlationId
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to initialize payment',
        correlationId
      });
    }
  };

  /**
   * Transition transaction state
   * PATCH /transactions/:id/state
   */
  transitionState = async (req: Request, res: Response): Promise<void> => {
    try {
      const correlationId = req.headers['x-correlation-id'] as string || crypto.randomUUID();
      const transactionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (!transactionId) {
        res.status(400).json({
          error: 'Transaction ID is required',
          correlationId
        });
        return;
      }

      // Validate request body
      const validationResult = Validator.validate(req.body, stateTransitionSchema);
      if (!validationResult.isValid) {
        res.status(400).json({
          error: 'Validation failed',
          details: validationResult.errors,
          correlationId
        });
        return;
      }

      const { newState, reason, metadata } = req.body;

      const result = await this.stateManager.transitionState({
        transactionId,
        newState,
        reason,
        metadata
      });

      if (!result.success) {
        res.status(400).json({
          error: 'State transition failed',
          message: result.reason,
          data: result,
          correlationId
        });
        return;
      }

      res.json({
        success: true,
        data: result,
        correlationId
      });

    } catch (error) {
      const correlationId = req.headers['x-correlation-id'] as string || crypto.randomUUID();
      
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          error: 'Transaction not found',
          message: error.message,
          correlationId
        });
        return;
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to transition state',
        correlationId
      });
    }
  };

  /**
   * Get transaction state transition history
   * GET /transactions/:id/state-history
   */
  getStateHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const correlationId = req.headers['x-correlation-id'] as string || crypto.randomUUID();
      const transactionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (!transactionId) {
        res.status(400).json({
          error: 'Transaction ID is required',
          correlationId
        });
        return;
      }

      const history = await this.stateManager.getStateTransitionHistory(transactionId);

      res.json({
        success: true,
        data: {
          transactionId,
          history
        },
        correlationId
      });

    } catch (error) {
      const correlationId = req.headers['x-correlation-id'] as string || crypto.randomUUID();
      
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve state history',
        correlationId
      });
    }
  };

  /**
   * Get transactions by state with optional filtering
   * GET /transactions
   */
  getTransactionsByState = async (req: Request, res: Response): Promise<void> => {
    try {
      const correlationId = req.headers['x-correlation-id'] as string || randomUUID();
      
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100); // Max 100 per page
      const state = req.query.state as string;
      const currency = req.query.currency as string;
      const paymentLinkId = req.query.paymentLinkId as string;
      const sortBy = req.query.sortBy as string;
      const sortOrder = req.query.sortOrder as 'asc' | 'desc';

      const result = await this.transactionManager.getTransactionsByFilter({
        state,
        currency,
        paymentLinkId,
        page,
        limit,
        sortBy,
        sortOrder
      });

      res.json({
        success: true,
        data: result,
        message: 'Transactions retrieved successfully',
        timestamp: new Date(),
        correlationId
      });

    } catch (error) {
      const correlationId = req.headers['x-correlation-id'] as string || randomUUID();
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to retrieve transactions',
        timestamp: new Date(),
        correlationId
      });
    }
  };

  /**
   * Get transactions for a payment link
   * GET /payment-links/:linkId/transactions
   */
  getTransactionsByPaymentLink = async (req: Request, res: Response): Promise<void> => {
    try {
      const correlationId = req.headers['x-correlation-id'] as string || randomUUID();
      const paymentLinkId = Array.isArray(req.params.linkId) ? req.params.linkId[0] : req.params.linkId;

      if (!paymentLinkId) {
        res.status(400).json({
          error: 'Payment link ID is required',
          correlationId
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100); // Max 100 per page
      const status = req.query.status as string;
      const sortBy = req.query.sortBy as string;
      const sortOrder = req.query.sortOrder as 'asc' | 'desc';

      const result = await this.transactionManager.getTransactionsByPaymentLink(
        paymentLinkId,
        page,
        limit,
        status,
        sortBy,
        sortOrder
      );

      res.json({
        success: true,
        data: result,
        correlationId
      });

    } catch (error) {
      const correlationId = req.headers['x-correlation-id'] as string || randomUUID();
      
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve transactions',
        correlationId
      });
    }
  };

  /**
   * Record transaction as successful with payment details
   * POST /record-transaction/:transactionId
   */
  recordTransaction = async (req: Request, res: Response): Promise<void> => {
    try {
      const correlationId = req.headers['x-correlation-id'] as string || randomUUID();
      const transactionId = Array.isArray(req.params.transactionId) ? req.params.transactionId[0] : req.params.transactionId;

      if (!transactionId) {
        const response: ApiResponse = {
          success: false,
          error: 'Transaction ID is required',
          message: 'Transaction ID parameter is missing',
          timestamp: new Date(),
          correlationId
        };
        res.status(400).json(response);
        return;
      }

      // Validate request body
      const validationResult = Validator.validate(req.body, RecordTransactionSchema);
      if (!validationResult.isValid) {
        const response: ApiResponse = {
          success: false,
          error: 'Validation failed',
          message: validationResult.errors.map(e => e.message).join(', '),
          timestamp: new Date(),
          correlationId
        };
        res.status(400).json(response);
        return;
      }

      const recordRequest: RecordTransactionRequest = req.body;

      // Record the transaction
      const result = await this.transactionManager.recordTransaction(transactionId, recordRequest);

      const response: ApiResponse<RecordTransactionResponse> = {
        success: true,
        data: result,
        message: 'Transaction recorded successfully',
        timestamp: new Date(),
        correlationId
      };

      res.status(200).json(response);

    } catch (error) {
      const correlationId = req.headers['x-correlation-id'] as string || randomUUID();
      
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          const response: ApiResponse = {
            success: false,
            error: 'Transaction not found',
            message: error.message,
            timestamp: new Date(),
            correlationId
          };
          res.status(404).json(response);
          return;
        }
        
        if (error.message.includes('already completed') || error.message.includes('already recorded')) {
          const response: ApiResponse = {
            success: false,
            error: 'Transaction already processed',
            message: error.message,
            timestamp: new Date(),
            correlationId
          };
          res.status(400).json(response);
          return;
        }

        if (error.message.includes('Currency mismatch') || error.message.includes('Invalid')) {
          const response: ApiResponse = {
            success: false,
            error: 'Validation error',
            message: error.message,
            timestamp: new Date(),
            correlationId
          };
          res.status(400).json(response);
          return;
        }
      }

      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
        message: 'Failed to record transaction',
        timestamp: new Date(),
        correlationId
      };
      res.status(500).json(response);
    }
  };
}