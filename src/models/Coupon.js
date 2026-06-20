/**
 * Coupon Model
 * Collection: MagcoffDB → coupons
 *
 * Minimal real coupon validation to replace the previous behavior where
 * cartService.applyCoupon accepted ANY non-empty string and always applied
 * a flat 10% discount with no expiry, eligibility, or usage checks.
 *
 * This model supports:
 *  - percentage discounts (0-100)
 *  - an optional minimum order subtotal to qualify
 *  - an optional expiry date
 *  - an active/inactive flag
 */

import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: {
      type:     String,
      required: true,
      unique:   true,   // already creates the index — no separate .index() call needed
      trim:     true,
      uppercase: true,
    },

    // Percentage discount, e.g. 10 = 10% off subtotal
    discountPercent: {
      type:     Number,
      required: true,
      min:      0,
      max:      100,
    },

    // Cart subtotal must be >= this value for the coupon to apply
    minOrderValue: {
      type:    Number,
      default: 0,
      min:     0,
    },

    // Coupon stops being valid after this date (null = never expires)
    expiresAt: {
      type:    Date,
      default: null,
    },

    isActive: {
      type:    Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'coupons',
  }
);

const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema);
export default Coupon;