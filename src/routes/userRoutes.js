import { Router } from 'express';
import userController from '../controllers/userController.js';

const router = Router();

router.post('/register', userController.register);
router.post('/login', userController.login);

router.get('/profile', userController.getProfile);

export default router;