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
  // BUG FIX (2nd pass): the first version of this function created the new
  // document BEFORE deleting the old one. Since both documents briefly held
  // the same `phone` value at that instant, the unique index on `phone`
  // rejected the insert — the exact same E11000 error, just one step later.
  // This now performs delete-then-insert inside a single transaction, so
  // there is never a moment where two User documents share a phone number,
  // and if anything fails partway, the whole migration rolls back instead
  // of leaving the account half-migrated or lost.
  //
  // BUG FIX (3rd pass): previously this spread the OLD document's fields
  // (`...rest`) onto the new one unchanged, which meant a user re-authenticating
  // with a different email (e.g. after switching Microsoft/Google accounts,
  // or picking a different account via Prompt.selectAccount) would keep
  // seeing their original email forever — the migration preserved identity
  // continuity (orders/cart/wishlist) but silently discarded the fresh
  // claims from the new token. `updatedFields` now lets the caller pass the
  // latest name/email from the token so they win over the stale stored
  // values, while everything else (points, address, preferences, etc.)
  // still carries over from the old document.
  async reassignUserId(oldId, newId, updatedFields = {}) {
    const oldUser = await User.findById(oldId).lean();
    if (!oldUser) return null;

    const { _id, ...rest } = oldUser;
    const merged = { ...rest, ...updatedFields };

    const session = await User.startSession();
    try {
      let newUser;

      await session.withTransaction(async () => {
        await User.deleteOne({ _id: oldId }).session(session);

        const created = await User.create([{ _id: newId, ...merged }], { session });
        newUser = created[0];

        await Order.updateMany(
          { userId: oldId },
          { $set: { userId: newId } }
        ).session(session);

        await Cart.updateMany(
          { userId: oldId },
          { $set: { userId: newId } }
        ).session(session);

        await WishlistItem.updateMany(
          { userId: oldId },
          { $set: { userId: newId } }
        ).session(session);
      });

      return newUser.toObject();
    } finally {
      await session.endSession();
    }
  },

  // NEW: lets a user update their own email/name/phone in place, without
  // going through the OID-reassignment path (used by the account "Edit
  // profile" screen — no identity change involved, just editing fields).
  async updateProfileFields(id, fields) {
    const allowed = {};
    if (typeof fields.name === 'string') allowed.name = fields.name.trim();
    if (typeof fields.phone === 'string') allowed.phone = fields.phone.trim();
    if (typeof fields.email === 'string') allowed.email = fields.email.trim().toLowerCase();

    return User.findByIdAndUpdate(
      id,
      { $set: allowed },
      { new: true, runValidators: true }
    ).lean();
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