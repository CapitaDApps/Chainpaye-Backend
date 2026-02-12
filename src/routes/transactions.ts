import { Router } from 'express';
import { TransactionController } from '../controllers/TransactionController';
import { TransactionManager } from '../services/TransactionManager';
import { StateManager } from '../services/StateManager';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { PaymentLinkRepository } from '../repositories/PaymentLinkRepository';
import { PaymentInitializationRepository } from '../repositories/PaymentInitializationRepository';
import { AuditService } from '../services/AuditService';
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

// Transaction routes with rate limiting
router.post('/', recordTransactionRateLimit, transactionController.createTransaction);
router.get('/:id', readOnlyRateLimit, transactionController.getTransaction);
router.post('/:id/initialize', recordTransactionRateLimit, transactionController.initializePayment);
router.patch('/:id/state', sensitiveOperationRateLimit, transactionController.transitionState);
router.get('/:id/state-history', readOnlyRateLimit, transactionController.getStateHistory);

export default router;