import mongoose, { Document, Schema } from "mongoose";

export interface IPayout extends Document {
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

const PayoutSchema: Schema = new Schema(
  {
    transactionId: {
      type: String,
      required: [true, "Transaction ID is required"],
      ref: 'Transaction',
      unique: true, // Ensure only one payout per transaction
      index: true,
    },
    merchantId: {
      type: String,
      required: [true, "Merchant ID is required"],
      trim: true,
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
    status: {
      type: String,
      required: [true, "Status is required"],
      enum: {
        values: ['PENDING', 'SUCCESS', 'FAILED'],
        message: "Status must be PENDING, SUCCESS, or FAILED"
      },
      default: 'PENDING',
      index: true,
    },
    payoutReference: {
      type: String,
      trim: true,
      sparse: true, // Allow multiple null values
    },
    error: {
      type: String,
      trim: true,
    },
    idempotencyKey: {
      type: String,
      required: [true, "Idempotency key is required"],
      unique: true,
      trim: true,
      index: true,
    },
    completedAt: {
      type: Date,
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Only track creation and completion times
    strict: true,
  }
);

// Indexes for performance
PayoutSchema.index({ transactionId: 1 }, { unique: true });
PayoutSchema.index({ merchantId: 1, createdAt: -1 });
PayoutSchema.index({ status: 1, createdAt: 1 });
PayoutSchema.index({ idempotencyKey: 1 }, { unique: true });

// Update completedAt when status changes to SUCCESS or FAILED
PayoutSchema.pre('save', function() {
  if (this.isModified('status') && (this.status === 'SUCCESS' || this.status === 'FAILED')) {
    this.completedAt = new Date();
  }
});

export default mongoose.model<IPayout>("Payout", PayoutSchema);