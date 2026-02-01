import { Router } from 'express';
import paymentLinksRouter from './paymentLinks';
import transactionsRouter from './transactions';
import chainpayeRouter from './chainpaye';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Payment Link System API is running',
    timestamp: new Date(),
    version: '1.0.0'
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

// ChainPaye direct link routes (for https://www.chainpaye.com/{id})
// These handle direct payment link access and should be last to avoid conflicts
router.use('/', chainpayeRouter);

export default router;