import mongoose, { Document, Schema } from "mongoose";

export interface IFiatVerification extends Document {
  id: string;
  transactionId: string;
  toronetReference: string;
  amount: string;
  currency: string;
  verificationMethod: 'POLL' | 'WEBHOOK' | 'MANUAL';
  verificationData: any;
  confirmedAt: Date;
  createdAt: Date;
}

const FiatVerificationSchema: Schema = new Schema(
  {
    transactionId: {
      type: String,
      required: [true, "Transaction ID is required"],
      ref: 'Transaction',
      unique: true, // Ensure only one verification per transaction
      index: true,
    },
    toronetReference: {
      type: String,
      required: [true, "Toronet reference is required"],
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
    verificationMethod: {
      type: String,
      required: [true, "Verification method is required"],
      enum: {
        values: ['POLL', 'WEBHOOK', 'MANUAL'],
        message: "Verification method must be POLL, WEBHOOK, or MANUAL"
      }
    },
    verificationData: {
      type: Schema.Types.Mixed,
      required: [true, "Verification data is required"],
    },
    confirmedAt: {
      type: Date,
      required: [true, "Confirmation timestamp is required"],
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Only track creation time
    strict: true,
  }
);

// Indexes for performance
FiatVerificationSchema.index({ transactionId: 1 }, { unique: true });
FiatVerificationSchema.index({ toronetReference: 1 });
FiatVerificationSchema.index({ confirmedAt: -1 });
FiatVerificationSchema.index({ verificationMethod: 1, createdAt: -1 });

export default mongoose.model<IFiatVerification>("FiatVerification", FiatVerificationSchema);