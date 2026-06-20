/**
 * WishlistItem Model
 * Collection: MagcoffDB → shopping_lists
 *
 * Extracted from the inline schema previously defined directly inside
 * wishlistRoutes.js. Centralizing it here lets other modules (e.g.
 * userService.getProfile) query real wishlist counts instead of the
 * previous hardcoded `wishlistCount: 0`.
 *
 * One entry per (userId, productId) pair — enforced by a compound
 * unique index so "adding" an already-wishlisted product is a safe upsert.
 */

import mongoose from 'mongoose';

const wishlistItemSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    productId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Product',
      required: true,
    },
    // Denormalised snapshot so reads are cheap
    name:     { type: String,  required: true },
    price:    { type: Number,  required: true, min: 0 },
    imageUrl: { type: String,  default: null },
    unit:     { type: String,  default: '' },
    category: { type: String,  default: '' },
  },
  {
    timestamps: true,
    collection: 'shopping_lists',
  }
);

// Compound unique → one entry per user–product pair
wishlistItemSchema.index({ userId: 1, productId: 1 }, { unique: true });

// Guard against duplicate model registration in dev/hot-reload environments
const WishlistItem = mongoose.models.WishlistItem
  || mongoose.model('WishlistItem', wishlistItemSchema);

export default WishlistItem;