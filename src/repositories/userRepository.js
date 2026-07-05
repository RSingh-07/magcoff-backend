import User from '../models/User.js';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import WishlistItem from '../models/WishlistItem.js';

const userRepository = {
  async findById(id) {
    return User.findById(id).lean();
  },

  async findByPhone(phone) {
    return User.findOne({ phone })
      .select('+password')
      .lean();
  },

  // BUG FIX: User schema's primary key is `_id` (the Azure oid/sub), not a
  // separate `azureId` field — that field doesn't exist on the schema at all.
  // This previously always queried a non-existent field and always returned
  // null, meaning every existing user lookup silently failed.
  async findByAzureId(oid) {
    console.log('🔍 FIND USER START:', oid);

    const user = await User.findById(oid).lean();

    console.log('🔍 FIND USER END:', user?._id || 'NOT FOUND');

    return user;
  },

  async existsByPhone(phone) {
    return !!(await User.findOne({ phone }).lean());
  },

  async create(data) {
    return (await new User(data).save()).toObject();
  },

  // FIX: handles the case where a person re-authenticates and Azure CIAM
  // issues a *new* OID for the same phone number (their `_id` on this
  // schema). Without this, registerOrGetSocial's create() would hit the
  // unique index on `phone` and throw E11000, permanently blocking
  // registration for a real, already-existing user.
  //
  // This re-keys the User document under the new OID and re-points every
  // collection that stores userId as a foreign key, so order history, cart,
  // and wishlist all survive the OID change instead of being orphaned under
  // the old, now-unreachable `_id`.
  async reassignUserId(oldId, newId) {
    const oldUser = await User.findById(oldId).lean();
    if (!oldUser) return null;

    const { _id, ...rest } = oldUser;

    const newUser = await new User({ _id: newId, ...rest }).save();

    await Promise.all([
      Order.updateMany({ userId: oldId }, { $set: { userId: newId } }),
      Cart.updateMany({ userId: oldId }, { $set: { userId: newId } }),
      WishlistItem.updateMany({ userId: oldId }, { $set: { userId: newId } }),
    ]);

    await User.deleteOne({ _id: oldId });

    return newUser.toObject();
  },

  async getOrderStats(userId) {
    const agg = await Order.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          total: { $sum: '$total' },
        },
      },
    ]);

    return {
      orderCount: agg[0]?.count ?? 0,
      totalSpent: agg[0]?.total ?? 0,
    };
  },
};

export default userRepository;