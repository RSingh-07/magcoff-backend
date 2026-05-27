import User  from '../models/User.js';
import Order from '../models/Order.js';

const userRepository = {
  async findByPhone(phone)   { return User.findOne({ phone }).select('+password').lean(); },
  async findById(id)         { return User.findById(id).lean(); },
  async create(data)         { return new User(data).save(); },
  async existsByPhone(phone) { return User.exists({ phone }); },

  // Pull order stats needed for profile screen
  async getOrderStats(userId) {
    const orders = await Order.find({ userId }).lean();
    const orderCount = orders.length;
    const totalSpent = orders.reduce((sum, o) => sum + (o.total ?? 0), 0);
    return { orderCount, totalSpent };
  },
};

export default userRepository;