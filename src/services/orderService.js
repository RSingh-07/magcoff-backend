import orderRepository from '../repositories/orderRepository.js';
import cartRepository  from '../repositories/cartRepository.js';
import User            from '../models/User.js';

// Resolve Azure OID → internal MongoDB _id
async function resolveUserId(oid) {
  const user = await User.findOne({ azureId: oid }).lean();
  if (!user) throw new Error(`No user found for Azure OID: ${oid}. Please register first.`);
  return user._id;
}

function generateOrderId() {
  const now = new Date();
  const ymd = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
  return `MGC${ymd}${seq}`;
}

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

    const order = await orderRepository.create({
      orderId:       generateOrderId(),
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