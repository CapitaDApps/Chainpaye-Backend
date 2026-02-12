import mongoose, { Document, Schema } from "mongoose";

export interface IPaymentLink extends Document {
  id: string;
  merchantId: string;
  userId: string; // User who created the payment link
  name: string; // Owner/business name to be displayed
  amount: string;
  currency: 'NGN' | 'USD' | 'GBP' | 'EUR';
  description?: string;
  isActive: boolean;
  address: string; // Blockchain address for payments
  token: string; // Selected token for payment
  selectedCurrency: string; // Selected currency (can be different from base currency)
  paymentType: 'bank' | 'card'; // Payment method type
  successUrl: string; // Success redirect URL
  linkUrl: string; // The actual payment link URL
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentLinkSchema: Schema = new Schema(
  {
    merchantId: {
      type: String,
      required: [true, "Merchant ID is required"],
      trim: true,
      index: true,
    },
    userId: {
      type: String,
      required: [true, "User ID is required"],
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [1, "Name cannot be empty"],
      maxlength: [100, "Name cannot exceed 100 characters"],
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
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"]
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    address: {
      type: String,
      required: [true, "Blockchain address is required"],
      default: "0101848843_8fea8a2360cc92478a017fdb637ec6d2",
      trim: true,
    },
    token: {
      type: String,
      required: [true, "Token is required"],
      trim: true,
    },
    selectedCurrency: {
      type: String,
      required: [true, "Selected currency is required"],
      trim: true,
    },
    paymentType: {
      type: String,
      required: [true, "Payment type is required"],
      enum: {
        values: ['bank', 'card'],
        message: "Payment type must be either 'bank' or 'card'"
      },
      validate: {
        validator: function(this: IPaymentLink, value: string) {
          // Card payments supported for USD, GBP, EUR
          if (value === 'card' && !['USD', 'GBP', 'EUR'].includes(this.currency)) {
            return false;
          }
          // NGN should use bank transfer
          if (this.currency === 'NGN' && value !== 'bank') {
            return false;
          }
          return true;
        },
        message: "Card payments are supported for USD, GBP, EUR. NGN must use bank transfer."
      }
    },
    successUrl: {
      type: String,
      required: [true, "Success URL is required"],
      default: "https://chainpaye.com/",
      trim: true,
    },
    linkUrl: {
      type: String,
      required: [true, "Link URL is required"],
      trim: true,
      unique: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    // Ensure amount and currency are immutable after creation
    strict: true,
  }
);

// Indexes for performance
PaymentLinkSchema.index({ merchantId: 1, createdAt: -1 });
PaymentLinkSchema.index({ isActive: 1 });

// Prevent modification of amount and currency after creation
PaymentLinkSchema.pre('save', function() {
  if (!this.isNew && (this.isModified('amount') || this.isModified('currency'))) {
    throw new Error('Amount and currency are immutable after creation');
  }
});

// Prevent updates to amount and currency
PaymentLinkSchema.pre('updateOne', function() {
  const update = this.getUpdate() as any;
  if (update && (update.amount !== undefined || update.currency !== undefined)) {
    throw new Error('Amount and currency cannot be updated');
  }
});

PaymentLinkSchema.pre('findOneAndUpdate', function() {
  const update = this.getUpdate() as any;
  if (update && (update.amount !== undefined || update.currency !== undefined)) {
    throw new Error('Amount and currency cannot be updated');
  }
});

export default mongoose.model<IPaymentLink>("PaymentLink", PaymentLinkSchema);