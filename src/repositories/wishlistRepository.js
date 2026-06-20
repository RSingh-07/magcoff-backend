import WishlistItem from '../models/WishlistItem.js';

const wishlistRepository = {
  async findByUserId(userId) {
    return WishlistItem.find({ userId }).sort({ createdAt: -1 }).lean();
  },

  async findOne(userId, productId) {
    return WishlistItem.findOne({ userId, productId }).lean();
  },

  async upsert(userId, productId, data) {
    return WishlistItem.findOneAndUpdate(
      { userId, productId },
      { userId, productId, ...data },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
  },

  async deleteByIdForUser(id, userId) {
    return WishlistItem.findOneAndDelete({ _id: id, userId }).lean();
  },

  async countByUserId(userId) {
    return WishlistItem.countDocuments({ userId });
  },
};

export default wishlistRepository;