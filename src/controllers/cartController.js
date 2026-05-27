/**
 * cartController.js
 *
 * SECURITY MIGRATION COMPLETE:
 * userId is now extracted exclusively from req.user (injected by
 * authenticateToken middleware). It is NEVER read from req.body
 * or req.params. Client cannot spoof identity.
 */

import cartService from '../services/cartService.js';

const cartController = {

  // GET /cart/
  async getCart(req, res) {
    try {
      const { userId } = req.user;
      const data = await cartService.getCart(userId);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /cart/add  — body: { productId, quantity }
  async addItem(req, res) {
    try {
      const { userId }              = req.user;
      const { productId, quantity } = req.body;

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: 'productId is required',
        });
      }

      const data = await cartService.addItem(
        userId,
        productId,
        Number(quantity) || 1,
      );
      res.json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  // POST /cart/remove  — body: { productId }
  async removeItem(req, res) {
    try {
      const { userId }    = req.user;
      const { productId } = req.body;

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: 'productId is required',
        });
      }

      const data = await cartService.removeItem(userId, productId);
      res.json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  // POST /cart/update-quantity  — body: { productId, quantity }
  async updateQuantity(req, res) {
    try {
      const { userId }              = req.user;
      const { productId, quantity } = req.body;

      if (!productId || quantity === undefined) {
        return res.status(400).json({
          success: false,
          message: 'productId and quantity are required',
        });
      }

      const data = await cartService.updateQuantity(
        userId,
        productId,
        Number(quantity),
      );
      res.json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  // POST /cart/apply-coupon  — body: { couponCode }
  async applyCoupon(req, res) {
    try {
      const { userId }     = req.user;
      const { couponCode } = req.body;

      if (!couponCode) {
        return res.status(400).json({
          success: false,
          message: 'couponCode is required',
        });
      }

      const data = await cartService.applyCoupon(userId, couponCode);
      res.json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },
};

export default cartController;