import orderRepository from '../repositories/orderRepository.js';
import cartRepository  from '../repositories/cartRepository.js';
import User            from '../models/User.js';
import Counter         from '../models/Counter.js';

// Resolve Azure OID → internal MongoDB _id
async function resolveUserId(oid) {
  const user = await User.findOne({ azureId: oid }).lean();
  if (!user) throw new Error(`No user found for Azure OID: ${oid}. Please register first.`);
  return user._id;
}

// Known Issue #6 fix: previously generateOrderId() used
// `Math.floor(Math.random() * 999) + 1` for the sequence portion, which is
// NOT a real incrementing counter and can collide on high-volume days
// against the `unique: true` index on Order.orderId. This now atomically
// increments a per-day counter document, guaranteeing a unique, ordered
// sequence number for each day (MGC<YYMMDD><seq>, seq zero-padded to 3
// digits, wrapping is extremely unlikely but if more than 999 orders occur
// in a single day the sequence simply continues beyond 3 digits rather than
// colliding).
async function generateOrderId() {
  const now = new Date();
  const ymd = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const counterKey = `order-seq-${ymd}`;

  const counter = await Counter.findOneAndUpdate(
    { key: counterKey },
    { $inc: { value: 1 } },
    { upsert: true, new: true }
  ).lean();

  const seq = String(counter.value).padStart(3, '0');
  return `MGC${ymd}${seq}`;
}

const MAX_ORDER_ID_RETRIES = 3;

const orderService = {
  async placeOrder(oid, paymentMethod, transactionId = null) {
    const userId = await resolveUserId(oid);
    const cart   = await cartRepository.findActiveByUserId(userId);
    if (!cart)              throw new Error('No active cart to checkout');
    if (!cart.items.length) throw new Error('Cart is empty');

    const lines = cart.items.map(i => ({
      productId: i.productId,
      name:      i.name,
      imageUrl:  i.imageUrl || null,
      quantity:  i.quantity,
      unitPrice: i.price,
      lineTotal: i.lineTotal,
    }));

    let order;
    let lastErr;

    // Defense in depth: the atomic counter above should make collisions
    // effectively impossible, but if a duplicate orderId is ever produced
    // for any reason (e.g. counter document manually reset), retry with a
    // freshly generated id instead of failing the whole checkout outright.
    for (let attempt = 0; attempt < MAX_ORDER_ID_RETRIES; attempt += 1) {
      try {
        const orderId = await generateOrderId();
        order = await orderRepository.create({
          orderId,
          userId,
          cartId:        cart._id,
          lines,
          subtotal:      cart.subtotal,
          discount:      cart.discount  || 0,
          total:         cart.total,
          couponCode:    cart.couponCode || null,
          paymentMethod,
          paymentStatus: transactionId ? 'success' : 'pending',
          transactionId: transactionId  || null,
          status:        transactionId  ? 'completed' : 'pending',
        });
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
        // Mongo duplicate key error code
        if (err.code !== 11000) throw err;
      }
    }

    if (lastErr) throw lastErr;

    await cartRepository.markCheckedOut(cart._id);
    return order;
  },

  async getByUserId(oid) {
    const userId = await resolveUserId(oid);
    return orderRepository.findByUserId(userId);
  },

  async getByOrderId(orderId) {
    const order = await orderRepository.findByOrderId(orderId);
    if (!order) throw new Error(`Order not found: ${orderId}`);
    return order;
  },
};

export default orderService;