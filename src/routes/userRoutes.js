import { Router } from 'express';
import userController from '../controllers/userController.js';
import authenticateToken from '../middleware/authenticateToken.js';

const router = Router();

// Public routes
router.post('/register', userController.register);
router.post('/login', userController.login);

// Protected routes
router.get(
  '/profile',
  authenticateToken,
  userController.getProfile
);

export default router;