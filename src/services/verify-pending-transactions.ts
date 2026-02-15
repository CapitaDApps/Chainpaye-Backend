import Transaction, { TransactionState } from '../models/Transaction';
import PaymentLink from '../models/PaymentLink';
import { checkToronetAPI, handleConfirmedTransaction, handleExpiredTransactions } from './verification.service';

/**
 * Enhanced Background Verification Service v2.0.0
 * 
 * This service implements a robust two-phase verification system:
 * - Phase 1: Immediate verification (0-15 minutes, every 3 seconds)
 * - Phase 2: Background verification (15+ minutes, every 5 minutes)
 * 
 * Key Features:
 * - Batch processing (100 transactions max per run)
 * - Atomic updates to prevent race conditions
 * - Exponential backoff retry logic
 * - API rate limiting with delays
 * - Comprehensive error handling and logging
 * - Graceful shutdown handling
 * - Performance monitoring and health checks
 * 
 * @version 2.0.0
 * @author ChainPaye Development Team
 */

// Configuration constants
const CONFIG = {
  // Timing configuration
  CRON_INTERVAL_MS: 5 * 60 * 1000,           // 5 minutes
  IMMEDIATE_PHASE_DURATION_MS: 16 * 60 * 1000, // 16 minutes (15 + 1 minute buffer)
  VERIFICATION_COOLDOWN_MS: 5 * 60 * 1000,    // 5 minutes between checks
  
  // Batch processing configuration
  MAX_BATCH_SIZE: 100,                        // Maximum transactions per batch
  API_CALL_DELAY_MS: 100,                     // Delay between API calls
  
  // Retry configuration
  MAX_RETRY_ATTEMPTS: 3,                      // Maximum retry attempts
  INITIAL_RETRY_DELAY_MS: 1000,              // Initial retry delay (1 second)
  RETRY_BACKOFF_MULTIPLIER: 2,               // Exponential backoff multiplier
  MAX_RETRY_DELAY_MS: 30000,                 // Maximum retry delay (30 seconds)
  
  // Database configuration
  QUERY_TIMEOUT_MS: 30000,                   // Database query timeout
  UPDATE_TIMEOUT_MS: 10000,                  // Database update timeout
  
  // Health check configuration
  STALE_LOCK_TIMEOUT_MS: 60000,              // 1 minute stale lock timeout
};

/**
 * Sleep utility function for delays
 * @param ms - Milliseconds to sleep
 */
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry wrapper with exponential backoff
 * Implements robust retry logic with increasing delays between attempts
 * 
 * @param fn - Function to retry
 * @param maxAttempts - Maximum retry attempts
 * @param operation - Operation name for logging
 * @returns Promise resolving to function result
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = CONFIG.MAX_RETRY_ATTEMPTS,
  operation: string = 'operation'
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        console.error(`❌ ${operation} failed after ${maxAttempts} attempts:`, lastError.message);
        throw lastError;
      }
      
      const delay = Math.min(
        CONFIG.INITIAL_RETRY_DELAY_MS * Math.pow(CONFIG.RETRY_BACKOFF_MULTIPLIER, attempt - 1),
        CONFIG.MAX_RETRY_DELAY_MS
      );
      
      console.warn(`⚠️ ${operation} attempt ${attempt} failed, retrying in ${delay}ms:`, lastError.message);
      await sleep(delay);
    }
  }
  
  throw lastError!;
}

/**
 * Get transactions eligible for background verification
 * Only processes transactions that have completed the immediate verification phase
 * 
 * Query Logic:
 * - state = PENDING (not yet confirmed)
 * - expiresAt > now (not expired)
 * - verificationStartedAt < 16 minutes ago (immediate phase completed)
 * - lastVerificationCheck < 5 minutes ago OR doesn't exist (ready for check)
 * 
 * @returns Array of eligible transactions (max 100)
 */
