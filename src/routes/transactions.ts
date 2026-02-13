import { Router } from 'express';
import { TransactionController } from '../controllers/TransactionController';
import { TransactionManager } from '../services/TransactionManager';
import { StateManager } from '../services/StateManager';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { PaymentLinkRepository } from '../repositories/PaymentLinkRepository';
import { PaymentInitializationRepository } from '../repositories/PaymentInitializationRepository';
import { AuditService } from '../services/AuditService';
import { validateRequest, validatePagination } from '../middleware/validation';
import { checkToronetAPI, handleConfirmedTransaction } from '../services/verification.service';
import Transaction, { TransactionState } from '../models/Transaction';
import { 
  recordTransactionRateLimit, 
  readOnlyRateLimit, 
  sensitiveOperationRateLimit 
} from '../middleware/rateLimiter';

const router = Router();

// Initialize repositories
const transactionRepository = new TransactionRepository();
const paymentLinkRepository = new PaymentLinkRepository();
const paymentInitializationRepository = new PaymentInitializationRepository();

// Initialize services
const auditService = new AuditService();
const stateManager = new StateManager(transactionRepository, auditService);
const transactionManager = new TransactionManager(
  transactionRepository,
  paymentLinkRepository,
  paymentInitializationRepository,
  stateManager,
  auditService
);

// Initialize controller
const transactionController = new TransactionController(transactionManager, stateManager);

// Validation schemas
const idParamSchema = {
  id: {
    type: 'string' as const,
    required: true,
    minLength: 1,
    maxLength: 255
  }
};

const transactionQuerySchema = {
  state: {
    type: 'string' as const,
    required: false,
    enum: ['PENDING', 'INITIALIZED', 'PAID', 'COMPLETED', 'PAYOUT_FAILED']
  },
  currency: {
    type: 'string' as const,
    required: false,
    enum: ['NGN', 'USD', 'GBP', 'EUR']
  },
  paymentLinkId: {
    type: 'string' as const,
    required: false,
    minLength: 1,
    maxLength: 255
  },
  page: {
    type: 'string' as const,
    required: false
  },
  limit: {
    type: 'string' as const,
    required: false
  },
  sortBy: {
    type: 'string' as const,
    required: false,
    maxLength: 50
  },
  sortOrder: {
    type: 'string' as const,
    required: false,
    enum: ['asc', 'desc']
  }
};

// Transaction routes with rate limiting
router.post('/', recordTransactionRateLimit, transactionController.createTransaction);
router.get('/', readOnlyRateLimit, validateRequest({ query: transactionQuerySchema }), validatePagination(), transactionController.getTransactionsByState);
router.get('/:id', readOnlyRateLimit, validateRequest({ params: idParamSchema }), transactionController.getTransaction);
router.post('/:id/initialize', recordTransactionRateLimit, validateRequest({ params: idParamSchema }), transactionController.initializePayment);
router.patch('/:id/state', sensitiveOperationRateLimit, validateRequest({ params: idParamSchema }), transactionController.transitionState);
router.get('/:id/state-history', readOnlyRateLimit, validateRequest({ params: idParamSchema }), transactionController.getStateHistory);

// GET /api/v1/transactions/:id/status - Check transaction status
router.get('/:id/status', readOnlyRateLimit, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate admin credentials
    const admin = req.headers.admin as string;
    const adminpwd = req.headers.adminpwd as string;
    
    if (!admin || !adminpwd) {
      return res.status(401).json({
        success: false,
        message: 'Admin credentials required in headers'
      });
    }

    // Find transaction by ID (not reference)
    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        transactionId: transaction.id,
        reference: transaction.reference,
        state: transaction.state,
        amount: transaction.amount,
        currency: transaction.currency,
        paidAt: transaction.paidAt,
        senderName: transaction.payerInfo?.name,
        senderPhone: transaction.payerInfo?.phone,
        senderEmail: transaction.payerInfo?.email,
        toronetReference: transaction.toronetReference,
        verificationStartedAt: transaction.verificationStartedAt,
        lastVerificationCheck: transaction.lastVerificationCheck,
        expiresAt: transaction.expiresAt,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt
      },
      message: 'Transaction status retrieved successfully',
      timestamp: new Date(),
      correlationId: req.headers['x-correlation-id'] || 'status-' + Date.now()
    });

  } catch (error) {
    console.error('Error checking transaction status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check transaction status',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
      correlationId: req.headers['x-correlation-id'] || 'error-' + Date.now()
    });
  }
});

