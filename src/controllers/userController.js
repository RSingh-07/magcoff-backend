import userService from '../services/userService.js';

const getOid = (req) => req.user.oid || req.user.userId || req.user.sub;

const userController = {
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

      const { name, email, phone } = req.body;   // ← phone from body, not JWT
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
        phone: phone || '',   // ← was req.user.phone (always empty from JWT)
      });

      res.status(201).json({ success: true, data });
    } catch (err) {
      console.error('registerSocial error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  },
};

export default userController;