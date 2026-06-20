import wishlistService from '../services/wishlistService.js';
import mongoose from 'mongoose';

const getUserId = (req) => req.user.oid || req.user.userId || req.user.sub;

const wishlistController = {
  // GET /api/wishlist
  async getAll(req, res) {
    try {
      const items = await wishlistService.getByOid(getUserId(req));
      return res.json({ success: true, items });
    } catch (err) {
      console.error('❌ GET wishlist error:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // POST /api/wishlist/add
  // Body: { productId, name, price, imageUrl?, unit?, category? }
  async addItem(req, res) {
    try {
      const { productId, name, price, imageUrl, unit, category } = req.body;

      if (!productId || !name || price == null) {
        return res.status(400).json({
          success: false,
          message: 'productId, name, and price are required',
        });
      }

      const item = await wishlistService.addItem(getUserId(req), {
        productId, name, price, imageUrl, unit, category,
      });

      return res.status(201).json({ success: true, item });
    } catch (err) {
      // Duplicate key from a race condition — still a success
      if (err.code === 11000) {
        return res.json({ success: true, message: 'Already in wishlist' });
      }
      console.error('❌ POST wishlist/add error:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // DELETE /api/wishlist/:id
  // :id is the shopping_lists document _id
  async removeItem(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid id' });
      }

      await wishlistService.removeItem(getUserId(req), id);
      return res.json({ success: true, message: 'Removed from wishlist' });
    } catch (err) {
      if (err.message === 'Item not found') {
        return res.status(404).json({ success: false, message: 'Item not found' });
      }
      console.error('❌ DELETE wishlist/:id error:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },
};

export default wishlistController;