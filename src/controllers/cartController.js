import cartService from '../services/cartService.js';
import {
  generateSignalRCredentials,
  addUserToGroup,
  removeUserFromGroup,
  broadcastCartUpdate,
} from '../services/signalRService.js';
import User from '../models/User.js';
import cartRepository from '../repositories/cartRepository.js';

const getUserId = (req) => req.user.oid || req.user.userId || req.user.sub;

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
      const userId = getUserId(req);
      const qty = quantity === undefined ? 1 : quantity;
      console.log(`🛒 ADD ITEM START: user=${userId} product=${productId} qty=${qty}`);

      const data = await cartService.addItem(userId, productId, qty);

      console.log(`✅ ADD ITEM SUCCESS: user=${userId} items=${data.items?.length ?? 'n/a'} total=${data.total ?? 'n/a'}`);
      res.json({ success: true, data });
    } catch (err) {
      console.error(`❌ ADD ITEM FAILED: ${err.message}`);
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
      const userId = getUserId(req);
      console.log(`🗑️  REMOVE ITEM START: user=${userId} product=${productId}`);

      const data = await cartService.removeItem(userId, productId);

      console.log(`✅ REMOVE ITEM SUCCESS: user=${userId} items=${data.items?.length ?? 'n/a'} total=${data.total ?? 'n/a'}`);
      res.json({ success: true, data });
    } catch (err) {
      console.error(`❌ REMOVE ITEM FAILED: ${err.message}`);
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
      const userId = getUserId(req);
      console.log(`🔁 UPDATE QTY START: user=${userId} product=${productId} qty=${quantity}`);

      const data = await cartService.updateQuantity(userId, productId, quantity);

      console.log(`✅ UPDATE QTY SUCCESS: user=${userId} items=${data.items?.length ?? 'n/a'} total=${data.total ?? 'n/a'}`);
      res.json({ success: true, data });
    } catch (err) {
      console.error(`❌ UPDATE QTY FAILED: ${err.message}`);
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
      const userId = getUserId(req);
      console.log(`🎟️  APPLY COUPON START: user=${userId} code=${couponCode}`);

      const data = await cartService.applyCoupon(userId, couponCode);

      console.log(`✅ APPLY COUPON SUCCESS: user=${userId} discount=${data.discount ?? 'n/a'} total=${data.total ?? 'n/a'}`);
      res.json({ success: true, data });
    } catch (err) {
      console.error(`❌ APPLY COUPON FAILED: ${err.message}`);
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
      return res.status(200).json(credentials);
    } catch (err) {
      console.error('❌ SignalR negotiation failed:', err.message);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // ── Link physical cart to this user's SignalR group ───────────────────────
  async linkCart(req, res) {
    try {
      const { cartId, connectionId } = req.body;

      if (!cartId) {
        return res.status(400).json({ success: false, message: 'cartId is required' });
      }
      if (!connectionId) {
        return res.status(400).json({ success: false, message: 'connectionId is required' });
      }

      const oid = getUserId(req);
      console.log(`🔗 Linking cart ${cartId} for user ${oid}`);
      console.log(`🔌 SignalR connectionId: ${connectionId}`);

      // 1. Resolve Azure OID → MongoDB user
      const user = await User.findOne({ azureId: oid }).lean();
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // 2. Find or create active cart for this user
      let cart = await cartRepository.findActiveByUserId(user._id);
      if (!cart) {
        cart = await cartRepository.create({
          userId: user._id,
          items: [],
          subtotal: 0,
          discount: 0,
          total: 0,
        });
      }

      // 3. Stamp cartId (physical cart QR) onto the MongoDB cart document
      await cartRepository.updateById(cart._id, { physicalCartId: cartId });

      // 4. Add Flutter client's WebSocket connection to SignalR group
      const groupName = `cart-${cartId}`;
      await addUserToGroup(connectionId, groupName);

      console.log(`✅ Connection ${connectionId} added to group ${groupName}`);

      // 5. Return initial cart state to Flutter
      return res.status(200).json({
        success:   true,
        cartId,
        groupName,
        cart,             // ← initial cart state Flutter loads immediately
      });
    } catch (err) {
      console.error('❌ Cart linking failed:', err.message);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // ── Unlink cart after checkout — cleans up SignalR + Mongo state ──────────
  async unlinkCart(req, res) {
    try {
      const { cartId, connectionId } = req.body;

      if (!cartId) {
        return res.status(400).json({ success: false, message: 'cartId is required' });
      }
      if (!connectionId) {
        return res.status(400).json({ success: false, message: 'connectionId is required' });
      }

      const oid = getUserId(req);
      console.log(`🔓 Unlinking cart ${cartId} for user ${oid}`);

      // 1. Resolve Azure OID → MongoDB user
      const user = await User.findOne({ azureId: oid }).lean();
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // 2. Find the active cart and clear its physical cart binding
      const cart = await cartRepository.findActiveByUserId(user._id);
      if (cart) {
        await cartRepository.updateById(cart._id, { physicalCartId: null });
        console.log(`✅ Cleared physicalCartId on cart ${cart._id}`);
      }

      // 3. Remove this connection from the SignalR group
      const groupName = `cart-${cartId}`;
      await removeUserFromGroup(connectionId, groupName);
      console.log(`✅ Connection ${connectionId} removed from group ${groupName}`);

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('❌ Cart unlinking failed:', err.message);
      // Non-fatal — don't block the user on cleanup failure
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // ── Jetson hardware pushes cart changes here (no auth) ────────────────────
  async updateCart(req, res) {
    try {
      const { cartId, items, total } = req.body;

      if (!cartId) {
        return res.status(400).json({ success: false, message: 'cartId is required' });
      }

      const groupName = `cart-${cartId}`;
      console.log(`📡 Broadcasting CartUpdated to group: ${groupName}`);

      await broadcastCartUpdate(groupName, { cartId, items, total });

      console.log(`✅ Broadcast sent to ${groupName}`);
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('❌ Cart update broadcast failed:', err.message);
      return res.status(500).json({ success: false, message: err.message });
    }
  },
};

export default cartController;