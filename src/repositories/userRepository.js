import User  from '../models/User.js';
import Order from '../models/Order.js';

const userRepository = {
  async findById(id)      { return User.findById(id).lean(); },
  async findByPhone(phone){ return User.findOne({ phone }).select('+password').lean(); },
  async findByAzureId(oid){ return User.findOne({ azureId: oid }).lean(); },
  async existsByPhone(phone){ return !!(await User.findOne({ phone }).lean()); },

  async create(data)      { return (await new User(data).save()).toObject(); },

  async getOrderStats(userId) {
    const agg = await Order.aggregate([
      { $match: { userId } },
      { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$total' } } },
    ]);
    return {
      orderCount: agg[0]?.count ?? 0,
      totalSpent: agg[0]?.total ?? 0,
    };
  },
};

export default userRepository;