// POST /api/v1/transactions/:id/verify - Start immediate verification
router.post('/:id/verify', recordTransactionRateLimit, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      senderName, 
      senderPhone, 
      senderEmail,
      currency,
      txid,
      paymentType,
      amount,
      successUrl,
      paymentLinkId
    } = req.body;

    // Validate admin credentials
    const admin = req.headers.admin as string;
    const adminpwd = req.headers.adminpwd as string;
    
    if (!admin || !adminpwd) {
      return res.status(401).json({
        success: false,
        message: 'Admin credentials required in headers'
      });
    }

    // Find transaction by ID (not reference)
    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Check if transaction is in correct state
    if (transaction.state !== TransactionState.PENDING) {
      return res.status(400).json({
        success: false,
        message: `Transaction is not in PENDING state. Current state: ${transaction.state}`
      });
    }

    // Save all info needed for verification
    transaction.payerInfo = {
      name: senderName,
      phone: senderPhone,
      email: senderEmail,
    };
    transaction.toronetReference = txid;
    transaction.verificationStartedAt = new Date();
    transaction.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    transaction.metadata = {
      ...transaction.metadata,
      paymentType,
      successUrl,
      paymentLinkId,
    };

    await transaction.save();

    console.log(`Verification request received for transaction ${id}`);

    // Start immediate verification (15 minutes, every 3 seconds)
    startImmediateVerification(transaction);

    return res.status(200).json({
      success: true,
      message: 'Verification started. You will receive an email confirmation when payment is confirmed.',
      data: {
        transactionId: transaction.id,
        email: senderEmail,
        verificationPhase: 'immediate',
        checkInterval: '3 seconds',
        duration: '15 minutes'
      }
    });

  } catch (error) {
    console.error('Error submitting verification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit verification request',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper function to start immediate verification (15 minutes, every 3 seconds)
async function startImmediateVerification(transaction: any): Promise<void> {
  const maxDuration = 15 * 60 * 1000; // 15 minutes
  const checkInterval = 3000; // 3 seconds
  const startTime = Date.now();

  console.log(`🚀 Starting immediate verification for ${transaction.reference} (15 min, every 3s)`);

  const verificationInterval = setInterval(async () => {
    const elapsed = Date.now() - startTime;

    // Stop after 15 minutes
    if (elapsed >= maxDuration) {
      clearInterval(verificationInterval);
      console.log(`⏱️ Immediate verification ended for ${transaction.reference}. Hourly cron will continue.`);
      return;
    }

    try {
      // Check if transaction was already confirmed
      const currentTransaction = await Transaction.findById(transaction._id);
      if (!currentTransaction || currentTransaction.state !== TransactionState.PENDING) {
        clearInterval(verificationInterval);
        console.log(`✅ Transaction ${transaction.reference} already confirmed. Stopping immediate checks.`);
        return;
      }

      // Check Toronet API
      const isConfirmed = await checkToronetAPI(currentTransaction);
      if (isConfirmed) {
        clearInterval(verificationInterval);
        console.log(`✅ Payment confirmed for ${transaction.reference} (immediate verification)`);
        await handleConfirmedTransaction(currentTransaction);
      }

    } catch (error) {
      console.error(`Error in immediate verification for ${transaction.reference}:`, error instanceof Error ? error.message : 'Unknown error');
      // Continue checking despite errors
    }
  }, checkInterval);
}

export default router;