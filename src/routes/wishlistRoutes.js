// src/routes/wishlistRoutes.js
//
// Collection: MagcoffDB → shopping_lists
//
// GET    /api/wishlist        — get all wishlist items for the logged-in user
// POST   /api/wishlist/add    — add a product to wishlist (idempotent)
// DELETE /api/wishlist/:id    — remove a wishlist document by its _id
//
// NOTE: previously this file defined the WishlistItem schema inline and read
// req.user.id directly in each handler. req.user.id was never set by
// authenticateToken.js (only .oid/.userId/.sub are), so every read/write here
// was silently operating on userId: undefined, pooling all users' wishlist
// data together. This has been fixed by routing through wishlistController,
// which resolves the authenticated user the same way cartController and
// orderController do.

import { Router } from 'express';
import wishlistController from '../controllers/wishlistController.js';
import authenticateToken from '../middleware/authenticateToken.js';

const router = Router();
router.use(authenticateToken);

router.get('/',     wishlistController.getAll);
router.post('/add', wishlistController.addItem);
router.delete('/:id', wishlistController.removeItem);

export default router;