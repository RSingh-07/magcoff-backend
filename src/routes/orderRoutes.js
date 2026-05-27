import { Router }           from 'express';
import orderController      from '../controllers/orderController.js';
import authenticateToken    from '../middleware/authenticateToken.js';

const router = Router();

// GET /orders/receipt/:orderId — public (receipt link sharing)
// All other order routes require authentication
router.get('/receipt/:orderId', orderController.getReceipt);

// Protected routes
router.get('/',   authenticateToken, orderController.getByUser);
router.post('/',  authenticateToken, orderController.placeOrder);

export default router;