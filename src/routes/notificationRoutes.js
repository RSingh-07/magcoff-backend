// src/routes/notificationRoutes.js
import express from 'express';
import authenticateToken from '../middleware/authenticateToken.js';
import DeviceToken from '../models/deviceToken.js';

const router = express.Router();

// ── POST /api/notifications/register ─────────────────────────────────────────
// Called by Flutter when user enables notifications.
// Body: { token: string, platform: 'android' | 'ios' }
router.post('/register', authenticateToken, async (req, res) => {
  try {
    const { token, platform } = req.body;
    const userId = req.user.id;

    if (!token || !platform) {
      return res.status(400).json({
        success: false,
        message: 'token and platform are required',
      });
    }

    // Upsert — if token already exists update userId + enabled flag
    await DeviceToken.findOneAndUpdate(
      { token },
      {
        userId,
        platform,
        enabled: true,
        lastSeen: new Date(),
      },
      { upsert: true, new: true }
    );

    return res.json({ success: true, message: 'Device token registered' });
  } catch (err) {
    console.error('❌ Register token error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── DELETE /api/notifications/unregister ─────────────────────────────────────
// Called by Flutter when user disables notifications.
// Body: { token: string }
router.delete('/unregister', authenticateToken, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: 'token is required' });
    }

    await DeviceToken.findOneAndUpdate(
      { token },
      { enabled: false }
    );

    return res.json({ success: true, message: 'Device token unregistered' });
  } catch (err) {
    console.error('❌ Unregister token error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/notifications/tokens ────────────────────────────────────────────
// (Optional) Admin — list all active tokens for a user
router.get('/tokens', authenticateToken, async (req, res) => {
  try {
    const tokens = await DeviceToken.find({
      userId: req.user.id,
      enabled: true,
    }).select('token platform lastSeen');

    return res.json({ success: true, tokens });
  } catch (err) {
    console.error('❌ Get tokens error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;