// src/routes/wishlistRoutes.js
//
// Collection: MagcoffDB → shopping_lists
//
// GET    /api/wishlist        — get all wishlist items for the logged-in user
// POST   /api/wishlist/add    — add a product to wishlist (idempotent)
// DELETE /api/wishlist/:id    — remove a wishlist document by its _id

import { Router } from 'express';
import mongoose   from 'mongoose';
import authenticateToken from '../middleware/authenticateToken.js';

const router = Router();
router.use(authenticateToken);

// ─────────────────────────────────────────────────────────────
// Inline schema — shopping_lists hasn't been modelled yet
// ─────────────────────────────────────────────────────────────

const wishlistSchema = new mongoose.Schema(
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
wishlistSchema.index({ userId: 1, productId: 1 }, { unique: true });

// Guard: model may already be registered in other require() calls
const WishlistItem = mongoose.models.WishlistItem
  || mongoose.model('WishlistItem', wishlistSchema);

// ─────────────────────────────────────────────────────────────
// GET /api/wishlist
// ─────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const items = await WishlistItem
      .find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, items });
  } catch (err) {
    console.error('❌ GET wishlist error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/wishlist/add
// Body: { productId, name, price, imageUrl?, unit?, category? }
// ─────────────────────────────────────────────────────────────
router.post('/add', async (req, res) => {
  try {
    const { productId, name, price, imageUrl, unit, category } = req.body;

    if (!productId || !name || price == null) {
      return res.status(400).json({
        success: false,
        message: 'productId, name, and price are required',
      });
    }

    // Upsert — safe to call multiple times for the same product
    const item = await WishlistItem.findOneAndUpdate(
      { userId: req.user.id, productId },
      {
        userId:    req.user.id,
        productId,
        name,
        price,
        imageUrl:  imageUrl  ?? null,
        unit:      unit      ?? '',
        category:  category  ?? '',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(201).json({ success: true, item });
  } catch (err) {
    // Duplicate key from a race condition — still a success
    if (err.code === 11000) {
      return res.json({ success: true, message: 'Already in wishlist' });
    }
    console.error('❌ POST wishlist/add error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/wishlist/:id
// :id is the shopping_lists document _id
// ─────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }

    const result = await WishlistItem.findOneAndDelete({
      _id:    id,
      userId: req.user.id,   // ensures users can only delete their own items
    });

    if (!result) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    return res.json({ success: true, message: 'Removed from wishlist' });
  } catch (err) {
    console.error('❌ DELETE wishlist/:id error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;