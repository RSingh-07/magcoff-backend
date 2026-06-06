import { Router } from 'express';
import userController from '../controllers/userController.js';
import authenticateToken from '../middleware/authenticateToken.js';  // ← add this

const router = Router();

// ── Public routes ──────────────────────────────────────────
router.post('/register', userController.register);
router.post('/login',    userController.login);

// ── Protected routes ───────────────────────────────────────
router.use(authenticateToken);   // everything below requires token

router.get('/profile',          userController.getProfile);
router.post('/register-social', userController.registerSocial);  // ← THIS was missing

export default router;