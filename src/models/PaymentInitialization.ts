import mongoose, { Document, Schema } from "mongoose";

export interface IPaymentInitialization extends Document {
  id: string;
  transactionId: string;
  toronetReference: string;
  requestPayload: any;
  responsePayload?: any;
  status: 'SUCCESS' | 'FAILED';
  error?: string;
  createdAt: Date;
}

const PaymentInitializationSchema: Schema = new Schema(
  {
    transactionId: {
      type: String,
      required: [true, "Transaction ID is required"],
      ref: 'Transaction',
      index: true,
    },
    toronetReference: {
      type: String,
      required: [true, "Toronet reference is required"],
      trim: true,
      index: true,
    },
    requestPayload: {
      type: Schema.Types.Mixed,
      required: [true, "Request payload is required"],
    },
    responsePayload: {
      type: Schema.Types.Mixed,
    },
    status: {
      type: String,
      required: [true, "Status is required"],
      enum: {
        values: ['SUCCESS', 'FAILED'],
        message: "Status must be either SUCCESS or FAILED"
      }
    },
    error: {
      type: String,
      trim: true,
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Only track creation time
    strict: true,
  }
);

// Indexes for performance
PaymentInitializationSchema.index({ transactionId: 1 });
PaymentInitializationSchema.index({ toronetReference: 1 });
PaymentInitializationSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<IPaymentInitialization>("PaymentInitialization", PaymentInitializationSchema);