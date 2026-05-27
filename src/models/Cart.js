/**
 * Cart Model
 * Collection: MagcoffDB → carts
 *
 * One active cart per user at a time.
 * Items embedded — price is a snapshot at scan time.
 * On checkout → status becomes checked_out → Order is created.
 */

import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name:      { type: String,  required: true },
    price:     { type: Number,  required: true, min: 0 }, // snapshot at scan time
    imageUrl:  { type: String,  default: null },
    quantity:  { type: Number,  required: true, min: 1, default: 1 },
    lineTotal: { type: Number,  required: true, min: 0 }, // price × quantity
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },

    status: {
      type:    String,
      default: 'active',
      enum:    ['active', 'checked_out', 'abandoned'],
    },

    // Embedded items — bounded by physical cart capacity
    items: { type: [cartItemSchema], default: [] },

    // Precomputed on every write — Flutter reads directly
    subtotal:  { type: Number, default: 0 },
    discount:  { type: Number, default: 0 },
    total:     { type: Number, default: 0 }, // subtotal - discount

    couponCode: { type: String, default: null, uppercase: true, trim: true },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    collection: 'carts',
  }
);

// One active cart per user at a time
cartSchema.index({ userId: 1, status: 1 });

const Cart = mongoose.model('Cart', cartSchema);
export default Cart;