async function getEligibleTransactions(): Promise<any[]> {
  const now = new Date();
  const immediatePhaseEndTime = new Date(now.getTime() - CONFIG.IMMEDIATE_PHASE_DURATION_MS);
  const lastCheckCutoff = new Date(now.getTime() - CONFIG.VERIFICATION_COOLDOWN_MS);
  
  console.log(`🔍 Querying transactions older than ${immediatePhaseEndTime.toISOString()}`);
  
  const query = {
    state: TransactionState.PENDING,
    expiresAt: { $gt: now }, // Not expired
    verificationStartedAt: { $lt: immediatePhaseEndTime }, // Completed immediate phase
    $or: [
      { lastVerificationCheck: { $lt: lastCheckCutoff } },
      { lastVerificationCheck: { $exists: false } }
    ]
  };
  
  return await retryWithBackoff(
    () => Transaction.find(query)
      .limit(CONFIG.MAX_BATCH_SIZE)
      .sort({ verificationStartedAt: 1 }) // Oldest first
      .maxTimeMS(CONFIG.QUERY_TIMEOUT_MS)
      .lean(), // Use lean() for better performance
    3,
    'Database query for eligible transactions'
  );
}

/**
 * Process a single transaction with atomic updates and race condition prevention
 * 
 * Process Flow:
 * 1. Atomic update to acquire processing lock
 * 2. Check payment status with Toronet API (with retries)
 * 3. Handle confirmation or clear lock
 * 4. Comprehensive error handling and cleanup
 * 
 * @param transaction - Transaction to process
 */
async function processTransaction(transaction: any): Promise<void> {
  const startTime = Date.now();
  console.log(`🔍 Processing transaction ${transaction.reference} (ID: ${transaction._id})`);
  
  try {
    // Step 1: Atomic update to mark as being processed (prevents race conditions)
    const updateResult = await Transaction.findOneAndUpdate(
      {
        _id: transaction._id,
        state: TransactionState.PENDING, // Ensure still pending
        $or: [
          { processingBy: { $exists: false } },
          { processingBy: null },
          { processingStartedAt: { $lt: new Date(Date.now() - CONFIG.STALE_LOCK_TIMEOUT_MS) } } // Stale lock cleanup
        ]
      },
      {
        $set: {
          lastVerificationCheck: new Date(),
          processingBy: process.pid || 'background-service',
          processingStartedAt: new Date()
        }
      },
      { new: true, maxTimeMS: CONFIG.UPDATE_TIMEOUT_MS }
    );
    
    if (!updateResult) {
      console.log(`⏭️ Transaction ${transaction.reference} already being processed or no longer pending`);
      return;
    }
    
    // Step 2: Check with Toronet API with retry logic
    const isConfirmed = await retryWithBackoff(
      () => checkToronetAPI(transaction),
      CONFIG.MAX_RETRY_ATTEMPTS,
      `Toronet API check for ${transaction.reference}`
    );
    
    // Step 3: Handle result
    if (isConfirmed) {
      console.log(`✅ Payment confirmed for transaction ${transaction.reference}`);
      await handleConfirmedTransaction(transaction);
    } else {
      console.log(`⏳ Payment not yet confirmed for transaction ${transaction.reference}`);
      
      // Clear processing lock for next attempt
      await Transaction.findByIdAndUpdate(
        transaction._id,
        {
          $unset: {
            processingBy: 1,
            processingStartedAt: 1
          }
        },
        { maxTimeMS: CONFIG.UPDATE_TIMEOUT_MS }
      );
    }
    
    const processingTime = Date.now() - startTime;
    console.log(`⏱️ Transaction ${transaction.reference} processed in ${processingTime}ms`);
    
  } catch (error) {
    console.error(`❌ Error processing transaction ${transaction.reference}:`, error);
    
    // Clear processing lock on error
    try {
      await Transaction.findByIdAndUpdate(
        transaction._id,
        {
          $unset: {
            processingBy: 1,
            processingStartedAt: 1
          }
        },
        { maxTimeMS: CONFIG.UPDATE_TIMEOUT_MS }
      );
    } catch (unlockError) {
      console.error(`❌ Failed to clear processing lock for ${transaction.reference}:`, unlockError);
    }
    
    throw error; // Re-throw to be handled by batch processor
  }
}

