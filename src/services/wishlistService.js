import wishlistRepository from '../repositories/wishlistRepository.js';
import User from '../models/User.js';

// Resolve Azure OID → internal MongoDB _id
// (Same pattern used in cartService.js and orderService.js)
async function resolveUserId(oid) {
  const user = await User.findOne({ azureId: oid }).lean();
  if (!user) throw new Error(`No user found for Azure OID: ${oid}. Please register first.`);
  return user._id;
}

const wishlistService = {
  async getByOid(oid) {
    const userId = await resolveUserId(oid);
    return wishlistRepository.findByUserId(userId);
  },

  async addItem(oid, { productId, name, price, imageUrl, unit, category }) {
    const userId = await resolveUserId(oid);

    const item = await wishlistRepository.upsert(userId, productId, {
      name,
      price,
      imageUrl: imageUrl ?? null,
      unit:     unit     ?? '',
      category: category ?? '',
    });

    return item;
  },

  async removeItem(oid, wishlistItemId) {
    const userId = await resolveUserId(oid);
    const deleted = await wishlistRepository.deleteByIdForUser(wishlistItemId, userId);
    if (!deleted) throw new Error('Item not found');
    return deleted;
  },

  // Used by userService.getProfile to replace the previously hardcoded
  // wishlistCount: 0 (Known Issue #7)
  async countByOid(oid) {
    const userId = await resolveUserId(oid);
    return wishlistRepository.countByUserId(userId);
  },
};

export default wishlistService;