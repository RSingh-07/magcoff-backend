import cartService from '../services/cartService.js';

// Works for Entra (oid), dev bypass (userId), and B2C (sub)
const getUserId = (req) => req.user.oid || req.user.userId || req.user.sub;

const cartController = {

  async getCart(req, res) {
    try {
      const userId = getUserId(req);
      const data = await cartService.getCart(userId);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async addItem(req, res) {
    try {
      const userId = getUserId(req);
      const { productId, quantity } = req.body;
      if (!productId) {
        return res.status(400).json({
          success: false,
          message: 'productId is required',
        });
      }
      const data = await cartService.addItem(
        userId, productId, Number(quantity) || 1,
      );
      res.json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  async removeItem(req, res) {
    try {
      const userId = getUserId(req);
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

  async updateQuantity(req, res) {
    try {
      const userId = getUserId(req);
      const { productId, quantity } = req.body;
      if (!productId || quantity === undefined) {
        return res.status(400).json({
          success: false,
          message: 'productId and quantity are required',
        });
      }
      const data = await cartService.updateQuantity(
        userId, productId, Number(quantity),
      );
      res.json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  async applyCoupon(req, res) {
    try {
      const userId = getUserId(req);
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