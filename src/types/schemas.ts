// Validation schemas for all DTOs
import { ValidationSchema, ValidationFunctions, ValidationPatterns } from './validation';
import { CreatePaymentLinkRequest, DisablePaymentLinkRequest } from './payment-link';
import { CreateTransactionRequest, StateTransitionRequest, RecordTransactionRequest } from './transaction';
import { PayoutRequest, RetryPayoutRequest } from './payout';
import { CreateAuditLogRequest } from './audit';

// Payment Link Schemas
export const CreatePaymentLinkSchema: ValidationSchema<CreatePaymentLinkRequest> = {
  merchantId: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 255,
  },
  userId: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 255,
  },
  address:{
   type:'string',
   required:true,
   
  },
  name: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 100,
  },
  amount: {
    type: 'string',
    required: true,
    custom: ValidationFunctions.isValidAmount,
  },
  currency: {
    type: 'string',
    required: true,
    custom: ValidationFunctions.isValidCurrency,
  },
  description: {
    type: 'string',
    required: false,
    maxLength: 500,
  },
  token: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 100,
  },
  selectedCurrency: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 10,
  },
  paymentType: {
    type: 'string',
    required: true,
    custom: ValidationFunctions.isValidPaymentType,
  },
  successUrl: {
    type: 'string',
    required: false,
    maxLength: 500,
  },
  metadata: {
    type: 'object',
    required: false,
  },
};

export const DisablePaymentLinkSchema: ValidationSchema<DisablePaymentLinkRequest> = {
  reason: {
    type: 'string',
    required: false,
    maxLength: 255,
  },
};

// Transaction Schemas
export const createTransactionSchema: ValidationSchema<CreateTransactionRequest> = {
  paymentLinkId: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 255,
  },
  payerInfo: {
    type: 'object',
    required: false,
  },
  metadata: {
    type: 'object',
    required: false,
  },
};

export const stateTransitionSchema: ValidationSchema<StateTransitionRequest> = {
  newState: {
    type: 'string',
    required: true,
    custom: ValidationFunctions.isValidTransactionState,
  },
  reason: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 255,
  },
  metadata: {
    type: 'object',
    required: false,
  },
};

export const RecordTransactionSchema: ValidationSchema<RecordTransactionRequest> = {
  amount: {
    type: 'string',
    required: true,
    custom: ValidationFunctions.isValidAmount,
  },
  currency: {
    type: 'string',
    required: true,
    custom: ValidationFunctions.isValidCurrency,
  },
  senderName: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 100,
  },
  senderPhone: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 20,
  },
  senderEmail: {
    type: 'string',
    required: false,
    pattern: ValidationPatterns.email,
  },
  paidAt: {
    type: 'string',
    required: true,
    minLength: 1,
  },
};

// Payout Schemas
export const PayoutRequestSchema: ValidationSchema<PayoutRequest> = {
  transactionId: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 255,
  },
  merchantId: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 255,
  },
  amount: {
    type: 'string',
    required: true,
    custom: ValidationFunctions.isValidAmount,
  },
  currency: {
    type: 'string',
    required: true,
    custom: ValidationFunctions.isValidCurrency,
  },
  idempotencyKey: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 255,
  },
  metadata: {
    type: 'object',
    required: false,
  },
};

export const RetryPayoutSchema: ValidationSchema<RetryPayoutRequest> = {
  reason: {
    type: 'string',
    required: false,
    maxLength: 255,
  },
  metadata: {
    type: 'object',
    required: false,
  },
};

// Audit Log Schemas
export const CreateAuditLogSchema: ValidationSchema<CreateAuditLogRequest> = {
  entityType: {
    type: 'string',
    required: true,
    enum: ['PaymentLink', 'Transaction', 'PaymentInitialization', 'FiatVerification', 'Payout'],
  },
  entityId: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 255,
  },
  action: {
    type: 'string',
    required: true,
    enum: [
      'CREATE', 'UPDATE', 'DELETE', 'STATE_TRANSITION',
      'PAYMENT_INITIALIZE', 'PAYMENT_CONFIRM', 'PAYOUT_INITIATE',
      'PAYOUT_COMPLETE', 'PAYOUT_FAIL', 'DISABLE', 'ENABLE'
    ],
  },
  userId: {
    type: 'string',
    required: false,
    maxLength: 255,
  },
  changes: {
    type: 'object',
    required: false,
  },
  metadata: {
    type: 'object',
    required: false,
  },
  correlationId: {
    type: 'string',
    required: false,
    maxLength: 255,
  },
};

// Payer Info Schema (nested)
export const PayerInfoSchema = {
  email: {
    type: 'string' as const,
    required: false,
    pattern: ValidationPatterns.email,
  },
  phone: {
    type: 'string' as const,
    required: false,
    pattern: ValidationPatterns.phone,
  },
  metadata: {
    type: 'object' as const,
    required: false,
  },
};

// Common parameter schemas
export const PaginationSchema = {
  page: {
    type: 'number' as const,
    required: false,
    min: 1,
    integer: true,
  },
  limit: {
    type: 'number' as const,
    required: false,
    min: 1,
    max: 100,
    integer: true,
  },
  sortBy: {
    type: 'string' as const,
    required: false,
    maxLength: 50,
  },
  sortOrder: {
    type: 'string' as const,
    required: false,
    enum: ['asc', 'desc'],
  },
};