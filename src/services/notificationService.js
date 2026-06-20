import notificationRepository from '../repositories/notificationRepository.js';
import User from '../models/User.js';

// Resolve Azure OID → internal MongoDB _id
// (Same pattern used in cartService.js, orderService.js, wishlistService.js)
async function resolveUserId(oid) {
  const user = await User.findOne({ azureId: oid }).lean();
  if (!user) throw new Error(`No user found for Azure OID: ${oid}. Please register first.`);
  return user._id;
}

const notificationService = {
  async registerToken(oid, token, platform) {
    const userId = await resolveUserId(oid);
    return notificationRepository.upsertToken(userId, token, platform);
  },

  async unregisterToken(token) {
    const updated = await notificationRepository.disableToken(token);
    // Known Issue #8 fix: previously the route handler never checked
    // whether a matching document existed and always reported success.
    // Now we surface that information so the controller can respond
    // accurately (still treated as a success response either way, per
    // the original idempotent intent, but now distinguishable for logging
    // / future use rather than silently swallowed).
    return { found: !!updated, token: updated?.token ?? token };
  },

  async getTokensByOid(oid) {
    const userId = await resolveUserId(oid);
    return notificationRepository.findEnabledByUserId(userId);
  },
};

export default notificationService;