import { Router } from 'express';
import userController from '../controllers/userController.js';

const router = Router();

// NOTE (Known Issue #3 fix): authenticateToken used to be applied BOTH here
// AND at the mount point in index.js (app.use('/users', authenticateToken,
// userRoutes)). It is now applied once, at the mount point in index.js.
//
// NOTE (Known Issue #9 fix): the deprecated phone/password
// POST /register and POST /login routes have been removed. They were dead
// code — every current Flutter screen uses Azure AD B2C login followed by
// POST /users/register-social, not these legacy endpoints. If a
// phone/password auth flow is needed again in the future, it should be
// reintroduced deliberately rather than left half-wired and unused.

router.get('/profile',          userController.getProfile);
router.post('/register-social', userController.registerSocial);

export default router;