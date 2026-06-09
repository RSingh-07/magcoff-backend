import Order from '../models/Order.js';
import { resolveUserId } from '../utils/resolveUserId.js';

const orderRepository = {
  async findByUserId(oid) {
    const userId = await resolveUserId(oid);   // OID → MongoDB ObjectId
    return Order.find({ userId }).sort({ createdAt: -1 }).lean();
  },

  async findByOrderId(orderId) {
    return Order.findOne({ orderId }).lean();
  },

  async findById(id) {
    return Order.findById(id).lean();
  },

  async create(data) {
    return new Order(data).save();
  },
};

export default orderRepository;