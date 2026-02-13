import Transaction, { TransactionState } from '../models/Transaction';
import PaymentLink from '../models/PaymentLink';
import EmailService from './email.service';
import { AuditService } from './AuditService';
import axios from 'axios';

const emailService = new EmailService();
const auditService = new AuditService();

/**
 * Check Toronet API for payment confirmation
 */
export async function checkToronetAPI(transaction: any): Promise<boolean> {
  try {
    const response = await axios.post('https://www.toronet.org/api/payment/toro/', {
      op: 'recordfiattransaction',
      params: [
        { name: 'currency', value: transaction.currency },
        { name: 'txid', value: transaction.metadata?.toronetReference },
        { name: 'paymenttype', value: transaction.metadata?.paymentType || 'bank' },
      ],
    }, {
      headers: {
        admin: process.env.TORONET_ADMIN,
        adminpwd: process.env.TORONET_ADMIN_PWD,
      },
      timeout: 10000,
    });

    // Log the API response for debugging
    console.log(`🔗 Toronet API i response for ${transaction.metadata?.toronetReference}:`, JSON.stringify(response.data, null, 2));

    // Check for success indicators
    const result = response.data;
    const isConfirmed = result?.result === true || 
                       result?.success === true || 
                       result?.status === 'success' ||
                       (result?.result && result.result.status === 'completed');

    return isConfirmed;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`🌐 Toronet API error for ${transaction.reference}:`, {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
    } else {
      console.error(`💥 Unexpected error calling Toronet API for ${transaction.reference}:`, error);
    }
    return false;
  }
}

/**
 * Handle confirmed transaction with atomic update
 */
export async function handleConfirmedTransaction(transaction: any): Promise<void> {
  try {
    // Atomic update - only succeeds if state is still PENDING
    const updatedTransaction = await Transaction.findOneAndUpdate(
      {
        _id: transaction._id,
        state: TransactionState.PENDING,
      },
      {
        $set: {
          state: TransactionState.PAID,
          paidAt: new Date(),
          recordedAt: new Date(),
          actualAmountPaid: transaction.amount,
          senderName: transaction.payerInfo?.name,
          senderPhone: transaction.payerInfo?.phone,
        },
      },
      { new: true }
    );

    // If null, another process already handled it
    if (!updatedTransaction) {
      console.log(`Transaction ${transaction.reference} already processed by another process`);
      return;
    }

    console.log(`✅ Transaction ${transaction.reference} confirmed and updated`);

    // Create audit log for payment confirmation
    await auditService.createAuditLog({
      entityType: 'Transaction',
      entityId: updatedTransaction.id,
      action: 'PAYMENT_CONFIRMED',
      changes: {
        previousState: TransactionState.PENDING,
        newState: TransactionState.PAID,
        confirmedAt: new Date(),
        verificationMethod: 'API_VERIFICATION',
        actualAmountPaid: transaction.amount,
        senderName: transaction.payerInfo?.name,
        senderPhone: transaction.payerInfo?.phone,
      }
    });

    // Get payment link for email context
    let paymentLink = null;
    if (updatedTransaction.metadata?.paymentLinkId) {
      paymentLink = await PaymentLink.findById(updatedTransaction.metadata.paymentLinkId);
    }

    // Send confirmation email with receipt
    if (updatedTransaction.payerInfo?.email) {
      try {
        if (paymentLink) {
          await emailService.sendConfirmationEmail(updatedTransaction, paymentLink);
        } else {
          // Create a minimal payment link object for email if not found
          const minimalPaymentLink = {
            id: updatedTransaction.metadata?.paymentLinkId || 'unknown',
            name: 'Payment Link',
            merchantId: 'unknown'
          } as any;
          await emailService.sendConfirmationEmail(updatedTransaction, minimalPaymentLink);
        }
        console.log(`📧 Confirmation email sent to ${updatedTransaction.payerInfo.email}`);
      } catch (error) {
        console.error(`❌ Failed to send confirmation email for ${transaction.reference}:`, error);
        // Don't throw - continue with webhook
      }
    }

    // Call webhook to successUrl
    if (updatedTransaction.metadata?.successUrl) {
      try {
        const webhookData = {
          event: 'payment.confirmed',
          paymentLinkId: updatedTransaction.metadata.paymentLinkId,
          transactionId: updatedTransaction.reference,
          amount: updatedTransaction.amount,
          currency: updatedTransaction.currency,
          senderName: updatedTransaction.payerInfo?.name,
          senderPhone: updatedTransaction.payerInfo?.phone,
          senderEmail: updatedTransaction.payerInfo?.email,
          paymentMethod: updatedTransaction.metadata?.paymentType,
          status: 'completed',
          paidAt: updatedTransaction.paidAt?.toISOString(),
          timestamp: new Date().toISOString()
        };

        await axios.post(updatedTransaction.metadata.successUrl, webhookData, {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'ChainPaye-Webhook/1.0'
          },
          timeout: 8000
        });

        console.log(`📤 Webhook called successfully for ${transaction.reference}`);

        // Log successful webhook
        await auditService.createAuditLog({
          entityType: 'Transaction',
          entityId: updatedTransaction.id,
          action: 'WEBHOOK_SENT',
          changes: {
            webhookUrl: updatedTransaction.metadata.successUrl,
            sentAt: new Date()
          }
        });

      } catch (error) {
        console.error(`❌ Webhook failed for ${transaction.reference}:`, error);
        
        // Log failed webhook
        await auditService.createAuditLog({
          entityType: 'Transaction',
          entityId: updatedTransaction.id,
          action: 'WEBHOOK_FAILED',
          changes: {
            webhookUrl: updatedTransaction.metadata.successUrl,
            error: error instanceof Error ? error.message : 'Unknown error',
            failedAt: new Date()
          }
        });
        
        // Don't throw - email was sent, that's what matters most
      }
    }

  } catch (error) {
    console.error(`Error handling confirmed transaction ${transaction.reference}:`, error);
    throw error;
  }
}

/**
 * Handle expired transactions (24 hours passed)
 */
export async function handleExpiredTransactions(): Promise<void> {
  try {
    const expiredTransactions = await Transaction.find({
      state: TransactionState.PENDING,
      expiresAt: { $lt: new Date() },
    });

    console.log(`Found ${expiredTransactions.length} expired transactions`);

    for (const transaction of expiredTransactions) {
      try {
        // Update state to failed
        await Transaction.findByIdAndUpdate(transaction._id, {
          $set: { state: TransactionState.PAYOUT_FAILED },
        });

        // Create audit log for expiration
        await auditService.createAuditLog({
          entityType: 'Transaction',
          entityId: transaction.id,
          action: 'TRANSACTION_EXPIRED',
          changes: {
            previousState: TransactionState.PENDING,
            newState: TransactionState.PAYOUT_FAILED,
            expiredAt: new Date(),
            reason: '24-hour verification timeout'
          }
        });

        // Send expiration email
        if (transaction.payerInfo?.email) {
          try {
            await emailService.sendExpirationEmail(transaction);
            console.log(`📧 Expiration email sent to ${transaction.payerInfo.email}`);
          } catch (error) {
            console.error(`❌ Failed to send expiration email for ${transaction.reference}:`, error);
          }
        }

        console.log(`⏰ Transaction ${transaction.reference} expired and marked as failed`);

      } catch (error) {
        console.error(`❌ Failed to handle expired transaction ${transaction.reference}:`, error);
      }
    }

  } catch (error) {
    console.error('Error handling expired transactions:', error);
  }
}