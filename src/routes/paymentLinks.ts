import { Router, Request, Response } from 'express';
import { PaymentLinkController } from '../controllers/PaymentLinkController';
import { TransactionController } from '../controllers/TransactionController';
import { validateRequest, validatePagination } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { CreatePaymentLinkSchema, DisablePaymentLinkSchema } from '../types/schemas';
import { TransactionManager } from '../services/TransactionManager';
import { StateManager } from '../services/StateManager';
import { ToronetService } from '../services/ToronetService';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { PaymentLinkRepository } from '../repositories/PaymentLinkRepository';
import { PaymentInitializationRepository } from '../repositories/PaymentInitializationRepository';
import { AuditService } from '../services/AuditService';
import { AuditLogRepository } from '../repositories/AuditLogRepository';
import { PaymentLinkManager } from '../services/PaymentLinkManager';
import { 
  createPaymentLinkRateLimit,
  paymentAccessRateLimit,
  readOnlyRateLimit,
  sensitiveOperationRateLimit,
  merchantRateLimit,
  userRateLimit
} from '../middleware/rateLimiter';

const router = Router();

// Lazy initialization to ensure environment variables are loaded
let paymentLinkController: PaymentLinkController;
let transactionController: TransactionController;

const initializeControllers = () => {
  if (!paymentLinkController) {
    // Initialize repositories
    const auditLogRepository = new AuditLogRepository();
    const transactionRepository = new TransactionRepository();
    const paymentLinkRepository = new PaymentLinkRepository();
    const paymentInitializationRepository = new PaymentInitializationRepository();

    // Initialize services
    const auditService = new AuditService();
    const paymentLinkManager = new PaymentLinkManager(paymentLinkRepository, auditService);
    const toronetService = new ToronetService(auditService);
    const stateManager = new StateManager(transactionRepository, auditService);
    const transactionManager = new TransactionManager(
      transactionRepository,
      paymentLinkRepository,
      paymentInitializationRepository,
      stateManager,
      auditService
    );

    // Initialize controllers
    paymentLinkController = new PaymentLinkController(
      paymentLinkManager,
      auditService,
      toronetService,
      transactionManager,
      paymentInitializationRepository
    );
    transactionController = new TransactionController(transactionManager, stateManager);
  }
  return { paymentLinkController, transactionController };
};

// Parameter validation schemas
const idParamSchema = {
  id: {
    type: 'string' as const,
    required: true,
    minLength: 1,
    maxLength: 255
  }
};

