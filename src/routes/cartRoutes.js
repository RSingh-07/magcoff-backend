import { Router }           from 'express';
import cartController       from '../controllers/cartController.js';
import authenticateToken    from '../middleware/authenticateToken.js';

const router = Router();

// All cart routes require a verified identity.
// userId is NEVER taken from the client after this point —
// it comes exclusively from req.user injected by authenticateToken.
router.use(authenticateToken);

router.get('/',                  cartController.getCart);
router.post('/add',              cartController.addItem);
router.post('/remove',           cartController.removeItem);
router.post('/update-quantity',  cartController.updateQuantity);
router.post('/apply-coupon',     cartController.applyCoupon);
router.post('/negotiate', cartController.negotiate);

export default router;