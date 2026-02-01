// Payout related types and DTOs

export interface PayoutRequest {
  transactionId: string;
  merchantId: string;
  amount: string;
  currency: string;
  idempotencyKey: string;
  metadata?: Record<string, any>;
}

export interface PayoutResult {
  payoutId: string;
  transactionId: string;
  amount: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  reference?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface PayoutCallback {
  payoutId: string;
  status: 'SUCCESS' | 'FAILED';
  reference?: string;
  error?: string;
  completedAt: Date;
  metadata?: Record<string, any>;
}

export interface PayoutStatusResponse {
  id: string;
  transactionId: string;
  merchantId: string;
  amount: string;
  currency: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  payoutReference?: string;
  error?: string;
  idempotencyKey: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface PayoutListResponse {
  payouts: PayoutStatusResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface RetryPayoutRequest {
  reason?: string;
  metadata?: Record<string, any>;
}