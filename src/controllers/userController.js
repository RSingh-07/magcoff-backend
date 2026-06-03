// src/controllers/userController.js  (PATCH — replace getProfile only)
//
// GET /api/users/profile
// Returns everything AccountScreen needs in one call.
// userId comes from req.user (JWT) — never from the URL.

import User    from '../models/user.js';
import Order   from '../models/order.js';
import bcrypt  from 'bcryptjs';
import jwt     from 'jsonwebtoken';

// ─────────────────────────────────────────────────────────────
// GET /api/users/profile
// ─────────────────────────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Compute live stats from orders collection
    const orders = await Order.find({ userId }).lean();
    const orderCount = orders.length;
    const totalSpent = orders.reduce((s, o) => s + (o.total ?? 0), 0);

    // Simple tier logic — upgrade as needed
    const tier =
      totalSpent >= 10000 ? 'Gold Member'  :
      totalSpent >=  3000 ? 'Silver Member' :
                            'Member';

    // Points placeholder — replace with loyalty_accounts lookup when ready
    const points = Math.floor(totalSpent / 10); // 1 pt per ₹10

    return res.json({
      success: true,
      user: {
        _id:        user._id,
        name:       user.name,
        phone:      user.phone  ?? '',
        email:      user.email  ?? '',
        tier,
        points,
        orderCount,
        totalSpent,
      },
    });
  } catch (err) {
    console.error('❌ getProfile error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/users/register  (deprecated — kept for reference)
// ─────────────────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { name, phone, password } = req.body;
    if (!name || !phone || !password) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }
    const existing = await User.findOne({ phone });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Phone already registered' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user   = await User.create({ name, phone, password: hashed });
    return res.status(201).json({ success: true, userId: user._id });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/users/login  (deprecated — kept for reference)
// ─────────────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { phone, password } = req.body;
    const user = await User.findOne({ phone }).select('+password');
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return res.json({ success: true, token, userId: user._id });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/users/register-social  (B2C registration)
// ─────────────────────────────────────────────────────────────
const registerSocial = async (req, res) => {
  try {
    const azureId = req.user.azureId || req.user.sub;
    const { name, email, phone } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'name is required' });
    }

    const user = await User.findOneAndUpdate(
      { azureId },
      { azureId, name, email, phone },
      { upsert: true, new: true }
    );

    return res.json({ success: true, user });
  } catch (err) {
    console.error('❌ registerSocial error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export default { register, login, getProfile, registerSocial };