const merchantIdQuerySchema = {
  merchantId: {
    type: 'string' as const,
    required: true,
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

const merchantIdParamSchema = {
  merchantId: {
    type: 'string' as const,
    required: true,
    minLength: 1,
    maxLength: 255
  }
};

/**
 * @route GET /payment-links/merchant/:merchantId/successful-transactions
 * @desc Get all successful transactions for a merchant (payment link owner)
 * @access Public (should be protected in production)
 */
router.get(
  '/merchant/:merchantId/successful-transactions',
  readOnlyRateLimit,
  validateRequest({ 
    params: merchantIdParamSchema,
    query: {
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
    }
  }),
  validatePagination(),
  asyncHandler((req: Request, res: Response) => {
    const { paymentLinkController } = initializeControllers();
    return paymentLinkController.getSuccessfulTransactionsByMerchant(req, res);
  })
);

/**
 * @route POST /payment-links
 * @desc Create a new payment link
 * @access Public (should be protected in production)
 */
router.post(
  '/',
  createPaymentLinkRateLimit,
  merchantRateLimit,
  userRateLimit,
  validateRequest({ body: CreatePaymentLinkSchema }),
  asyncHandler((req: Request, res: Response) => {
    const { paymentLinkController } = initializeControllers();
    return paymentLinkController.createPaymentLink(req, res);
  })
);

/**
 * @route GET /payment-links/:id
 * @desc Get payment link by ID
 * @access Public (should be protected in production)
 */
router.get(
  '/:id',
  readOnlyRateLimit,
  validateRequest({ params: idParamSchema }),
  asyncHandler((req: Request, res: Response) => {
    const { paymentLinkController } = initializeControllers();
    return paymentLinkController.getPaymentLink(req, res);
  })
);

/**
 * @route GET /payment-links
 * @desc List payment links for a merchant
 * @access Public (should be protected in production)
 */
router.get(
  '/',
  readOnlyRateLimit,
  merchantRateLimit,
  validateRequest({ query: merchantIdQuerySchema }),
  validatePagination(),
  asyncHandler((req: Request, res: Response) => {
    const { paymentLinkController } = initializeControllers();
    return paymentLinkController.listPaymentLinks(req, res);
  })
);

/**
 * @route PATCH /payment-links/:id/disable
 * @desc Disable a payment link
 * @access Public (should be protected in production)
 */
router.patch(
  '/:id/disable',
  sensitiveOperationRateLimit,
  validateRequest({ 
    params: idParamSchema,
    body: DisablePaymentLinkSchema 
  }),
  asyncHandler((req: Request, res: Response) => {
    const { paymentLinkController } = initializeControllers();
    return paymentLinkController.disablePaymentLink(req, res);
  })
);

/**
 * @route PATCH /payment-links/:id/enable
 * @desc Enable a payment link
 * @access Public (should be protected in production)
 */
router.patch(
  '/:id/enable',
  sensitiveOperationRateLimit,
  validateRequest({ 
    params: idParamSchema,
    body: DisablePaymentLinkSchema 
  }),
  asyncHandler((req: Request, res: Response) => {
    const { paymentLinkController } = initializeControllers();
    return paymentLinkController.enablePaymentLink(req, res);
  })
);

/**
 * @route GET /payment-links/:id/status
 * @desc Get payment link status and statistics
 * @access Public (should be protected in production)
 */
router.get(
  '/:id/status',
  readOnlyRateLimit,
  validateRequest({ params: idParamSchema }),
  asyncHandler((req: Request, res: Response) => {
    const { paymentLinkController } = initializeControllers();
    return paymentLinkController.getPaymentLinkStatus(req, res);
  })
);

/**
 * @route GET /payment-links/:linkId/transactions
 * @desc Get transactions for a payment link
 * @access Public (should be protected in production)
 */
router.get(
  '/:linkId/transactions',
  readOnlyRateLimit,
  validateRequest({ 
    params: { linkId: idParamSchema.id },
    query: {
      state: {
        type: 'string' as const,
        required: false,
        enum: ['PENDING', 'INITIALIZED', 'PAID', 'COMPLETED', 'PAYOUT_FAILED']
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
    }
  }),
  validatePagination(),
  asyncHandler((req: Request, res: Response) => {
    const { transactionController } = initializeControllers();
    return transactionController.getTransactionsByPaymentLink(req, res);
  })
);

/**
 * @route GET /payment-links/:id/verify
 * @desc Verify payment link and get payment details
 * @access Public
 */
router.get(
  '/:id/verify',
  readOnlyRateLimit,
  validateRequest({ params: idParamSchema }),
  asyncHandler((req: Request, res: Response) => {
    const { paymentLinkController } = initializeControllers();
    return paymentLinkController.verifyPaymentLink(req, res);
  })
);

/**
 * @route POST /payment-links/:id/verify
 * @desc Handle payment verification request (redirects to transaction verify)
 * @access Public
 */
router.post('/:id/verify', paymentAccessRateLimit, async (req, res) => {
  try {
    const paymentLinkId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    
    // Validate admin credentials
    const admin = req.headers.admin as string;
    const adminpwd = req.headers.adminpwd as string;
    
    if (!admin || !adminpwd) {
      return res.status(401).json({
        success: false,
        message: 'Admin credentials required in headers'
      });
    }

    // Get the transaction ID from request body
    const { transactionId } = req.body;
    
    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID is required in request body'
      });
    }

    // Return helpful error message with correct endpoint
    return res.status(400).json({
      success: false,
      message: 'Payment verification should be done via the transactions endpoint',
      correctEndpoint: `POST /api/v1/transactions/${transactionId}/verify`,
      note: 'Use the transaction ID (not payment link ID) with the transactions verify endpoint'
    });

  } catch (error) {
    console.error('Error in payment link verify endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /payment-links/:id
 * @desc Handle direct payment link access (alternative to /access endpoint)
 * @access Public
 */
router.post(
  '/:id',
  paymentAccessRateLimit,
  validateRequest({ params: idParamSchema }),
  asyncHandler((req: Request, res: Response) => {
    const { paymentLinkController } = initializeControllers();
    return paymentLinkController.accessPaymentLink(req, res);
  })
);

/**
 * @route POST /payment-links/:id/access
 * @desc Handle payment link access (when user opens the link)
 * @access Public
 */
router.post(
  '/:id/access',
  paymentAccessRateLimit,
  validateRequest({ params: idParamSchema }),
  asyncHandler((req: Request, res: Response) => {
    const { paymentLinkController } = initializeControllers();
    return paymentLinkController.accessPaymentLink(req, res);
  })
);

export default router;