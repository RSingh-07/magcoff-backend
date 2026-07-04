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

    console.log('📦 ORDER STATS START');
    const { orderCount, totalSpent } = await userRepository.getOrderStats(user._id);
    console.log('📦 ORDER STATS END');

    const points = Math.floor(totalSpent / 10);
    const tier = tierFor(points);

    console.log('❤️  WISHLIST COUNT START');
    const wishlistCount = await wishlistService.countByOid(oid);
    console.log('❤️  WISHLIST COUNT END');

    console.log('✅ PROFILE COMPLETE');

    return {
      _id: user._id,
      name: user.name,
      phone: user.phone ?? '',
      email: user.email ?? '',
      // BUG FIX: `_id` IS the Azure oid on this schema — there is no
      // separate `azureId` field, so reading user.azureId was always
      // returning undefined.
      azureId: user._id,
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

    // BUG FIX: schema requires `_id` (String) — the field is named `_id`,
    // not `azureId`. Passing `azureId` alone left `_id` undefined and
    // triggered "Path `_id` is required." on save().
    user = await userRepository.create({
      _id: azureId,
      name,
      email: email || '',
      phone: phone || '',
    });

    return user;
  },
};

export default userService;