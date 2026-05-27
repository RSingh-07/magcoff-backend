/**
 * Order Model
 * Collection: MagcoffDB → orders
 *
 * Created when shopper completes payment.
 * Immutable after creation — price snapshot is the legal record.
 * orderId uses MGC prefix shown in Flutter OrderHistoryScreen.
 */

import mongoose from 'mongoose';

const orderLineSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name:      { type: String, required: true },
    imageUrl:  { type: String, default: null  },
    quantity:  { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 }, // price snapshot at checkout
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    // Human-readable receipt ID — "MGC240117001"
    orderId: {
      type:     String,
      required: true,
      unique:   true,
      trim:     true,
    },

    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },

    cartId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Cart',
      default:  null,
    },

    // Snapshot of purchased items
    lines: { type: [orderLineSchema], required: true },

    // Totals
    subtotal:   { type: Number, required: true, min: 0 },
    discount:   { type: Number, default: 0,     min: 0 },
    total:      { type: Number, required: true,  min: 0 }, // what shopper paid
    couponCode: { type: String, default: null },

    paymentMethod: {
      type:     String,
      enum:     ['upi', 'card', 'wallet', 'cash'],
      required: true,
    },

    paymentStatus: {
      type:    String,
      enum:    ['pending', 'success', 'failed', 'refunded'],
      default: 'pending',
    },

    transactionId: { type: String, default: null, trim: true },

    status: {
      type:    String,
      enum:    ['pending', 'completed', 'cancelled'],
      default: 'pending',
    },

    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    collection: 'orders',
  }
);

// Order history screen — all orders for a user, newest first
orderSchema.index({ userId: 1, createdAt: -1 });
// NOTE: orderId unique:true already creates its index

const Order = mongoose.model('Order', orderSchema);
export default Order;