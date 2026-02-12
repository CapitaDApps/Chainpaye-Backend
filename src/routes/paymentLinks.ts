import { Router } from 'express';
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
const paymentLinkController = new PaymentLinkController(
  paymentLinkManager,
  auditService,
  toronetService,
  transactionManager,
  paymentInitializationRepository
);
const transactionController = new TransactionController(transactionManager, stateManager);

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
  asyncHandler(paymentLinkController.createPaymentLink.bind(paymentLinkController))
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
  asyncHandler(paymentLinkController.getPaymentLink.bind(paymentLinkController))
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
  asyncHandler(paymentLinkController.listPaymentLinks.bind(paymentLinkController))
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
  asyncHandler(paymentLinkController.disablePaymentLink.bind(paymentLinkController))
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
  asyncHandler(paymentLinkController.enablePaymentLink.bind(paymentLinkController))
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
  asyncHandler(paymentLinkController.getPaymentLinkStatus.bind(paymentLinkController))
);

/**
 * @route GET /payment-links/:linkId/transactions
 * @desc Get transactions for a payment link
 * @access Public (should be protected in production)
 */
router.get(
  '/:linkId/transactions',
  readOnlyRateLimit,
  validateRequest({ params: { linkId: idParamSchema.id } }),
  validatePagination(),
  asyncHandler(transactionController.getTransactionsByPaymentLink.bind(transactionController))
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
  asyncHandler(paymentLinkController.verifyPaymentLink.bind(paymentLinkController))
);

/**
 * @route POST /payment-links/:id
 * @desc Handle direct payment link access (alternative to /access endpoint)
 * @access Public
 */
router.post(
  '/:id',
  paymentAccessRateLimit,
  validateRequest({ params: idParamSchema }),
  asyncHandler(paymentLinkController.accessPaymentLink.bind(paymentLinkController))
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
  asyncHandler(paymentLinkController.accessPaymentLink.bind(paymentLinkController))
);

export default router;