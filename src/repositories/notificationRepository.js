import DeviceToken from '../models/deviceToken.js';

const notificationRepository = {
  async upsertToken(userId, token, platform) {
    return DeviceToken.findOneAndUpdate(
      { token },
      {
        userId,
        platform,
        enabled: true,
        lastSeen: new Date(),
      },
      { upsert: true, new: true }
    ).lean();
  },

  async disableToken(token) {
    // findOneAndUpdate returns the document as it was BEFORE the update
    // unless { new: true } is passed. We want to know whether a document
    // existed at all (Known Issue #8), so we pass { new: true } and check
    // the result for null/non-null in the service layer.
    return DeviceToken.findOneAndUpdate(
      { token },
      { enabled: false },
      { new: true }
    ).lean();
  },

  async findEnabledByUserId(userId) {
    return DeviceToken.find({ userId, enabled: true })
      .select('token platform lastSeen')
      .lean();
  },
};

export default notificationRepository;