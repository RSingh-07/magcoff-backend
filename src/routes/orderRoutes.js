import { Router }      from 'express';
import orderController from '../controllers/orderController.js';

const router = Router();

// All routes in this router are mounted behind authenticateToken in index.js
// (see index.js — Known Issue #2 fix). The previously-public
// GET /receipt/:orderId route has been moved to its own separate,
// unprotected mount in index.js so it can actually be reached without a
// token, which was the original intent but was being defeated by the
// mount-level authenticateToken wrapping the whole orderRoutes router.

router.get('/',  orderController.getByUser);
router.post('/', orderController.placeOrder);

export default router;