/**
 * Process transactions in batches with controlled timing and rate limiting
 * 
 * Features:
 * - Processes up to 100 transactions per batch
 * - 100ms delay between API calls to respect rate limits
 * - Individual error handling (one failure doesn't stop the batch)
 * - Comprehensive metrics and timing
 * 
 * @param transactions - Array of transactions to process
 */
async function processBatch(transactions: any[]): Promise<void> {
  console.log(`📦 Processing batch of ${transactions.length} transactions`);
  const batchStartTime = Date.now();
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < transactions.length; i++) {
    const transaction = transactions[i];
    
    try {
      await processTransaction(transaction);
      successCount++;
      
      // Add delay between API calls (except for last transaction)
      if (i < transactions.length - 1) {
        await sleep(CONFIG.API_CALL_DELAY_MS);
      }
      
    } catch (error) {
      errorCount++;
      console.error(`❌ Failed to process transaction ${transaction.reference}:`, error);
      // Continue with next transaction - don't let one failure stop the batch
    }
  }
  
  const batchTime = Date.now() - batchStartTime;
  const avgTimePerTransaction = Math.round(batchTime / transactions.length);
  
  console.log(`📊 Batch completed in ${batchTime}ms (avg ${avgTimePerTransaction}ms/tx): ${successCount} success, ${errorCount} errors`);
}

/**
 * Enhanced Background Verification Service Class
 * Manages the lifecycle and state of the background verification process
 */
export class EnhancedPaymentVerificationService {
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private startTime: Date | null = null;
  private stats = {
    totalRuns: 0,
    totalTransactionsProcessed: 0,
    totalSuccessfulVerifications: 0,
    totalErrors: 0,
    lastRunTime: null as Date | null,
    lastRunDuration: 0
  };

  /**
   * Start the enhanced background verification service
   * Runs every 5 minutes with comprehensive monitoring
   */
  start(): void {
    console.log('🚀 Starting Enhanced Background Verification Service v2.0.0');
    console.log('📋 Configuration:');
    console.log(`   - Cron Interval: ${CONFIG.CRON_INTERVAL_MS / 1000}s`);
    console.log(`   - Immediate Phase Duration: ${CONFIG.IMMEDIATE_PHASE_DURATION_MS / 60000}min`);
    console.log(`   - Max Batch Size: ${CONFIG.MAX_BATCH_SIZE}`);
    console.log(`   - API Call Delay: ${CONFIG.API_CALL_DELAY_MS}ms`);
    console.log(`   - Max Retry Attempts: ${CONFIG.MAX_RETRY_ATTEMPTS}`);
    
    this.startTime = new Date();
    
    // Run initial verification after 5 seconds (allow system initialization)
    setTimeout(() => {
      console.log('🎯 Running initial verification check...');
      this.verifyPendingTransactions().catch(error => {
        console.error('❌ Initial verification check failed:', error);
      });
    }, 5000);
    
    // Schedule regular runs every 5 minutes
    this.intervalId = setInterval(() => {
      this.verifyPendingTransactions().catch(error => {
        console.error('❌ Scheduled verification check failed:', error);
      });
    }, CONFIG.CRON_INTERVAL_MS);
    
    console.log('✅ Enhanced background verification service started successfully');
    
    // Setup graceful shutdown handlers
    this.setupGracefulShutdown();
  }

  /**
   * Stop the background verification service gracefully
   */
  stop(): void {
    console.log('🛑 Stopping Enhanced Background Verification Service...');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isRunning = false;
    console.log('✅ Enhanced background verification service stopped gracefully');
    this.logFinalStats();
  }

