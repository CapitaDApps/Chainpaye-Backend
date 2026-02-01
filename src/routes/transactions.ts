import { Router } from 'express';
import { TransactionController } from '../controllers/TransactionController';
import { TransactionManager } from '../services/TransactionManager';
import { StateManager } from '../services/StateManager';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { PaymentLinkRepository } from '../repositories/PaymentLinkRepository';
import { PaymentInitializationRepository } from '../repositories/PaymentInitializationRepository';
import { AuditService } from '../services/AuditService';
import { AuditLogRepository } from '../repositories/AuditLogRepository';

const router = Router();

// Initialize repositories
const auditLogRepository = new AuditLogRepository();
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

// Transaction routes
router.post('/', transactionController.createTransaction);
router.get('/:id', transactionController.getTransaction);
router.post('/:id/initialize', transactionController.initializePayment);
router.patch('/:id/state', transactionController.transitionState);
router.get('/:id/state-history', transactionController.getStateHistory);

export default router;