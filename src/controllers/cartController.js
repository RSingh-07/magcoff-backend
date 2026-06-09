import cartService from '../services/cartService.js';
import { generateSignalRCredentials, addUserToGroup } from '../services/signalRService.js';

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

  // ── SignalR Negotiate ─────────────────────────────────────────────────────
  async negotiate(req, res) {
    try {
      const userId = getUserId(req);
      console.log('🔄 Negotiating SignalR for user:', userId);

      const credentials = generateSignalRCredentials(userId);
      console.log('✅ SignalR negotiation successful');

      return res.status(200).json({ success: true, ...credentials });
    } catch (err) {
      console.error('❌ SignalR negotiation failed:', err.message);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // ── Link physical cart to this user's SignalR group ───────────────────────
  async linkCart(req, res) {
    try {
      const { cartId } = req.body;
      if (!cartId) {
        return res.status(400).json({ success: false, message: 'cartId is required' });
      }

      const userId = getUserId(req);
      console.log(`🔗 Linking cart ${cartId} for user ${userId}`);

      // Join the SignalR group named after this cartId so broadcasts
      // from the Jetson reach only this user's connection.
      await addUserToGroup(userId, cartId);

      console.log(`✅ Cart ${cartId} linked to user ${userId}`);
      return res.status(200).json({ success: true, cartId });
    } catch (err) {
      console.error('❌ Cart linking failed:', err.message);
      return res.status(500).json({ success: false, message: err.message });
    }
  },
};

export default cartController;