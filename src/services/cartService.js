import cartRepository    from '../repositories/cartRepository.js';
import productRepository from '../repositories/productRepository.js';
import couponRepository  from '../repositories/couponRepository.js';
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

// Known Issue #4 fix: previously quantity was coerced with
// `Number(quantity) || 1`, which falls back to 1 for 0/NaN/undefined but
// lets negative numbers (e.g. -5) pass through unmodified, corrupting
// subtotal/total math. This helper enforces a strictly positive integer.
function parsePositiveQuantity(quantity, fieldLabel = 'quantity') {
  const n = Number(quantity);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
    throw new Error(`${fieldLabel} must be a positive whole number`);
  }
  return n;
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
    const qty     = parsePositiveQuantity(quantity, 'quantity');
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
      cart.items[idx].quantity  += qty;
      cart.items[idx].lineTotal  = cart.items[idx].price * cart.items[idx].quantity;
    } else {
      cart.items.push({
        productId: product._id,
        name:      product.name,
        price:     product.price,
        imageUrl:  product.imageUrl || null,
        quantity:  qty,
        lineTotal: product.price * qty,
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
    // Known Issue #4 fix: 0 (and below) still means "remove the item" —
    // that part of the original behavior was intentional and is preserved.
    // What's fixed is that non-numeric/garbage input no longer silently
    // falls through; it's explicitly validated as a number first.
    const numericQuantity = Number(quantity);
    if (!Number.isFinite(numericQuantity)) {
      throw new Error('quantity must be a valid number');
    }
    if (numericQuantity < 1) return cartService.removeItem(oid, productId);

    const qty = parsePositiveQuantity(numericQuantity, 'quantity');

    const userId = await resolveUserId(oid);
    const cart   = await cartRepository.findActiveByUserId(userId);
    if (!cart) throw new Error('No active cart found');

    const item = cart.items.find(i => i.productId.toString() === productId);
    if (!item) throw new Error('Item not found in cart');

    item.quantity  = qty;
    item.lineTotal = item.price * qty;

    const { subtotal, total } = computeTotals(cart.items, cart.discount || 0);
    return cartRepository.updateById(cart._id, { items: cart.items, subtotal, total });
  },

  // Known Issue #5 fix: previously ANY non-empty string was accepted as a
  // "valid" coupon and unconditionally applied a flat 10% discount, with no
  // coupon table, expiry, eligibility, or usage checks. This now validates
  // against the real Coupon collection (see models/Coupon.js):
  //  - code must exist and be active
  //  - code must not be expired
  //  - cart subtotal must meet the coupon's minimum order value
  async applyCoupon(oid, couponCode) {
    const userId = await resolveUserId(oid);
    const cart   = await cartRepository.findActiveByUserId(userId);
    if (!cart) throw new Error('No active cart found');

    const coupon = await couponRepository.findActiveByCode(couponCode);
    if (!coupon) throw new Error('Invalid or inactive coupon code');

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      throw new Error('This coupon has expired');
    }

    if (cart.subtotal < coupon.minOrderValue) {
      throw new Error(
        `This coupon requires a minimum order value of ${coupon.minOrderValue}`
      );
    }

    const discount = Math.floor(cart.subtotal * (coupon.discountPercent / 100));
    const total    = Math.max(0, cart.subtotal - discount);

    return cartRepository.updateById(cart._id, {
      couponCode: coupon.code, discount, total,
    });
  },

  async clearCart(cartId) {
    return cartRepository.markCheckedOut(cartId);
  },
};

export default cartService;