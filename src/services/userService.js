import bcrypt          from 'bcryptjs';
import jwt             from 'jsonwebtoken';
import userRepository  from '../repositories/userRepository.js';
import Order           from '../models/Order.js';

const JWT_SECRET  = process.env.JWT_SECRET     || 'magcoff_secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '7d';
const SALT        = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);

const sign = (id) => jwt.sign({ id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

const tierFor = (points) => {
  if (points >= 500) return 'Gold Member';
  if (points >= 200) return 'Silver Member';
  return 'Member';
};

// Resolve Azure OID → full User document
async function resolveUserByOid(oid) {
  const user = await userRepository.findByAzureId(oid);
  if (!user) throw new Error(`No user found for Azure OID: ${oid}. Please register first.`);
  return user;
}

const userService = {
  // ── Deprecated ────────────────────────────────────────────────────────────
  async register(phone, name, email, password) {
    if (await userRepository.existsByPhone(phone))
      throw new Error('Phone number already registered');
    const hashed = await bcrypt.hash(password, SALT);
    const user   = await userRepository.create({
      phone, name, email, password: hashed, createdAt: new Date(),
    });
    const plain = user.toObject ? user.toObject() : { ...user };
    delete plain.password;
    return { user: plain, token: sign(plain._id) };
  },

  async login(phone, password) {
    const user = await userRepository.findByPhone(phone);
    if (!user) throw new Error('Invalid phone number or password');
    const ok = await bcrypt.compare(password, user.password);
    if (!ok)  throw new Error('Invalid phone number or password');
    const { password: _pw, ...safe } = user;
    return { user: safe, token: sign(safe._id) };
  },

  // ── GET /users/profile ────────────────────────────────────────────────────
  async getProfile(oid) {
    // Look up by azureId, not _id
    const user = await resolveUserByOid(oid);

    // Order stats — query directly by internal _id
    const orderAgg = await Order.aggregate([
      { $match: { userId: user._id } },
      { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$total' } } },
    ]);

    const orderCount = orderAgg[0]?.count     ?? 0;
    const totalSpent = orderAgg[0]?.total     ?? 0;

    const points = Math.floor(totalSpent / 10);
    const tier   = tierFor(points);

    const { password: _pw, ...safe } = user;

    return {
      ...safe,
      orderCount,
      totalSpent:   Math.round(totalSpent * 100) / 100,
      points,
      tier,
      wishlistCount: 0,   // placeholder until wishlist collection exists
    };
  },

  // ── POST /users/register-social ───────────────────────────────────────────
  // Upsert: create user if not exists, return existing if already registered.
  async registerOrGetSocial({ azureId, name, email, phone }) {
    let user = await userRepository.findByAzureId(azureId);
    if (user) return user;

    user = await userRepository.create({
      azureId,
      name,
      email:  email  || '',
      phone:  phone  || '',
    });

    return user;
  },
};

export default userService;