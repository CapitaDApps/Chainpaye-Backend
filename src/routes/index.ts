import { Router } from 'express';
import paymentLinksRouter from './paymentLinks';
import transactionsRouter from './transactions';
import chainpayeRouter from './chainpaye';
import healthRouter from './health';
import { TransactionController } from '../controllers/TransactionController';
import { TransactionManager } from '../services/TransactionManager';
import { StateManager } from '../services/StateManager';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { PaymentLinkRepository } from '../repositories/PaymentLinkRepository';
import { PaymentInitializationRepository } from '../repositories/PaymentInitializationRepository';
import { AuditService } from '../services/AuditService';
import { validateRequest } from '../middleware/validation';
import { RecordTransactionSchema } from '../types/schemas';
import { asyncHandler } from '../middleware/errorHandler';
import { 
  healthCheckRateLimit, 
  recordTransactionRateLimit 
} from '../middleware/rateLimiter';

const router = Router();

// Initialize services for record transaction endpoint
const transactionRepository = new TransactionRepository();
const paymentLinkRepository = new PaymentLinkRepository();
const paymentInitializationRepository = new PaymentInitializationRepository();
const auditService = new AuditService();
const stateManager = new StateManager(transactionRepository, auditService);
const transactionManager = new TransactionManager(
  transactionRepository,
  paymentLinkRepository,
  paymentInitializationRepository,
  stateManager,
  auditService
);
const transactionController = new TransactionController(transactionManager, stateManager);

// Health check endpoints
router.use('/health', healthRouter);

// Legacy health check endpoint (for backward compatibility)
router.get('/health-legacy', healthCheckRateLimit, (req, res) => {
  res.json({
    success: true,
    message: 'Payment Link System API is running',
    timestamp: new Date(),
    version: '2.0.0'
  });
});

// Test endpoint to debug validation
router.post('/test', (req, res) => {
  console.log('=== TEST ENDPOINT ===');
  console.log('Request body:', req.body);
  res.json({
    success: true,
    message: 'Test endpoint reached',
    body: req.body
  });
});

// API routes
router.use('/payment-links', paymentLinksRouter);
router.use('/transactions', transactionsRouter);

// Record transaction endpoint (standalone) with specific rate limiting
router.post(
  '/record-transaction/:transactionId',
  recordTransactionRateLimit,
  validateRequest({ body: RecordTransactionSchema }),
  asyncHandler(transactionController.recordTransaction.bind(transactionController))
);

// ChainPaye direct link routes (for https://chainpaye.com/payment/{id})
// These handle direct payment link access and should be last to avoid conflicts
router.use('/', chainpayeRouter);

export default router;