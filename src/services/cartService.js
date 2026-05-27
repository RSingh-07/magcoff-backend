import cartRepository    from '../repositories/cartRepository.js';
import productRepository from '../repositories/productRepository.js';

// Recompute subtotal and total from items
function computeTotals(items, discount = 0) {
  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const total    = Math.max(0, subtotal - discount);
  return { subtotal, total };
}

const cartService = {
  // Get active cart — auto-create if none exists
  async getCart(userId) {
    let cart = await cartRepository.findActiveByUserId(userId);
    if (!cart) {
      cart = await cartRepository.create({ userId, items: [], subtotal: 0, discount: 0, total: 0 });
    }
    return cart;
  },

  // Add item to cart
  async addItem(userId, productId, quantity = 1) {
    const product = await productRepository.findById(productId);
    if (!product) throw new Error('Product not found');

    let cart = await cartRepository.findActiveByUserId(userId);
    if (!cart) cart = await cartRepository.create({ userId, items: [], subtotal: 0, discount: 0, total: 0 });

    // If product already in cart — increment quantity
    const idx = cart.items.findIndex(i => i.productId.toString() === productId);
    if (idx > -1) {
      cart.items[idx].quantity  += quantity;
      cart.items[idx].lineTotal  = cart.items[idx].price * cart.items[idx].quantity;
    } else {
      // Add new line item
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

  // Remove item from cart entirely
  async removeItem(userId, productId) {
    const cart = await cartRepository.findActiveByUserId(userId);
    if (!cart) throw new Error('No active cart found');
    const items = cart.items.filter(i => i.productId.toString() !== productId);
    const { subtotal, total } = computeTotals(items, cart.discount || 0);
    return cartRepository.updateById(cart._id, { items, subtotal, total });
  },

  // Update quantity of a specific item
  async updateQuantity(userId, productId, quantity) {
    if (quantity < 1) return cartService.removeItem(userId, productId);
    const cart = await cartRepository.findActiveByUserId(userId);
    if (!cart) throw new Error('No active cart found');
    const item = cart.items.find(i => i.productId.toString() === productId);
    if (!item) throw new Error('Item not found in cart');
    item.quantity  = quantity;
    item.lineTotal = item.price * quantity;
    const { subtotal, total } = computeTotals(cart.items, cart.discount || 0);
    return cartRepository.updateById(cart._id, { items: cart.items, subtotal, total });
  },

  // Apply coupon — MVP: flat 10% off
  async applyCoupon(userId, couponCode) {
    const cart = await cartRepository.findActiveByUserId(userId);
    if (!cart) throw new Error('No active cart found');
    const discount = Math.floor(cart.subtotal * 0.10);
    const total    = Math.max(0, cart.subtotal - discount);
    return cartRepository.updateById(cart._id, { couponCode: couponCode.toUpperCase(), discount, total });
  },

  // Mark cart as checked out after order is placed
  async clearCart(cartId) {
    return cartRepository.markCheckedOut(cartId);
  },
};

export default cartService;