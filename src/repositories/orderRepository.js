import Order from '../models/Order.js';

const orderRepository = {
  async findByUserId(userId)        { return Order.find({ userId }).sort({ createdAt: -1 }).lean(); },
  async findByOrderId(orderId)      { return Order.findOne({ orderId }).lean(); },
  async findById(id)                { return Order.findById(id).lean(); },
  async create(data)                { return new Order(data).save(); },
};

export default orderRepository;