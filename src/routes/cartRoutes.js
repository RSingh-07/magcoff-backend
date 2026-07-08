import { Router }     from 'express';
import cartController from '../controllers/cartController.js';

const router = Router();

// NOTE (Known Issue #3 fix): authenticateToken used to be applied BOTH here
// AND at the mount point in index.js (app.use('/cart', authenticateToken,
// cartRoutes)). That was harmless but redundant — the middleware ran twice
// on every request. It is now applied once, at the mount point in index.js.
//
// userId is still NEVER taken from the client — it comes exclusively from
// req.user, injected by authenticateToken before any of these handlers run.

router.get('/',                  cartController.getCart);
router.post('/add',              cartController.addItem);
router.post('/remove',           cartController.removeItem);
router.post('/update-quantity',  cartController.updateQuantity);
router.post('/apply-coupon',     cartController.applyCoupon);
router.post('/negotiate',        cartController.negotiate);
router.post('/link',             cartController.linkCart);
router.post('/unlink',           cartController.unlinkCart);

export default router;