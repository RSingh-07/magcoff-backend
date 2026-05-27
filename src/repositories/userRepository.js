import User  from '../models/User.js';
import Order from '../models/Order.js';
import mongoose from 'mongoose';

const userRepository = {

  async findByPhone(phone) {
    return User.findOne({ phone }).select('+password').lean();
  },

  // Finds by MongoDB _id OR azureId (for Entra/B2C users)
  async findById(id) {
    // Try azureId first (Entra users have GUID, not MongoDB ObjectId)
    const byAzureId = await User.findOne({ azureId: id }).lean();
    if (byAzureId) return byAzureId;

    // Try MongoDB _id (legacy phone-based users)
    try {
      if (mongoose.Types.ObjectId.isValid(id)) {
        const byMongoId = await User.findById(id).lean();
        if (byMongoId) return byMongoId;
      }
    } catch (_) {}

    return null;
  },

  async findByAzureId(azureId) {
    return User.findOne({ azureId }).lean();
  },

  async create(data) {
    return new User(data).save();
  },

  async existsByPhone(phone) {
    return User.exists({ phone });
  },

  // Pull order stats needed for profile screen
  async getOrderStats(userId) {
    // Search orders by both userId formats
    const query = mongoose.Types.ObjectId.isValid(userId)
      ? { $or: [{ userId }, { azureId: userId }] }
      : { azureId: userId };

    const orders = await Order.find(query).lean();
    const orderCount = orders.length;
    const totalSpent = orders.reduce((sum, o) => sum + (o.total ?? 0), 0);
    return { orderCount, totalSpent };
  },
};

export default userRepository;