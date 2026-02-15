import { Router, Request, Response } from 'express';
import { getVerificationStats } from '../services/verify-pending-transactions';
import Transaction, { TransactionState } from '../models/Transaction';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

/**
 * Basic health check endpoint
 * GET /health
 */
router.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Payment Link System API is running',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    uptime: Math.round(process.uptime()),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
    }
  });
});

/**
 * Enhanced verification service health check
 * GET /health/verification
 */
router.get('/verification', asyncHandler(async (req: Request, res: Response) => {
  try {
    const stats = getVerificationStats();
    const now = new Date();
    
    // Calculate health status
    const isHealthy = stats.isRunning && 
                     (!stats.lastRunTime || (now.getTime() - stats.lastRunTime.getTime()) < 10 * 60 * 1000); // Last run within 10 minutes
    
    const errorRate = stats.totalRuns > 0 ? (stats.totalErrors / stats.totalRuns) * 100 : 0;
    
    res.json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      service: 'Enhanced Background Verification v2.0.0',
      isRunning: stats.isRunning,
      uptime: stats.uptimeFormatted,
      lastRun: stats.lastRunTime,
      lastRunDuration: stats.lastRunDuration,
      statistics: {
        totalRuns: stats.totalRuns,
        totalTransactionsProcessed: stats.totalTransactionsProcessed,
        totalErrors: stats.totalErrors,
        errorRate: Math.round(errorRate * 100) / 100 + '%',
        successRate: Math.round((100 - errorRate) * 100) / 100 + '%'
      },
      performance: {
        memoryUsage: Math.round(stats.memoryUsage.heapUsed / 1024 / 1024) + 'MB',
        avgProcessingTime: stats.totalRuns > 0 ? Math.round(stats.lastRunDuration / stats.totalRuns) : 0
      },
      configuration: {
        batchSize: stats.config.MAX_BATCH_SIZE,
        cronInterval: stats.config.CRON_INTERVAL_MS / 1000 + 's',
        apiDelay: stats.config.API_CALL_DELAY_MS + 'ms',
        maxRetries: stats.config.MAX_RETRY_ATTEMPTS
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to get verification service health',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * Database health check
 * GET /health/database
 */
router.get('/database', asyncHandler(async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    
    // Test database connectivity with a simple query
    const pendingCount = await Transaction.countDocuments({ state: TransactionState.PENDING });
    const totalCount = await Transaction.countDocuments();
    
    const queryTime = Date.now() - startTime;
    
    res.json({
      status: 'healthy',
      database: 'MongoDB',
      connectivity: 'connected',
      queryTime: queryTime + 'ms',
      statistics: {
        totalTransactions: totalCount,
        pendingTransactions: pendingCount,
        completedTransactions: totalCount - pendingCount
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'MongoDB',
      connectivity: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * Comprehensive system health check
 * GET /health/system
 */
router.get('/system', asyncHandler(async (req: Request, res: Response) => {
  try {
    const [verificationStats, dbStartTime] = await Promise.all([
      Promise.resolve(getVerificationStats()),
      Promise.resolve(Date.now())
    ]);
    
    // Test database
    const pendingCount = await Transaction.countDocuments({ state: TransactionState.PENDING });
    const dbQueryTime = Date.now() - dbStartTime;
    
    // System metrics
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    // Health calculations
    const verificationHealthy = verificationStats.isRunning;
    const databaseHealthy = dbQueryTime < 5000; // Less than 5 seconds
    const memoryHealthy = memUsage.heapUsed < 512 * 1024 * 1024; // Less than 512MB
    
    const overallHealthy = verificationHealthy && databaseHealthy && memoryHealthy;
    
    res.json({
      status: overallHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.round(uptime) + 's',
      components: {
        verification: {
          status: verificationHealthy ? 'healthy' : 'unhealthy',
          isRunning: verificationStats.isRunning,
          lastRun: verificationStats.lastRunTime,
          totalRuns: verificationStats.totalRuns,
          errorRate: verificationStats.totalRuns > 0 ? 
            Math.round((verificationStats.totalErrors / verificationStats.totalRuns) * 10000) / 100 + '%' : '0%'
        },
        database: {
          status: databaseHealthy ? 'healthy' : 'slow',
          queryTime: dbQueryTime + 'ms',
          pendingTransactions: pendingCount
        },
        memory: {
          status: memoryHealthy ? 'healthy' : 'high',
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
          rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB'
        }
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        pid: process.pid,
        nodeEnv: process.env.NODE_ENV || 'development'
      }
    });
    
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'System health check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * Transaction statistics endpoint
 * GET /health/transactions
 */
router.get('/transactions', asyncHandler(async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const [
      totalCount,
      pendingCount,
      completedCount,
      expiredCount,
      last24hCount,
      lastHourCount
    ] = await Promise.all([
      Transaction.countDocuments(),
      Transaction.countDocuments({ state: TransactionState.PENDING }),
      Transaction.countDocuments({ state: TransactionState.COMPLETED }),
      Transaction.countDocuments({ state: TransactionState.PAYOUT_FAILED }),
      Transaction.countDocuments({ createdAt: { $gte: oneDayAgo } }),
      Transaction.countDocuments({ createdAt: { $gte: oneHourAgo } })
    ]);
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      totals: {
        all: totalCount,
        pending: pendingCount,
        completed: completedCount,
        expired: expiredCount
      },
      recent: {
        last24Hours: last24hCount,
        lastHour: lastHourCount
      },
      percentages: {
        completionRate: totalCount > 0 ? Math.round((completedCount / totalCount) * 10000) / 100 + '%' : '0%',
        pendingRate: totalCount > 0 ? Math.round((pendingCount / totalCount) * 10000) / 100 + '%' : '0%',
        expirationRate: totalCount > 0 ? Math.round((expiredCount / totalCount) * 10000) / 100 + '%' : '0%'
      }
    });
    
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to get transaction statistics',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}));

export default router;