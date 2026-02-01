import mongoose, { Document, Schema } from "mongoose";

export interface IAuditLog extends Document {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  userId?: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  timestamp: Date;
  correlationId?: string;
}

const AuditLogSchema: Schema = new Schema(
  {
    entityType: {
      type: String,
      required: [true, "Entity type is required"],
      trim: true,
      enum: {
        values: ['PaymentLink', 'Transaction', 'PaymentInitialization', 'FiatVerification', 'Payout'],
        message: "Invalid entity type"
      },
      index: true,
    },
    entityId: {
      type: String,
      required: [true, "Entity ID is required"],
      trim: true,
      index: true,
    },
    action: {
      type: String,
      required: [true, "Action is required"],
      trim: true,
      enum: {
        values: [
          'CREATE', 'UPDATE', 'DELETE', 'STATE_TRANSITION',
          'PAYMENT_INITIALIZE', 'PAYMENT_CONFIRM', 'PAYOUT_INITIATE', 
          'PAYOUT_COMPLETE', 'PAYOUT_FAIL', 'DISABLE', 'ENABLE'
        ],
        message: "Invalid action type"
      }
    },
    userId: {
      type: String,
      trim: true,
    },
    changes: {
      type: Schema.Types.Mixed,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    timestamp: {
      type: Date,
      required: [true, "Timestamp is required"],
      default: Date.now,
      index: true,
    },
    correlationId: {
      type: String,
      trim: true,
      index: true,
    }
  },
  {
    timestamps: false, // We manage timestamp manually
    strict: true,
  }
);

// Compound indexes for performance
AuditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ correlationId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });

// Ensure audit logs are immutable after creation
AuditLogSchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany'], function() {
  throw new Error('Audit logs are immutable and cannot be updated');
});

export default mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);