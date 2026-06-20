import userRepository from '../repositories/userRepository.js';
import wishlistService from './wishlistService.js';

const tierFor = (points) => {
  if (points >= 500) return 'Gold Member';
  if (points >= 200) return 'Silver Member';
  return 'Member';
};

async function resolveUserByOid(oid) {
  const user = await userRepository.findByAzureId(oid);

  if (!user) {
    throw new Error(
      `No user found for Azure OID: ${oid}. Please register first.`
    );
  }

  return user;
}

const userService = {
  async getProfile(oid) {
    console.log('👤 GET PROFILE START');
    console.log('OID:', oid);

    const user = await resolveUserByOid(oid);

    console.log('✅ USER FOUND:', user._id);

    // Known Issue #7 fix: previously this method ran its own inline
    // Order.aggregate([...]) that matched BOTH string and ObjectId forms
    // of userId, duplicating logic that already existed (and was more
    // consistent) in userRepository.getOrderStats. Reusing the repository
    // method removes the duplication and the now-unnecessary direct
    // `Order` model import from this service.
    console.log('📦 ORDER STATS START');
    const { orderCount, totalSpent } = await userRepository.getOrderStats(user._id);
    console.log('📦 ORDER STATS END');

    const points = Math.floor(totalSpent / 10);
    const tier = tierFor(points);

    // Known Issue #7 fix: wishlistCount was previously hardcoded to 0 and
    // never queried the shopping_lists collection at all. It now reflects
    // the user's real wishlist size via wishlistService, which itself
    // resolves the same Azure OID → internal _id mapping used everywhere
    // else in this codebase.
    console.log('❤️  WISHLIST COUNT START');
    const wishlistCount = await wishlistService.countByOid(oid);
    console.log('❤️  WISHLIST COUNT END');

    console.log('✅ PROFILE COMPLETE');

    return {
      _id: user._id,
      name: user.name,
      phone: user.phone ?? '',
      email: user.email ?? '',
      azureId: user.azureId,
      orderCount,
      totalSpent: Math.round(totalSpent * 100) / 100,
      points,
      tier,
      wishlistCount,
    };
  },

  async registerOrGetSocial({ azureId, name, email, phone }) {
    let user = await userRepository.findByAzureId(azureId);

    if (user) {
      return user;
    }

    user = await userRepository.create({
      azureId,
      name,
      email: email || '',
      phone: phone || '',
    });

    return user;
  },
};

export default userService;