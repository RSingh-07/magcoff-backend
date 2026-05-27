import userService from '../services/userService.js';
import User from '../models/User.js';

const userController = {

  // POST /users/register — DEPRECATED
  async register(req, res) {
    try {
      const { phone, name, email, password } = req.body;
      if (!phone || !name || !password) {
        return res.status(400).json({
          success: false,
          message: 'phone, name, and password are required',
        });
      }
      const data = await userService.register(phone, name, email, password);
      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  // POST /users/login — DEPRECATED
  async login(req, res) {
    try {
      const { phone, password } = req.body;
      if (!phone || !password) {
        return res.status(400).json({
          success: false,
          message: 'phone and password are required',
        });
      }
      const data = await userService.login(phone, password);
      res.json({ success: true, data });
    } catch (err) {
      res.status(401).json({ success: false, message: err.message });
    }
  },

  // GET /users/profile
  async getProfile(req, res) {
    try {
      const userId = req.user.oid || req.user.userId || req.user.sub;
      const data = await userService.getProfile(userId);
      res.json({ success: true, data });
    } catch (err) {
      res.status(404).json({ success: false, message: err.message });
    }
  },

  // POST /users/register-social
  async registerSocial(req, res) {
    try {
      const { name, email } = req.body;

      // Works for Entra (oid), dev bypass (userId), and B2C (sub)
      const azureId = req.user.oid || req.user.userId || req.user.sub;

      if (!azureId) {
        return res.status(401).json({
          success: false,
          message: 'Could not determine user identity from token',
        });
      }

      if (!name || !email) {
        return res.status(400).json({
          success: false,
          message: 'name and email are required',
        });
      }

      // Check if already registered
      let user = await User.findOne({ azureId });
      if (user) {
        return res.status(200).json({ success: true, data: user });
      }

      // Save to MongoDB
      user = await User.create({
        azureId,
        name,
        email,
        phone: req.user.phone || '',
      });

      res.status(201).json({ success: true, data: user });
    } catch (error) {
      console.error('registerSocial error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },
};

export default userController;