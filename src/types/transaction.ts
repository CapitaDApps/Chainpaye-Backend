// Transaction related types and DTOs
import { TransactionState, IPayerInfo } from '../models/Transaction';

export interface CreateTransactionRequest {
  paymentLinkId: string;
  payerInfo?: IPayerInfo;
  metadata?: Record<string, any>;
}

export interface RecordTransactionRequest {
  amount: string;
  currency: string;
  senderName: string;
  senderPhone: string;
  senderEmail?: string; // Optional email field
  paidAt: string; // ISO date string
}

export interface CreateTransactionResponse {
  id: string;
  paymentLinkId: string;
  reference: string;
  state: TransactionState;
  amount: string;
  currency: string;
  payerInfo?: IPayerInfo;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecordTransactionResponse {
  id: string;
  paymentLinkId: string;
  reference: string;
  state: TransactionState;
  amount: string;
  currency: string;
  actualAmountPaid: string;
  senderName: string;
  senderPhone: string;
  paidAt: Date;
  recordedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionStatusResponse {
  id: string;
  paymentLinkId: string;
  reference: string;
  state: TransactionState;
  amount: string;
  currency: string;
  payerInfo?: IPayerInfo;
  toronetReference?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  paymentInitialization?: PaymentInitializationInfo;
  fiatVerification?: FiatVerificationInfo;
  payout?: PayoutInfo;
}

export interface PaymentInitializationInfo {
  id: string;
  toronetReference: string;
  status: 'SUCCESS' | 'FAILED';
  error?: string;
  createdAt: Date;
}

export interface FiatVerificationInfo {
  id: string;
  toronetReference: string;
  amount: string;
  currency: string;
  verificationMethod: 'POLL' | 'WEBHOOK' | 'MANUAL';
  confirmedAt: Date;
  createdAt: Date;
}

export interface PayoutInfo {
  id: string;
  merchantId: string;
  amount: string;
  currency: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  payoutReference?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface TransactionListResponse {
  transactions: TransactionStatusResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface StateTransitionRequest {
  newState: TransactionState;
  reason: string;
  metadata?: Record<string, any>;
}

export interface StateTransitionResponse {
  success: boolean;
  previousState: TransactionState;
  newState: TransactionState;
  reason: string;
  timestamp: Date;
}