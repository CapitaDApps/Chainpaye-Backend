import { Router } from 'express';
import { PaymentLinkController } from '../controllers/PaymentLinkController';
import { validateRequest } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { PaymentLinkManager } from '../services/PaymentLinkManager';
import { PaymentLinkRepository } from '../repositories/PaymentLinkRepository';
import { PaymentInitializationRepository } from '../repositories/PaymentInitializationRepository';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { AuditService } from '../services/AuditService';
import { ToronetService } from '../services/ToronetService';
import { TransactionManager } from '../services/TransactionManager';
import { StateManager } from '../services/StateManager';

const router = Router();

// Initialize dependencies
const paymentLinkRepository = new PaymentLinkRepository();
const paymentInitializationRepository = new PaymentInitializationRepository();
const transactionRepository = new TransactionRepository();
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
const paymentLinkController = new PaymentLinkController(
  paymentLinkManager,
  auditService,
  toronetService,
  transactionManager,
  paymentInitializationRepository
);

// Parameter validation schema
const idParamSchema = {
  id: {
    type: 'string' as const,
    required: true,
    minLength: 1,
    maxLength: 255
  }
};

/**
 * @route GET /:id
 * @desc Handle ChainPaye link access (https://www.chainpaye.com/{id})
 * @access Public
 */
router.get(
  '/:id',
  validateRequest({ params: idParamSchema }),
  asyncHandler(paymentLinkController.accessPaymentLink.bind(paymentLinkController))
);

/**
 * @route POST /:id
 * @desc Handle ChainPaye link POST request (when user opens the link)
 * @access Public
 */
router.post(
  '/:id',
  validateRequest({ params: idParamSchema }),
  asyncHandler(paymentLinkController.accessPaymentLink.bind(paymentLinkController))
);

export default router;