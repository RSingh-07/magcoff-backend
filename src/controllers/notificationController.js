import notificationService from '../services/notificationService.js';

const getUserId = (req) => req.user.oid || req.user.userId || req.user.sub;

const notificationController = {
  // POST /api/notifications/register
  // Body: { token: string, platform: 'android' | 'ios' }
  async register(req, res) {
    try {
      const { token, platform } = req.body;

      if (!token || !platform) {
        return res.status(400).json({
          success: false,
          message: 'token and platform are required',
        });
      }

      await notificationService.registerToken(getUserId(req), token, platform);

      return res.json({ success: true, message: 'Device token registered' });
    } catch (err) {
      console.error('❌ Register token error:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // DELETE /api/notifications/unregister
  // Body: { token: string }
  async unregister(req, res) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ success: false, message: 'token is required' });
      }

      const { found } = await notificationService.unregisterToken(token);

      if (!found) {
        // Known Issue #8 fix: previously this always returned a generic
        // success message even when no matching token existed. We keep the
        // response idempotent (still 200, since "the token is not active"
        // is the desired end state either way) but now make that explicit.
        return res.json({
          success: true,
          message: 'No matching device token was found (already unregistered or never existed)',
        });
      }

      return res.json({ success: true, message: 'Device token unregistered' });
    } catch (err) {
      console.error('❌ Unregister token error:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // GET /api/notifications/tokens
  async getTokens(req, res) {
    try {
      const tokens = await notificationService.getTokensByOid(getUserId(req));
      return res.json({ success: true, tokens });
    } catch (err) {
      console.error('❌ Get tokens error:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },
};

export default notificationController;