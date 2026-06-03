import cartRepository    from '../repositories/cartRepository.js';
import productRepository from '../repositories/productRepository.js';
import User              from '../models/User.js';

// Resolve Azure OID → internal MongoDB _id
async function resolveUserId(oid) {
  const user = await User.findOne({ azureId: oid }).lean();
  if (!user) throw new Error(`No user found for Azure OID: ${oid}. Please register first.`);
  return user._id;
}

function computeTotals(items, discount = 0) {
  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const total    = Math.max(0, subtotal - discount);
  return { subtotal, total };
}

const cartService = {
  async getCart(oid) {
    const userId = await resolveUserId(oid);
    let cart = await cartRepository.findActiveByUserId(userId);
    if (!cart) {
      cart = await cartRepository.create({
        userId, items: [], subtotal: 0, discount: 0, total: 0,
      });
    }
    return cart;
  },

  async addItem(oid, productId, quantity = 1) {
    const userId  = await resolveUserId(oid);
    const product = await productRepository.findById(productId);
    if (!product) throw new Error('Product not found');

    let cart = await cartRepository.findActiveByUserId(userId);
    if (!cart) {
      cart = await cartRepository.create({
        userId, items: [], subtotal: 0, discount: 0, total: 0,
      });
    }

    const idx = cart.items.findIndex(
      i => i.productId.toString() === productId,
    );
    if (idx > -1) {
      cart.items[idx].quantity  += quantity;
      cart.items[idx].lineTotal  = cart.items[idx].price * cart.items[idx].quantity;
    } else {
      cart.items.push({
        productId: product._id,
        name:      product.name,
        price:     product.price,
        imageUrl:  product.imageUrl || null,
        quantity,
        lineTotal: product.price * quantity,
      });
    }

    const { subtotal, total } = computeTotals(cart.items, cart.discount || 0);
    return cartRepository.updateById(cart._id, { items: cart.items, subtotal, total });
  },

  async removeItem(oid, productId) {
    const userId = await resolveUserId(oid);
    const cart   = await cartRepository.findActiveByUserId(userId);
    if (!cart) throw new Error('No active cart found');

    const items = cart.items.filter(
      i => i.productId.toString() !== productId,
    );
    const { subtotal, total } = computeTotals(items, cart.discount || 0);
    return cartRepository.updateById(cart._id, { items, subtotal, total });
  },

  async updateQuantity(oid, productId, quantity) {
    if (quantity < 1) return cartService.removeItem(oid, productId);

    const userId = await resolveUserId(oid);
    const cart   = await cartRepository.findActiveByUserId(userId);
    if (!cart) throw new Error('No active cart found');

    const item = cart.items.find(i => i.productId.toString() === productId);
    if (!item) throw new Error('Item not found in cart');

    item.quantity  = quantity;
    item.lineTotal = item.price * quantity;

    const { subtotal, total } = computeTotals(cart.items, cart.discount || 0);
    return cartRepository.updateById(cart._id, { items: cart.items, subtotal, total });
  },

  async applyCoupon(oid, couponCode) {
    const userId = await resolveUserId(oid);
    const cart   = await cartRepository.findActiveByUserId(userId);
    if (!cart) throw new Error('No active cart found');

    const discount = Math.floor(cart.subtotal * 0.10);
    const total    = Math.max(0, cart.subtotal - discount);
    return cartRepository.updateById(cart._id, {
      couponCode: couponCode.toUpperCase(), discount, total,
    });
  },

  async clearCart(cartId) {
    return cartRepository.markCheckedOut(cartId);
  },
};

export default cartService;