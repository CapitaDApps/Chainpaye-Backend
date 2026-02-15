import nodemailer from 'nodemailer';
import { ITransaction } from '../models/Transaction';
import { IPaymentLink } from '../models/PaymentLink';

export class EmailService {
  private transporter: nodemailer.Transporter;
  private isConfigured: boolean = false;

  constructor() {
    console.log('🔧 EmailService constructor called at:', new Date().toISOString());
    
    // Debug: Log environment variables (without exposing password)
    console.log('🔧 Email Service Debug:');
    console.log(`SMTP_HOST: ${process.env.SMTP_HOST}`);
    console.log(`SMTP_PORT: ${process.env.SMTP_PORT}`);
    console.log(`SMTP_USER: ${process.env.SMTP_USER}`);
    console.log(`SMTP_PASS: ${process.env.SMTP_PASS ? '[SET]' : '[NOT SET]'}`);
    console.log(`SMTP_FROM: ${process.env.SMTP_FROM}`);

    // Check if SMTP credentials are available
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
      console.warn('⚠️ SMTP credentials not found. Email service will be disabled.');
      // Create a dummy transporter that won't try to authenticate
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true
      });
      this.isConfigured = false;
      return;
    }

    console.log('✅ SMTP credentials found, creating transporter...');
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
    this.isConfigured = true;
    console.log('✅ EmailService configured successfully');
  }

  /**
   * Send payment confirmation email to the payer
   */
  async sendConfirmationEmail(transaction: ITransaction, paymentLink: IPaymentLink): Promise<void> {
    if (!transaction.payerInfo?.email) {
      console.log(`No email found for transaction ${transaction.id}, skipping confirmation email`);
      return;
    }

    // Check if SMTP is properly configured
    if (!this.isConfigured) {
      console.warn(`⚠️ SMTP not configured, skipping confirmation email for transaction ${transaction.id}`);
      return;
    }

    const subject = `Payment Confirmed - Transaction #${transaction.id}`;
    const html = this.generateConfirmationEmailHTML(transaction, paymentLink);

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@chainpaye.com',
        to: transaction.payerInfo.email,
        subject,
        html,
      });

      console.log(`✅ Confirmation email sent successfully to ${transaction.payerInfo.email} for transaction ${transaction.id}`);
    } catch (error) {
      console.error(`❌ Failed to send confirmation email for transaction ${transaction.id}:`, error);
      // Don't throw error to prevent breaking the transaction flow
    }
  }

  /**
   * Send expiration notification email to the payer
   */
  async sendExpirationEmail(transaction: ITransaction): Promise<void> {
    if (!transaction.payerInfo?.email) {
      console.log(`No email found for transaction ${transaction.id}, skipping expiration email`);
      return;
    }

    // Check if SMTP is properly configured
    if (!this.isConfigured) {
      console.warn(`⚠️ SMTP not configured, skipping expiration email for transaction ${transaction.id}`);
      return;
    }

    const subject = `Payment Verification Pending - Action Required`;
    const html = this.generateExpirationEmailHTML(transaction);

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@chainpaye.com',
        to: transaction.payerInfo.email,
        subject,
        html,
      });

      console.log(`✅ Expiration email sent successfully to ${transaction.payerInfo.email} for transaction ${transaction.id}`);
    } catch (error) {
      console.error(`❌ Failed to send expiration email for transaction ${transaction.id}:`, error);
      // Don't throw error to prevent breaking the transaction flow
    }
  }

  /**
   * Generate HTML template for confirmation email
   */
  private generateConfirmationEmailHTML(transaction: ITransaction, paymentLink: IPaymentLink): string {
    const senderName = transaction.payerInfo?.name || transaction.senderName || 'Valued Customer';
    const confirmedAt = transaction.paidAt ? new Date(transaction.paidAt).toLocaleString() : new Date().toLocaleString();

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Confirmed</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .success-icon { font-size: 48px; margin-bottom: 20px; }
          .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .details-table th, .details-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
          .details-table th { background-color: #f2f2f2; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; }
          .brand { font-weight: bold; color: #667eea; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="success-icon">✅</div>
            <h1>Payment Confirmed!</h1>
          </div>
          <div class="content">
            <p>Dear ${senderName},</p>
            <p>Great news! Your payment has been successfully confirmed and processed.</p>
            
            <table class="details-table">
              <tr>
                <th>Transaction ID</th>
                <td>${transaction.id}</td>
              </tr>
              <tr>
                <th>Amount</th>
                <td>${transaction.actualAmountPaid || transaction.amount} ${transaction.currency}</td>
              </tr>
              <tr>
                <th>Paid To</th>
                <td>${paymentLink.name}</td>
              </tr>
              <tr>
                <th>Reference</th>
                <td>${transaction.reference}</td>
              </tr>
              <tr>
                <th>Confirmed At</th>
                <td>${confirmedAt}</td>
              </tr>
            </table>

            <p>Thank you for using our payment service. Your transaction has been completed successfully.</p>
            
            <p>If you have any questions or concerns, please don't hesitate to contact our support team at <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@chainpaye.com'}">${process.env.SUPPORT_EMAIL || 'support@chainpaye.com'}</a>.</p>
          </div>
          <div class="footer">
            <p>Powered by <span class="brand">ChainPaye</span></p>
            <p>Secure • Fast • Reliable</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate HTML template for expiration email
   */
  private generateExpirationEmailHTML(transaction: ITransaction): string {
    const senderName = transaction.payerInfo?.name || transaction.senderName || 'Valued Customer';
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@chainpaye.com';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Verification Pending</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .warning-icon { font-size: 48px; margin-bottom: 20px; }
          .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .details-table th, .details-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
          .details-table th { background-color: #f2f2f2; font-weight: bold; }
          .support-button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; }
          .brand { font-weight: bold; color: #667eea; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="warning-icon">⏰</div>
            <h1>Payment Verification Pending</h1>
          </div>
          <div class="content">
            <p>Dear ${senderName},</p>
            <p>We've been unable to verify your payment within our 24-hour verification window. Your transaction has been marked as expired and requires manual review.</p>
            
            <table class="details-table">
              <tr>
                <th>Transaction ID</th>
                <td>${transaction.id}</td>
              </tr>
              <tr>
                <th>Amount</th>
                <td>${transaction.amount} ${transaction.currency}</td>
              </tr>
              <tr>
                <th>Reference</th>
                <td>${transaction.reference}</td>
              </tr>
              <tr>
                <th>Status</th>
                <td>Verification Timeout</td>
              </tr>
            </table>

            <p><strong>What happens next?</strong></p>
            <ul>
              <li>Our support team will manually review your transaction</li>
              <li>If payment was made, we'll process it and send confirmation</li>
              <li>If no payment was detected, the transaction will remain expired</li>
            </ul>

            <p>If you believe you've made this payment, please contact our support team immediately with your transaction details.</p>
            
            <a href="mailto:${supportEmail}" class="support-button">Contact Support</a>
            
            <p>We apologize for any inconvenience and appreciate your patience.</p>
          </div>
          <div class="footer">
            <p>Powered by <span class="brand">ChainPaye</span></p>
            <p>Secure • Fast • Reliable</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Test email configuration
   */
  async testConnection(): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('📧 Email service not configured - skipping connection test');
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('✅ Email service connection verified successfully');
      return true;
    } catch (error) {
      console.error('❌ Email service connection failed:', error);
      return false;
    }
  }
}

export default EmailService;