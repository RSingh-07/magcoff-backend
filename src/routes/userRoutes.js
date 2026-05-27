import { Router }           from 'express';
import userController       from '../controllers/userController.js';
import authenticateToken    from '../middleware/authenticateToken.js';

const router = Router();

// ── Deprecated routes — kept for reference, not used after B2C migration ─────
// These will be removed once Flutter login screen is built with B2C
router.post('/register', userController.register);
router.post('/login',    userController.login);

// ── Protected routes ──────────────────────────────────────────────────────────
// GET /users/profile  (was: GET /users/:userId/profile)
// userId now comes from verified token — no longer in the URL
router.get('/profile', authenticateToken, userController.getProfile);

// ── Social / B2C Registration ─────────────────────────────────────────────────
router.post('/register-social', authenticateToken, userController.registerSocial);

export default router;