import bcrypt from 'bcryptjs';
import jwt    from 'jsonwebtoken';
import userRepository from '../repositories/userRepository.js';

const JWT_SECRET  = process.env.JWT_SECRET      || 'magcoff_secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN  || '7d';
const SALT        = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);

const sign = (id) => jwt.sign({ id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

// Derive loyalty tier from points
const tierFor = (points) => {
  if (points >= 500) return 'Gold Member';
  if (points >= 200) return 'Silver Member';
  return 'Member';
};

const userService = {
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

  // GET /users/:userId/profile
  // Returns user fields + computed order stats + loyalty info
  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new Error('User not found');

    const { orderCount, totalSpent } = await userRepository.getOrderStats(userId);

    // 1 point per ₹10 spent, rounded down
    const points = Math.floor(totalSpent / 10);
    const tier   = tierFor(points);

    // Strip password just in case (findById doesn't select it, but be safe)
    const { password: _pw, ...safe } = user;

    return {
      ...safe,
      orderCount,
      totalSpent: Math.round(totalSpent * 100) / 100,  // 2dp
      points,
      tier,
      wishlistCount: 0,  // placeholder until wishlist collection exists
    };
  },
};

export default userService;