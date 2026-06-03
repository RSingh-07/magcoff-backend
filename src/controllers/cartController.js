import cartService from '../services/cartService.js';

const getUserId = (req) => req.user.oid || req.user.userId || req.user.sub;

const cartController = {
  async getCart(req, res) {
    try {
      const data = await cartService.getCart(getUserId(req));
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async addItem(req, res) {
    try {
      const { productId, quantity } = req.body;
      if (!productId) {
        return res.status(400).json({ success: false, message: 'productId is required' });
      }
      const data = await cartService.addItem(
        getUserId(req), productId, Number(quantity) || 1,
      );
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async removeItem(req, res) {
    try {
      const { productId } = req.body;
      if (!productId) {
        return res.status(400).json({ success: false, message: 'productId is required' });
      }
      const data = await cartService.removeItem(getUserId(req), productId);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async updateQuantity(req, res) {
    try {
      const { productId, quantity } = req.body;
      if (!productId || quantity === undefined) {
        return res.status(400).json({
          success: false, message: 'productId and quantity are required',
        });
      }
      const data = await cartService.updateQuantity(
        getUserId(req), productId, Number(quantity),
      );
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async applyCoupon(req, res) {
    try {
      const { couponCode } = req.body;
      if (!couponCode) {
        return res.status(400).json({ success: false, message: 'couponCode is required' });
      }
      const data = await cartService.applyCoupon(getUserId(req), couponCode);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
};

export default cartController;