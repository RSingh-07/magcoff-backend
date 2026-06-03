import userService from '../services/userService.js';

const getOid = (req) => req.user.oid || req.user.userId || req.user.sub;

const userController = {
  // ── Deprecated ─────────────────────────────────────────────────────────────
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

  // ── GET /users/profile ──────────────────────────────────────────────────────
  async getProfile(req, res) {
    try {
      const data = await userService.getProfile(getOid(req));
      res.json({ success: true, data });
    } catch (err) {
      const status = err.message.includes('No user found') ? 404 : 500;
      res.status(status).json({ success: false, message: err.message });
    }
  },

  // ── POST /users/register-social ─────────────────────────────────────────────
  async registerSocial(req, res) {
    try {
      const azureId = getOid(req);
      if (!azureId) {
        return res.status(401).json({
          success: false,
          message: 'Could not determine user identity from token',
        });
      }

      const { name, email } = req.body;
      if (!name || !email) {
        return res.status(400).json({
          success: false,
          message: 'name and email are required',
        });
      }

      const data = await userService.registerOrGetSocial({
        azureId,
        name,
        email,
        phone: req.user.phone || '',
      });

      res.status(201).json({ success: true, data });
    } catch (err) {
      console.error('registerSocial error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  },
};

export default userController;