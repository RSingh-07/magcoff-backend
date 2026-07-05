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

    try {
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
    } catch (err) {
      // FIX: `phone` has a unique index. If it collides here, this phone
      // number already belongs to an existing user document under a
      // *different* Azure OID — most likely the same person re-authenticating
      // via a login flow that issues a fresh OID each time (seen with the
      // mail/OTP CIAM provider), not a genuinely new user. Instead of
      // failing registration forever, migrate the existing account onto the
      // new OID so the person's order history, cart, and wishlist survive.
      if (err.code === 11000 && err.keyPattern?.phone) {
        console.warn(
          `⚠️ Phone ${phone} already registered under a different OID — reassigning to ${azureId}`
        );

        const existing = await userRepository.findByPhone(phone);
        if (!existing) throw err; // shouldn't happen, but don't swallow silently

        // BUG FIX: previously reassignUserId only carried over the OLD
        // document's fields, so a re-login with a different email (e.g.
        // after switching Microsoft/Google accounts) kept showing the
        // original email forever. Pass the FRESH claims from this token
        // through so they win over the stale stored values.
        const migrated = await userRepository.reassignUserId(
          existing._id,
          azureId,
          { name, email }
        );
        if (!migrated) throw err;

        console.log(`✅ Migrated user ${existing._id} → ${azureId}`);
        return migrated;
      }

      throw err;
    }
  },

  // NEW: lets the account screen edit name/phone/email directly, without
  // needing a fresh Azure login/OID change. Use this for a simple "edit
  // profile" flow; use the Azure re-login + reassignUserId path above when
  // the identity itself (the signed-in Microsoft/Google account) changes.
  async updateProfile(oid, { name, phone, email }) {
    await resolveUserByOid(oid); // throws if the user doesn't exist

    const updated = await userRepository.updateProfileFields(oid, {
      name,
      phone,
      email,
    });

    if (!updated) {
      throw new Error(`Failed to update profile for OID: ${oid}`);
    }

    return {
      _id: updated._id,
      name: updated.name,
      phone: updated.phone ?? '',
      email: updated.email ?? '',
    };
  },
};

export default userService;