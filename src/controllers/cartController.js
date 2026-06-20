import cartService from '../services/cartService.js';
import { generateSignalRCredentials, addUserToGroup } from '../services/signalRService.js';

const getUserId = (req) => req.user.oid || req.user.userId || req.user.sub;

// Known Issue #4 fix helper: distinguishes client-input validation errors
// (which should be 400) from genuine server/DB errors (500). cartService
// now throws clear, recognizable messages for invalid quantities — we map
// those specific messages to 400 here rather than blanket-500ing everything.
function isValidationError(message) {
  return (
    message.includes('must be a positive whole number') ||
    message.includes('must be a valid number')
  );
}

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
        getUserId(req), productId, quantity === undefined ? 1 : quantity,
      );
      res.json({ success: true, data });
    } catch (err) {
      const status = isValidationError(err.message) ? 400 : 500;
      res.status(status).json({ success: false, message: err.message });
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
        getUserId(req), productId, quantity,
      );
      res.json({ success: true, data });
    } catch (err) {
      const status = isValidationError(err.message) ? 400 : 500;
      res.status(status).json({ success: false, message: err.message });
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
      // Known Issue #5 fix: invalid/expired/ineligible coupon codes are now
      // client errors (400), not server errors (500).
      const status = (
        err.message === 'Invalid or inactive coupon code' ||
        err.message === 'This coupon has expired' ||
        err.message.startsWith('This coupon requires a minimum order value')
      ) ? 400 : 500;
      res.status(status).json({ success: false, message: err.message });
    }
  },

  // ── SignalR Negotiate ─────────────────────────────────────────────────────
  async negotiate(req, res) {
    try {
      const userId = getUserId(req);
      console.log('🔄 Negotiating SignalR for user:', userId);

      const credentials = generateSignalRCredentials(userId);
      console.log('✅ SignalR negotiation successful');

      // Flutter expects: { url, accessToken }
      return res.status(200).json(credentials);
    } catch (err) {
      console.error('❌ SignalR negotiation failed:', err.message);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // ── Link physical cart to this user's SignalR group ───────────────────────
  // Body: { cartId: string, connectionId: string }
  //
  // connectionId is the real Azure SignalR WebSocket connection ID that
  // Flutter reads from hubConnection.connectionId after connecting.
  // It looks like: "abc123def456..." — NOT the user's Azure OID.
  async linkCart(req, res) {
    try {
      const { cartId, connectionId } = req.body;

      if (!cartId) {
        return res.status(400).json({ success: false, message: 'cartId is required' });
      }
      if (!connectionId) {
        return res.status(400).json({ success: false, message: 'connectionId is required' });
      }

      const userId = getUserId(req);
      console.log(`🔗 Linking cart ${cartId} for user ${userId}`);
      console.log(`🔌 SignalR connectionId: ${connectionId}`);

      // Group name for this cart — Jetson will broadcast to this group
      const groupName = `cart-${cartId}`;

      // Add the Flutter client's actual WebSocket connection to the group
      await addUserToGroup(connectionId, groupName);

      console.log(`✅ Connection ${connectionId} added to group ${groupName}`);
      return res.status(200).json({
        success: true,
        cartId,
        groupName,
      });
    } catch (err) {
      console.error('❌ Cart linking failed:', err.message);
      return res.status(500).json({ success: false, message: err.message });
    }
  },
};

export default cartController;