import Transaction, { TransactionState } from '../models/Transaction';
import { checkToronetAPI, handleConfirmedTransaction, handleExpiredTransactions } from './verification.service';

export class PaymentVerificationService {
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Start the background verification service (hourly checks)
   */
  start(): void {
    console.log('🚀 Starting hourly verification service...');
    
    // Run immediately on startup
    this.verifyPendingTransactions().catch(error => {
      console.error('Initial hourly verification run failed:', error);
    });

    // Run every 1 hour
    this.intervalId = setInterval(() => {
      this.verifyPendingTransactions().catch(error => {
        console.error('Scheduled hourly verification run failed:', error);
      });
    }, 60 * 60 * 1000); // 1 hour

    console.log('✅ Hourly verification service started (runs every 1 hour)');
  }

  /**
   * Stop the background verification service
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 Hourly verification service stopped');
  }

  /**
   * Main verification function - runs every 1 hour for transactions past immediate verification
   */
  async verifyPendingTransactions(): Promise<void> {
    if (this.isRunning) {
      console.log('⏳ Hourly verification already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = new Date();
    console.log(`🔍 Starting hourly verification check at ${startTime.toISOString()}`);

    try {
      // Find PENDING transactions that:
      // 1. Haven't expired yet
      // 2. Have a toronet reference
      // 3. Started verification more than 15 minutes ago (immediate verification is done)
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      
      const pendingTransactions = await Transaction.find({
        state: TransactionState.PENDING,
        expiresAt: { $gt: new Date() },
        toronetReference: { $exists: true, $ne: null },
        verificationStartedAt: { $lt: fifteenMinutesAgo }, // Only check transactions past immediate verification
      });

      console.log(`📋 Found ${pendingTransactions.length} pending transactions for hourly check`);

      if (pendingTransactions.length === 0) {
        console.log('✅ No transactions to verify in hourly check');
      }

      // Process each transaction
      let verifiedCount = 0;
      let confirmedCount = 0;
      let errorCount = 0;

      for (const transaction of pendingTransactions) {
        try {
          // Update last verification check timestamp
          await Transaction.findByIdAndUpdate(transaction._id, {
            $set: { lastVerificationCheck: new Date() },
          });

          // Check if payment is confirmed
          const isConfirmed = await checkToronetAPI(transaction);
          verifiedCount++;

          if (isConfirmed) {
            console.log(`✅ Payment confirmed for ${transaction.reference} (hourly check)`);
            await handleConfirmedTransaction(transaction);
            confirmedCount++;
          } else {
            console.log(`⏳ Transaction ${transaction.reference} still pending`);
          }

        } catch (error) {
          errorCount++;
          console.error(`❌ Error in hourly verification for ${transaction.reference}:`, error);
        }
      }

      // Handle expired transactions (24 hours passed)
      await handleExpiredTransactions();

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      console.log(`✅ Hourly verification check completed in ${duration}ms`);
      console.log(`📊 Results: ${verifiedCount} verified, ${confirmedCount} confirmed, ${errorCount} errors`);

    } catch (error) {
      console.error('❌ Error in hourly verification:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get service status
   */
  getStatus(): { isRunning: boolean; intervalId: NodeJS.Timeout | null } {
    return {
      isRunning: this.isRunning,
      intervalId: this.intervalId
    };
  }
}

// Export singleton instance
export const paymentVerificationService = new PaymentVerificationService();

// Start the cron job (runs every 1 hour)
export function startVerificationCron(): void {
  console.log('🚀 Starting verification cron job (every 1 hour)...');
  paymentVerificationService.start();
  console.log('✓ Cron job scheduled successfully');
}

export function stopVerificationCron(): void {
  paymentVerificationService.stop();
}

export default paymentVerificationService;