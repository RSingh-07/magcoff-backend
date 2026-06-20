// src/routes/notificationRoutes.js
//
// NOTE: previously this file defined its route logic inline and read
// req.user.id directly in each handler. req.user.id was never set by
// authenticateToken.js (only .oid/.userId/.sub are), so every device-token
// write/read here was silently operating on userId: undefined. This has
// been fixed by routing through notificationController, which resolves the
// authenticated user the same way cartController/orderController do.
//
// The unregister handler also previously ignored whether a matching
// document existed before reporting success (Known Issue #8) — that is
// now surfaced via notificationService.unregisterToken.

import express from 'express';
import authenticateToken from '../middleware/authenticateToken.js';
import notificationController from '../controllers/notificationController.js';

const router = express.Router();

router.post('/register', authenticateToken, notificationController.register);
router.delete('/unregister', authenticateToken, notificationController.unregister);
router.get('/tokens', authenticateToken, notificationController.getTokens);

export default router;