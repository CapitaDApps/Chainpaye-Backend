// Toronet API integration types and DTOs

export interface ToronetPaymentRequest {
  amount: string;
  currency: string;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, any>;
}

export interface ToronetPaymentResponse {
  success: boolean;
  toronetReference: string;
  paymentUrl?: string;
  status: string;
  message?: string;
  error?: string;
}

export interface ToronetStatusRequest {
  toronetReference: string;
}

export interface ToronetStatusResponse {
  success: boolean;
  toronetReference: string;
  status: string;
  fiatResult: boolean;
  amount: string;
  currency: string;
  paidAt?: Date;
  metadata?: Record<string, any>;
}

export interface ToronetWebhookPayload {
  event: string;
  toronetReference: string;
  transactionReference: string;
  status: string;
  fiatResult: boolean;
  amount: string;
  currency: string;
  paidAt?: string;
  metadata?: Record<string, any>;
  signature: string;
}

export interface ToronetWebhookResult {
  processed: boolean;
  transactionId?: string;
  error?: string;
}

export interface FiatResult {
  transactionId: string;
  toronetReference: string;
  amount: string;
  currency: string;
  confirmed: boolean;
  timestamp: Date;
  verificationMethod: 'POLL' | 'WEBHOOK' | 'MANUAL';
  verificationData: any;
}

export interface FiatConfirmation {
  toronetReference: string;
  amount: string;
  currency: string;
  confirmedAt: Date;
  verificationData: any;
}