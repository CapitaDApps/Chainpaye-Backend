import axios, { AxiosResponse } from 'axios';
import { PaymentLinkVerificationResponse } from '../types/payment-link';
import { AuditService } from './AuditService';

export interface ToronetPaymentInitializeRequest {
  op: string;
  params: Array<{
    name: string;
    value: string | number;
  }>;
}

export interface ToronetPaymentInitializeResponse {
  success: boolean;
  txid?: string;
  message?: string;
  error?: string;
  data?: any;
}

export interface PaymentInitializationData {
  transactionId: string;
  toronetReference: string;
  requestPayload: ToronetPaymentInitializeRequest;
  responsePayload: ToronetPaymentInitializeResponse;
  status: 'SUCCESS' | 'FAILED';
  error?: string;
}

/**
 * ToronetService handles all interactions with the Toronet API
 * for payment processing and initialization
 */
export class ToronetService {
  private readonly apiUrl: string;
  private readonly adminPwd: string;
  private readonly admin: string;
  private readonly auditService: AuditService;

  constructor(auditService: AuditService) {
    this.apiUrl = process.env.TORONET_API_URL || 'https://api.toronet.org';
    
    // Require admin credentials from environment variables
    if (!process.env.TORONET_ADMIN_PASSWORD) {
      throw new Error('TORONET_ADMIN_PASSWORD environment variable is required');
    }
    if (!process.env.TORONET_ADMIN_ADDRESS) {
      throw new Error('TORONET_ADMIN_ADDRESS environment variable is required');
    }
    
    this.adminPwd = process.env.TORONET_ADMIN_PASSWORD;
    this.admin = process.env.TORONET_ADMIN_ADDRESS;
    this.auditService = auditService;
  }

  /**
   * Initialize payment with Toronet API
   */
  async initializePayment(
    paymentLinkData: PaymentLinkVerificationResponse,
    payerInfo?: {
      payername?: string;
      payeraddress?: string;
      payercity?: string;
      payerstate?: string;
      payercountry?: string;
      payerzipcode?: string;
      payerphone?: string;
    }
  ): Promise<PaymentInitializationData> {
    const correlationId = `toronet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Prepare the request payload
      const requestPayload: ToronetPaymentInitializeRequest = {
        op: "paymentinitialize",
        params: [
          { name: "address", value: paymentLinkData.address },
          { name: "token", value: paymentLinkData.token },
          { name: "currency", value: paymentLinkData.currency },
          { name: "amount", value: paymentLinkData.amount },
          { name: "success_url", value: paymentLinkData.successUrl },
          { name: "cancel_url", value: "" },
          { name: "paymenttype", value: paymentLinkData.paymentType },
          { name: "passthrough", value: "0" },
          { name: "commissionrate", value: "0" },
          { name: "exchange", value: "72" },
          { name: "payername", value: payerInfo?.payername || "ilori joshua" },
          { name: "payeraddress", value: payerInfo?.payeraddress || "Lekki gardens phase" },
          { name: "payercity", value: payerInfo?.payercity || "Lagos" },
          { name: "payerstate", value: payerInfo?.payerstate || "Lagos" },
          { name: "payercountry", value: payerInfo?.payercountry || "NG" },
          { name: "payerzipcode", value: payerInfo?.payerzipcode || "null" },
          { name: "payerphone", value: payerInfo?.payerphone || "2348135064965" },
          { name: "reusewallet", value: "1" },
          { name: "description", value: paymentLinkData.description || "" },
          { name: "reference", value: "" }
        ]
      };

      // Log the API call attempt
      await this.auditService.createAuditLog({
        entityType: 'PaymentInitialization',
        entityId: paymentLinkData.id,
        action: 'TORONET_API_CALL_INITIATED',
        changes: {
          apiUrl: `${this.apiUrl}/payment/toro`,
          correlationId,
          requestPayload: {
            ...requestPayload,
            // Don't log sensitive admin credentials
            headers: { adminpwd: '[REDACTED]', admin: '[REDACTED]' }
          }
        },
        metadata: { correlationId }
      });

      // Make the API call to Toronet
      const response: AxiosResponse<ToronetPaymentInitializeResponse> = await axios.post(
        `${this.apiUrl}/payment/toro`,
        requestPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'adminpwd': this.adminPwd,
            'admin': this.admin
          },
          timeout: 30000 // 30 second timeout
        }
      );

      const responseData = response.data;

      // Log successful API response
      await this.auditService.createAuditLog({
        entityType: 'PaymentInitialization',
        entityId: paymentLinkData.id,
        action: 'TORONET_API_CALL_SUCCESS',
        changes: {
          statusCode: response.status,
          responseData,
          correlationId
        },
        metadata: { correlationId }
      });

      // Check if the response indicates success
      const isSuccess = responseData.success === true || (responseData.txid && responseData.txid.length > 0);
      
      return {
        transactionId: paymentLinkData.id,
        toronetReference: responseData.txid || `fallback_${correlationId}`,
        requestPayload,
        responsePayload: responseData,
        status: isSuccess ? 'SUCCESS' : 'FAILED',
        error: isSuccess ? undefined : (responseData.error || responseData.message || 'Unknown error')
      };

    } catch (error: any) {
      // Log failed API call
      await this.auditService.createAuditLog({
        entityType: 'PaymentInitialization',
        entityId: paymentLinkData.id,
        action: 'TORONET_API_CALL_FAILED',
        changes: {
          error: error.message,
          statusCode: error.response?.status,
          responseData: error.response?.data,
          correlationId
        },
        metadata: { correlationId }
      });

      // Return failed initialization data
      return {
        transactionId: paymentLinkData.id,
        toronetReference: `error_${correlationId}`,
        requestPayload: {
          op: "paymentinitialize",
          params: [] // Empty params due to error
        },
        responsePayload: {
          success: false,
          error: error.message,
          message: `Toronet API call failed: ${error.message}`
        },
        status: 'FAILED',
        error: error.message
      };
    }
  }

  /**
   * Get payment status from Toronet
   */
  async getPaymentStatus(toronetReference: string): Promise<any> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/payment/status`,
        {
          op: "paymentstatus",
          params: [
            { name: "txid", value: toronetReference }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'adminpwd': this.adminPwd,
            'admin': this.admin
          },
          timeout: 30000
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Failed to get payment status from Toronet:', error.message);
      throw error;
    }
  }

  /**
   * Validate Toronet webhook signature (if applicable)
   */
  validateWebhookSignature(payload: any, signature: string): boolean {
    // TODO: Implement webhook signature validation based on Toronet documentation
    // For now, return true (implement proper validation in production)
    return true;
  }
}