  /**
   * Main verification function with comprehensive error handling and monitoring
   * Implements robust batch processing with detailed metrics
   */
  async verifyPendingTransactions(): Promise<void> {
    if (this.isRunning) {
      console.log('⏳ Background verification already running, skipping this cycle...');
      return;
    }

    this.isRunning = true;
    const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const runStartTime = Date.now();
    
    console.log(`🔄 [${runId}] Starting background verification cycle...`);
    
    try {
      this.stats.totalRuns++;
      
      // Step 1: Get eligible transactions
      const pendingTransactions = await getEligibleTransactions();
      
      console.log(`📊 [${runId}] Found ${pendingTransactions.length} transactions eligible for background verification`);
      
      if (pendingTransactions.length === 0) {
        console.log(`✅ [${runId}] No transactions need verification at this time`);
        return;
      }
      
      this.stats.totalTransactionsProcessed += pendingTransactions.length;
      
      // Step 2: Process transactions in batch
      await processBatch(pendingTransactions);
      
      // Step 3: Handle expired transactions
      console.log(`⏰ [${runId}] Checking for expired transactions...`);
      await handleExpiredTransactions();
      
      const runDuration = Date.now() - runStartTime;
      this.stats.lastRunTime = new Date();
      this.stats.lastRunDuration = runDuration;
      
      console.log(`✅ [${runId}] Background verification cycle completed successfully in ${runDuration}ms`);
      
    } catch (error) {
      this.stats.totalErrors++;
      const runDuration = Date.now() - runStartTime;
      
      console.error(`💥 [${runId}] Error in background verification after ${runDuration}ms:`, error);
      
      // Log system health information for debugging
      this.logSystemHealth(runId);
      
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get comprehensive service statistics and health information
   */
  getStats() {
    const uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0;
    
    return {
      ...this.stats,
      isRunning: this.isRunning,
      uptime: Math.round(uptime / 1000), // seconds
      uptimeFormatted: this.formatUptime(uptime),
      config: CONFIG,
      memoryUsage: process.memoryUsage(),
      pid: process.pid
    };
  }

  /**
   * Setup graceful shutdown handlers for clean service termination
   */
  private setupGracefulShutdown(): void {
    const shutdown = (signal: string) => {
      console.log(`🛑 Received ${signal}, initiating graceful shutdown...`);
      this.stop();
      
      if (signal === 'SIGINT') {
        process.exit(0);
      }
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  /**
   * Log system health information for debugging
   */
  private logSystemHealth(runId: string): void {
    const memUsage = process.memoryUsage();
    
    console.log(`🏥 [${runId}] System Health Check:`);
    console.log(`   - Memory Usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB heap, ${Math.round(memUsage.rss / 1024 / 1024)}MB RSS`);
    console.log(`   - Uptime: ${Math.round(process.uptime())}s`);
    console.log(`   - PID: ${process.pid}`);
    console.log(`   - Node Version: ${process.version}`);
  }

  /**
   * Log final statistics when service stops
   */
  private logFinalStats(): void {
    const stats = this.getStats();
    
    console.log('📊 Final Service Statistics:');
    console.log(`   - Total Runs: ${stats.totalRuns}`);
    console.log(`   - Total Transactions Processed: ${stats.totalTransactionsProcessed}`);
    console.log(`   - Total Errors: ${stats.totalErrors}`);
    console.log(`   - Uptime: ${stats.uptimeFormatted}`);
    console.log(`   - Success Rate: ${stats.totalRuns > 0 ? Math.round((1 - stats.totalErrors / stats.totalRuns) * 100) : 0}%`);
  }

  /**
   * Format uptime in human-readable format
   */
  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
}

// Export singleton instance
export const enhancedPaymentVerificationService = new EnhancedPaymentVerificationService();

/**
 * Start the enhanced background verification cron job
 * Entry point for the enhanced verification system
 */
export function startEnhancedVerificationCron(): void {
  console.log('🚀 Initializing Enhanced Background Verification System...');
  enhancedPaymentVerificationService.start();
}

/**
 * Stop the enhanced background verification cron job
 * Gracefully shuts down the verification system
 */
export function stopEnhancedVerificationCron(): void {
  enhancedPaymentVerificationService.stop();
}

/**
 * Get verification service statistics
 * Useful for monitoring and health checks
 */
export function getVerificationStats() {
  return enhancedPaymentVerificationService.getStats();
}

// Legacy compatibility exports
export const paymentVerificationService = enhancedPaymentVerificationService;
export const startVerificationCron = startEnhancedVerificationCron;
export const stopVerificationCron = stopEnhancedVerificationCron;

export default enhancedPaymentVerificationService;