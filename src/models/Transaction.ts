import mongoose, { Document, Schema } from "mongoose";

export enum TransactionState {
  PENDING = 'PENDING',
  INITIALIZED = 'INITIALIZED',
  PAID = 'PAID',
  COMPLETED = 'COMPLETED',
  PAYOUT_FAILED = 'PAYOUT_FAILED'
}

export interface IPayerInfo {
  email?: string;
  phone?: string;
  name?: string; // Added sender name
  metadata?: Record<string, any>;
}

export interface ITransaction extends Document {
  id: string;
  paymentLinkId: string;
  reference: string;
  state: TransactionState;
  amount: string;
  currency: string;
  payerInfo?: IPayerInfo;
  toronetReference?: string;
  
  // Payment recording fields
  actualAmountPaid?: string;        // Amount actually paid
  senderName?: string;              // Name of person who sent payment
  senderPhone?: string;             // Phone number of sender
  paidAt?: Date;                    // When payment was completed
  recordedAt?: Date;                // When we recorded the transaction
  
  // Background verification fields
  lastVerificationCheck?: Date;     // Last time we checked with Toronet
  verificationStartedAt?: Date;     // When verification process started
  expiresAt?: Date;                 // When transaction expires (24 hours from creation)
  
  // Processing lock fields (prevent race conditions)
  processingBy?: string;            // Process ID or service name currently processing
  processingStartedAt?: Date;       // When processing lock was acquired
  
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const PayerInfoSchema: Schema = new Schema({
  email: {
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(email: string) {
        return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: "Invalid email format"
    }
  },
  phone: {
    type: String,
    trim: true,
  },
  name: {
    type: String,
    trim: true,
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, { _id: false });

const TransactionSchema: Schema = new Schema(
  {
    paymentLinkId: {
      type: String,
      required: [true, "Payment Link ID is required"],
      ref: 'PaymentLink',
      index: true,
    },
    reference: {
      type: String,
      required: [true, "Transaction reference is required"],
      unique: true,
      trim: true,
    },
    state: {
      type: String,
      required: [true, "Transaction state is required"],
      enum: {
        values: Object.values(TransactionState),
        message: "Invalid transaction state"
      },
      default: TransactionState.PENDING,
      index: true,
    },
    amount: {
      type: String,
      required: [true, "Amount is required"],
      validate: {
        validator: function(value: string) {
          // Parse as number for validation
          const numValue = parseFloat(value);
          return !isNaN(numValue) && numValue > 0 && (numValue * 10000) % 1 === 0;
        },
        message: "Amount must be a positive number string with at most 4 decimal places"
      }
    },
    currency: {
      type: String,
      required: [true, "Currency is required"],
      enum: {
        values: ['NGN', 'USD', 'GBP', 'EUR'],
        message: "Currency must be one of: NGN, USD, GBP, EUR"
      }
    },
    payerInfo: {
      type: PayerInfoSchema,
      default: {}
    },
    toronetReference: {
      type: String,
      trim: true,
      index: true,
      sparse: true, // Allow multiple null values
    },
    actualAmountPaid: {
      type: String,
      trim: true,
      validate: {
        validator: function(value: string) {
          if (!value) return true; // Optional field
          const numValue = parseFloat(value);
          return !isNaN(numValue) && numValue > 0 && (numValue * 10000) % 1 === 0;
        },
        message: "Actual amount paid must be a positive number string with at most 4 decimal places"
      }
    },
    senderName: {
      type: String,
      trim: true,
      maxlength: [100, "Sender name cannot exceed 100 characters"]
    },
    senderPhone: {
      type: String,
      trim: true,
      maxlength: [20, "Sender phone cannot exceed 20 characters"]
    },
    paidAt: {
      type: Date,
      index: true,
    },
    recordedAt: {
      type: Date,
      index: true,
    },
    lastVerificationCheck: {
      type: Date,
      index: true,
    },
    verificationStartedAt: {
      type: Date,
      index: true,
    },
    expiresAt: {
      type: Date,
      index: true,
      default: function() {
        return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from creation
      }
    },
    processingBy: {
      type: String,
      trim: true,
      index: true,
    },
    processingStartedAt: {
      type: Date,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    strict: true,
  }
);

// Compound indexes for performance
TransactionSchema.index({ paymentLinkId: 1, createdAt: -1 });
TransactionSchema.index({ state: 1, createdAt: 1 });
TransactionSchema.index({ toronetReference: 1 }, { sparse: true });
TransactionSchema.index({ reference: 1 }, { unique: true });

// Enhanced indexes for background verification performance
TransactionSchema.index({ 
  state: 1, 
  verificationStartedAt: 1, 
  expiresAt: 1 
}); // Primary query for background verification
TransactionSchema.index({ 
  state: 1, 
  lastVerificationCheck: 1, 
  expiresAt: 1 
}); // Secondary query optimization
TransactionSchema.index({ 
  processingBy: 1, 
  processingStartedAt: 1 
}, { sparse: true }); // Processing lock queries

// Ensure reference uniqueness
TransactionSchema.index({ reference: 1 }, { unique: true });

export default mongoose.model<ITransaction>("Transaction", TransactionSchema);