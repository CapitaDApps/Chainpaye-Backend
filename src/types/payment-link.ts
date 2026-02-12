// Payment Link related types and DTOs

export interface CreatePaymentLinkRequest {
  merchantId: string;
  userId: string;
  name: string; // Owner/business name to be displayed
  amount: string;
  currency: 'NGN' | 'USD' | 'GBP' | 'EUR';
  description?: string;
  token: string;
  selectedCurrency: string;
  paymentType: 'bank' | 'card';
  successUrl?: string;
  metadata?: Record<string, any>;
  address?:string
}

export interface CreatePaymentLinkResponse {
  id: string;
  merchantId: string;
  userId: string;
  name: string; // Owner/business name to be displayed
  amount: string;
  currency: 'NGN' | 'USD' | 'GBP' | 'EUR';
  description?: string;
  isActive: boolean;
  address: string;
  token: string;
  selectedCurrency: string;
  paymentType: 'bank' | 'card';
  successUrl: string;
  linkUrl: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentLinkListResponse {
  paymentLinks: CreatePaymentLinkResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface DisablePaymentLinkRequest {
  reason?: string;
}

export interface PaymentLinkStatusResponse {
  id: string;
  isActive: boolean;
  transactionCount: number;
  totalAmount: string;
  lastTransactionAt?: Date;
}

export interface PaymentLinkVerificationResponse {
  id: string;
  isActive: boolean;
  name: string; // Owner/business name to be displayed
  address: string;
  token: string;
  currency: string;
  selectedCurrency: string;
  paymentType: 'bank' | 'card';
  amount: string;
  description?: string;
  successUrl: string;
}